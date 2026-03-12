"""Extract text from con-call PDF transcripts using pdfplumber."""

import logging
from io import BytesIO

import pdfplumber

logger = logging.getLogger(__name__)


def extract_text_from_pdf(pdf_bytes: bytes) -> str:
    """Extract all text from a PDF file.

    Args:
        pdf_bytes: Raw bytes of the PDF file.

    Returns:
        Concatenated text from all pages.
        Returns partial text with warning if some pages fail.
    """
    pages_text: list[str] = []
    try:
        with pdfplumber.open(BytesIO(pdf_bytes)) as pdf:
            for i, page in enumerate(pdf.pages):
                try:
                    text = page.extract_text()
                    if text:
                        pages_text.append(text)
                except Exception:
                    logger.warning("Failed to extract text from page %d", i + 1)
                    pages_text.append(f"[Page {i + 1}: extraction failed]")
    except Exception:
        logger.exception("Failed to open PDF")
        return ""

    return "\n\n".join(pages_text)


def chunk_text(text: str, chunk_size: int = 8000) -> list[str]:
    """Split text into chunks of approximately chunk_size characters.

    Tries to split on paragraph boundaries for cleaner chunks.
    """
    if len(text) <= chunk_size:
        return [text]

    chunks: list[str] = []
    paragraphs = text.split("\n\n")
    current_chunk = ""

    for para in paragraphs:
        if len(current_chunk) + len(para) + 2 > chunk_size and current_chunk:
            chunks.append(current_chunk.strip())
            current_chunk = para
        else:
            current_chunk += "\n\n" + para if current_chunk else para

    if current_chunk.strip():
        chunks.append(current_chunk.strip())

    return chunks
