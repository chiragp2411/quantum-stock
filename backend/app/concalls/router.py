"""Con-call endpoints: upload, analyze (sequential background), tracker, delete, override."""

import logging
import queue
import threading
from datetime import datetime, timezone
from typing import Optional
import re

from bson import ObjectId
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status

from app.auth.utils import get_current_user
from app.config import settings
from app.database import ai_analytics_col, concalls_col, financials_col, get_gridfs
from app.concalls.models import ConCallAnalysis, GuidanceRow, ManualOverride
from app.concalls.pdf_parser import extract_text_from_pdf
from app.concalls.llm_analyzer import analyze_concall, guess_quarter

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/concalls", tags=["concalls"])

MAX_FILES = 8

_analysis_queue: queue.Queue = queue.Queue()
_worker_thread: Optional[threading.Thread] = None
_worker_lock = threading.Lock()


def _doc_to_dict(doc: dict) -> dict:
    doc["_id"] = str(doc["_id"])
    if "pdf_file_id" in doc:
        doc["pdf_file_id"] = str(doc["pdf_file_id"])
    return doc


def _get_prev_analysis_json(symbol: str, current_doc_id: ObjectId) -> Optional[str]:
    """Get previous 2 quarters' analysis JSON for cross-quarter comparison.

    Sends structured_guidance when available so Gemini can compute revisions.
    """
    import json

    col = concalls_col()
    prev_docs = list(
        col.find({
            "stock_symbol": symbol,
            "status": "completed",
            "analysis": {"$ne": None},
            "_id": {"$ne": current_doc_id},
        })
        .sort("uploaded_at", -1)
        .limit(2)
    )

    if not prev_docs:
        return None

    quarters: list[dict] = []
    for doc in prev_docs:
        prev = doc.get("analysis", {})
        if not prev:
            continue
        subset: dict = {
            "quarter": prev.get("quarter"),
            "guidance": prev.get("guidance", {}),
            "tone_score": prev.get("tone_score"),
            "highlights": prev.get("highlights", [])[:5],
            "guidance_trajectory": prev.get("guidance_trajectory"),
            "investment_thesis": prev.get("investment_thesis", []),
        }
        sg = prev.get("structured_guidance")
        if sg:
            subset["structured_guidance"] = [
                {k: item.get(k) for k in (
                    "metric", "metric_label", "period", "value_text",
                    "value_low", "value_high", "unit", "guidance_type",
                    "revision", "segment",
                )}
                for item in (sg if isinstance(sg, list) else [])
            ]
        quarters.append(subset)

    if not quarters:
        return None

    return json.dumps(quarters, default=str)


def _analyze_single_concall(doc_id: ObjectId, symbol: str) -> None:
    """Analyze a single concall. Updates DB status through lifecycle."""
    col = concalls_col()
    doc = col.find_one({"_id": doc_id})
    if not doc:
        return

    col.update_one(
        {"_id": doc_id},
        {"$set": {"status": "analyzing", "analysis_started_at": datetime.now(timezone.utc)}},
    )

    try:
        provider = settings.analysis_provider.lower()
        usage_meta: dict | None = None

        if provider == "gemini" and settings.gemini_api_key:
            from app.concalls.gemini_analyzer import analyze_concall_gemini

            prev_json = _get_prev_analysis_json(symbol, doc_id)
            analysis, usage_meta = analyze_concall_gemini(
                text=doc["raw_text"],
                quarter_hint=doc.get("quarter", ""),
                prev_analysis_json=prev_json,
                symbol=symbol,
            )
        else:
            analysis = analyze_concall(
                doc["raw_text"], quarter_hint=doc.get("quarter", "")
            )

        analysis_dict = analysis.model_dump()
        new_status = "failed" if analysis.error else "completed"

        col.update_one(
            {"_id": doc_id},
            {
                "$set": {
                    "analysis": analysis_dict,
                    "quarter": analysis.quarter,
                    "status": new_status,
                    "analyzed_at": datetime.now(timezone.utc),
                }
            },
        )
        logger.info("Concall %s: %s (quarter=%s, provider=%s)", doc_id, new_status, analysis.quarter, provider)

        if usage_meta:
            try:
                ai_analytics_col().insert_one({
                    "event": "concall_analysis",
                    "symbol": symbol,
                    "concall_id": str(doc_id),
                    "quarter": analysis.quarter,
                    "status": new_status,
                    "pdf_filename": doc.get("pdf_filename", ""),
                    "uploaded_by": doc.get("uploaded_by", ""),
                    **usage_meta,
                    "created_at": datetime.now(timezone.utc),
                })
            except Exception:
                logger.warning("Failed to save AI analytics for concall %s", doc_id)
    except Exception as exc:
        logger.exception("Analysis failed for concall %s", doc_id)
        col.update_one(
            {"_id": doc_id},
            {
                "$set": {
                    "status": "failed",
                    "analysis": ConCallAnalysis(
                        quarter=doc.get("quarter", "Unknown"),
                        error=f"Analysis error: {type(exc).__name__}: {exc}",
                    ).model_dump(),
                    "analyzed_at": datetime.now(timezone.utc),
                }
            },
        )


def _analysis_worker():
    """Worker that processes concalls one at a time from the queue."""
    while True:
        try:
            doc_id, symbol = _analysis_queue.get(timeout=10)
        except queue.Empty:
            logger.info("Analysis worker idle, exiting")
            break
        try:
            _analyze_single_concall(doc_id, symbol)
        except Exception:
            logger.exception("Worker error for %s", doc_id)
        finally:
            _analysis_queue.task_done()


def _ensure_worker():
    """Start the sequential analysis worker if not already running."""
    global _worker_thread
    with _worker_lock:
        if _worker_thread is None or not _worker_thread.is_alive():
            _worker_thread = threading.Thread(target=_analysis_worker, daemon=True)
            _worker_thread.start()
            logger.info("Analysis worker started")


@router.post("/{symbol}/upload")
async def upload_concall_pdfs(
    symbol: str,
    files: list[UploadFile] = File(...),
    _user: dict = Depends(get_current_user),
):
    """Upload 1-8 con-call PDF transcripts. Stores in GridFS, extracts text."""
    if len(files) > MAX_FILES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Maximum {MAX_FILES} files allowed per upload",
        )

    symbol = symbol.upper()
    fs = get_gridfs()
    col = concalls_col()
    results = []

    for f in files:
        if not f.filename or not f.filename.lower().endswith(".pdf"):
            results.append({"filename": f.filename, "error": "Not a PDF file"})
            continue

        try:
            content = await f.read()
            file_id = fs.put(content, filename=f.filename, content_type="application/pdf")
            raw_text = extract_text_from_pdf(content)

            if not raw_text.strip():
                results.append({"filename": f.filename, "error": "Could not extract text from PDF"})
                continue

            quarter_guess = guess_quarter(f.filename)
            doc = {
                "stock_symbol": symbol,
                "quarter": quarter_guess,
                "pdf_file_id": file_id,
                "pdf_filename": f.filename,
                "raw_text": raw_text,
                "analysis": None,
                "status": "pending",
                "uploaded_at": datetime.now(timezone.utc),
                "uploaded_by": _user["username"],
            }
            insert_result = col.insert_one(doc)
            results.append({
                "id": str(insert_result.inserted_id),
                "filename": f.filename,
                "quarter": quarter_guess,
                "text_length": len(raw_text),
                "status": "uploaded",
            })
        except Exception:
            logger.exception("Failed to process file %s", f.filename)
            results.append({"filename": f.filename, "error": "Processing failed"})

    return {"symbol": symbol, "uploads": results}


@router.post("/{symbol}/analyze")
def analyze_concalls(
    symbol: str,
    concall_ids: Optional[list[str]] = None,
    _user: dict = Depends(get_current_user),
):
    """Queue pending con-calls for sequential background analysis."""
    symbol = symbol.upper()
    col = concalls_col()

    if concall_ids:
        query = {
            "stock_symbol": symbol,
            "_id": {"$in": [ObjectId(cid) for cid in concall_ids]},
        }
    else:
        query = {"stock_symbol": symbol, "analysis": None}

    docs = list(col.find(query))
    if not docs:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No con-calls to analyze",
        )

    started = []
    for doc in docs:
        col.update_one({"_id": doc["_id"]}, {"$set": {"status": "queued"}})
        _analysis_queue.put((doc["_id"], symbol))
        started.append({
            "id": str(doc["_id"]),
            "status": "queued",
            "filename": doc.get("pdf_filename", ""),
        })

    _ensure_worker()
    return {"symbol": symbol, "queued": len(started), "concalls": started}


@router.post("/{symbol}/reanalyze/{concall_id}")
def reanalyze_concall(
    symbol: str,
    concall_id: str,
    _user: dict = Depends(get_current_user),
):
    """Re-run analysis on a specific con-call."""
    symbol = symbol.upper()
    col = concalls_col()
    doc = col.find_one({"_id": ObjectId(concall_id), "stock_symbol": symbol})

    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Con-call not found",
        )

    col.update_one(
        {"_id": doc["_id"]},
        {"$set": {"status": "queued", "analysis": None}},
    )
    _analysis_queue.put((doc["_id"], symbol))
    _ensure_worker()

    return {"id": str(doc["_id"]), "status": "queued"}


@router.delete("/{symbol}/clear")
def clear_concalls(
    symbol: str,
    filter_status: Optional[str] = None,
    _user: dict = Depends(get_current_user),
):
    """Delete concalls by status. Using /clear path to avoid route conflicts."""
    symbol = symbol.upper()
    col = concalls_col()
    fs = get_gridfs()

    if filter_status == "failed":
        query = {"stock_symbol": symbol, "$or": [
            {"status": "failed"},
            {"analysis.error": {"$ne": None}},
        ]}
    elif filter_status == "pending":
        query = {"stock_symbol": symbol, "$or": [
            {"status": {"$in": ["pending", "queued"]}},
            {"status": {"$exists": False}, "analysis": None},
        ]}
    elif filter_status == "all":
        query = {"stock_symbol": symbol}
    else:
        query = {"stock_symbol": symbol}

    docs = list(col.find(query))
    for doc in docs:
        if doc.get("pdf_file_id"):
            try:
                fs.delete(doc["pdf_file_id"])
            except Exception:
                pass
    result = col.delete_many(query)
    return {"status": "deleted", "count": result.deleted_count}


@router.delete("/{symbol}/{concall_id}")
def delete_concall(
    symbol: str,
    concall_id: str,
    _user: dict = Depends(get_current_user),
):
    """Delete a single con-call and its PDF from GridFS."""
    symbol = symbol.upper()
    col = concalls_col()
    doc = col.find_one({"_id": ObjectId(concall_id), "stock_symbol": symbol})
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Con-call not found",
        )

    if doc.get("pdf_file_id"):
        try:
            get_gridfs().delete(doc["pdf_file_id"])
        except Exception:
            logger.warning("Could not delete GridFS file %s", doc.get("pdf_file_id"))

    col.delete_one({"_id": doc["_id"]})
    return {"status": "deleted", "id": concall_id}


@router.get("/{symbol}")
def list_concalls(symbol: str):
    """List all con-calls for a stock, ordered by quarter. Public endpoint."""
    symbol = symbol.upper()
    docs = concalls_col().find({"stock_symbol": symbol}).sort("uploaded_at", 1)
    return [_doc_to_dict(d) for d in docs]


@router.get("/{symbol}/tracker")
def guidance_tracker(symbol: str):
    """Build the guidance tracker: prev guidance vs actuals for each quarter."""
    symbol = symbol.upper()
    concalls = list(
        concalls_col()
        .find({
            "stock_symbol": symbol,
            "analysis": {"$ne": None},
            "$or": [
                {"status": "completed"},
                {"status": {"$exists": False}},
            ],
        })
        .sort("uploaded_at", 1)
    )

    concalls = [c for c in concalls if c.get("analysis") and not c["analysis"].get("error")]

    if not concalls:
        return {"symbol": symbol, "tracker": []}

    financials = {
        f["period"]: f
        for f in financials_col().find({"stock_symbol": symbol})
    }

    rows: list[dict] = []
    for i, cc in enumerate(concalls):
        analysis = cc.get("analysis", {})
        quarter = analysis.get("quarter", cc.get("quarter", f"Q{i+1}"))

        prev_guidance = {}
        prev_structured: list[dict] = []
        if i > 0:
            prev_analysis = concalls[i - 1].get("analysis", {})
            prev_guidance = prev_analysis.get("guidance", {})
            prev_structured = prev_analysis.get("structured_guidance", [])

        actuals = financials.get(quarter, {})
        actual_data = {}
        if actuals:
            if actuals.get("revenue"):
                actual_data["revenue"] = str(actuals["revenue"])
            if actuals.get("pat"):
                actual_data["pat"] = str(actuals["pat"])
            if actuals.get("margin"):
                actual_data["margin"] = str(actuals["margin"])

        met_missed = _evaluate_guidance(prev_guidance, actual_data)
        trajectory = _determine_trajectory(rows, analysis)
        current_tone = analysis.get("tone_score", 5)

        gemini_contradictions = analysis.get("contradictions", [])
        gemini_trajectory = analysis.get("guidance_trajectory")
        surprise = analysis.get("guidance_trajectory_detail", "")

        if gemini_trajectory:
            trajectory = gemini_trajectory

        current_structured = analysis.get("structured_guidance", [])

        rows.append(
            GuidanceRow(
                period=quarter,
                tone_score=current_tone,
                prev_guidance=prev_guidance,
                actuals=actual_data,
                met_missed=met_missed,
                new_guidance=analysis.get("guidance", {}),
                trajectory=trajectory,
                surprise=surprise if surprise else None,
                contradictions=gemini_contradictions,
                structured_new_guidance=current_structured,
                structured_prev_guidance=prev_structured,
            ).model_dump()
        )

    credibility = _calc_credibility(rows)
    financials_ts = _build_financial_timeseries(concalls)

    return {
        "symbol": symbol,
        "tracker": rows,
        "credibility": credibility,
        "financial_timeseries": financials_ts,
    }


@router.put("/{symbol}/{concall_id}/override")
def manual_override(
    symbol: str,
    concall_id: str,
    override: ManualOverride,
    _user: dict = Depends(get_current_user),
):
    """Manually override actuals for a quarter."""
    symbol = symbol.upper()
    cc = concalls_col().find_one({"_id": ObjectId(concall_id), "stock_symbol": symbol})
    if not cc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Con-call not found",
        )

    quarter = cc.get("quarter", "")
    update_data = {k: v for k, v in override.model_dump().items() if v is not None}
    update_data["stock_symbol"] = symbol
    update_data["period"] = quarter
    update_data["source"] = "manual"

    financials_col().update_one(
        {"stock_symbol": symbol, "period": quarter},
        {"$set": update_data},
        upsert=True,
    )

    return {"status": "updated", "quarter": quarter, "overrides": update_data}


def _evaluate_guidance(prev_guidance: dict, actuals: dict) -> str:
    if not prev_guidance or not actuals:
        return "pending"

    met_count = 0
    missed_count = 0
    total = 0

    for key, guidance_val in prev_guidance.items():
        actual_val = actuals.get(key)
        if not actual_val:
            continue

        total += 1
        guidance_nums = re.findall(r"[\d.]+", str(guidance_val))
        actual_nums = re.findall(r"[\d.]+", str(actual_val))

        if guidance_nums and actual_nums:
            try:
                guidance_target = float(guidance_nums[-1])
                actual_num = float(actual_nums[0])
                if actual_num >= guidance_target * 0.95:
                    met_count += 1
                else:
                    missed_count += 1
            except (ValueError, IndexError):
                met_count += 1
        else:
            met_count += 1

    if total == 0:
        return "pending"
    if missed_count > met_count:
        return "missed"
    if missed_count > 0:
        return "partial"
    return "met"


def _determine_trajectory(prev_rows: list[dict], current_analysis: dict) -> str:
    if not prev_rows:
        return "flat"

    current_tone = current_analysis.get("tone_score", 5)
    prev_tone = prev_rows[-1].get("tone_score", 5)

    if current_tone > prev_tone:
        return "up"
    elif current_tone < prev_tone:
        return "down"
    return "flat"


def _calc_credibility(rows: list[dict]) -> dict:
    """Calculate management credibility from guidance hit-rate."""
    total = 0
    met = 0
    for row in rows:
        status = row.get("met_missed", "pending")
        if status in ("met", "missed", "partial"):
            total += 1
            if status == "met":
                met += 1
            elif status == "partial":
                met += 0.5

    pct = round((met / total) * 100) if total > 0 else None
    return {
        "hit_rate_pct": pct,
        "quarters_tracked": total,
        "quarters_met": int(met),
    }


def _build_financial_timeseries(concalls: list[dict]) -> list[dict]:
    """Extract quarter-over-quarter financial KPIs from analyzed concalls."""
    ts = []
    for cc in concalls:
        analysis = cc.get("analysis", {})
        if not analysis:
            continue
        quarter = analysis.get("quarter", cc.get("quarter", ""))
        entry: dict = {"quarter": quarter}
        for field in (
            "revenue_cr", "ebitda_cr", "pat_cr",
            "ebitda_margin_pct", "pat_margin_pct",
            "revenue_growth_yoy_pct", "pat_growth_yoy_pct",
            "tone_score", "management_execution_score",
        ):
            val = analysis.get(field)
            if val is not None:
                entry[field] = val
        ts.append(entry)
    return ts
