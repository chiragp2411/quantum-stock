"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import api from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, FileText, X, Loader2, CheckCircle2, CloudUpload } from "lucide-react";
import { toast } from "sonner";

interface PdfDropzoneProps {
  symbol: string;
  onUploadComplete: () => void;
}

interface FileState {
  file: File;
  status: "pending" | "uploading" | "done" | "error";
}

export function PdfDropzone({ symbol, onUploadComplete }: PdfDropzoneProps) {
  const [files, setFiles] = useState<FileState[]>([]);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);

  const onDrop = useCallback(
    (accepted: File[]) => {
      const total = files.length + accepted.length;
      if (total > 8) {
        toast.error("Maximum 8 PDF files allowed");
        return;
      }
      const newFiles = accepted
        .filter((f) => f.type === "application/pdf")
        .map((f) => ({ file: f, status: "pending" as const }));
      if (newFiles.length < accepted.length) {
        toast.error("Only PDF files are accepted");
      }
      setFiles((prev) => [...prev, ...newFiles]);
    },
    [files.length]
  );

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUploadAndAnalyze = async () => {
    if (files.length === 0) return;

    setUploading(true);
    const formData = new FormData();
    files.forEach((f) => formData.append("files", f.file));

    try {
      setFiles((prev) => prev.map((f) => ({ ...f, status: "uploading" })));
      await api.post(
        `/api/concalls/${encodeURIComponent(symbol)}/upload`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );
      setFiles((prev) => prev.map((f) => ({ ...f, status: "done" })));
      toast.success("PDFs uploaded successfully!");

      setAnalyzing(true);
      toast.info("Analyzing transcripts with AI... This may take a minute.");
      await api.post(`/api/concalls/${encodeURIComponent(symbol)}/analyze`);
      toast.success("Analysis complete!");
      onUploadComplete();
      setFiles([]);
    } catch {
      setFiles((prev) => prev.map((f) => ({ ...f, status: "error" })));
      toast.error("Upload or analysis failed. Please try again.");
    } finally {
      setUploading(false);
      setAnalyzing(false);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "application/pdf": [".pdf"] },
    maxFiles: 8,
    disabled: uploading || analyzing,
  });

  const isProcessing = uploading || analyzing;

  return (
    <div className="space-y-3">
      <div
        {...getRootProps()}
        className={`cursor-pointer rounded-xl border-2 border-dashed transition-all duration-200 ${
          isDragActive
            ? "border-emerald-500 bg-emerald-500/5 scale-[1.01]"
            : "border-border/50 hover:border-emerald-500/30 hover:bg-muted/20"
        } ${isProcessing ? "opacity-50 pointer-events-none" : ""}`}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center justify-center py-10">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted/50 mb-3">
            <CloudUpload className={`h-6 w-6 ${isDragActive ? "text-emerald-500" : "text-muted-foreground/60"}`} />
          </div>
          <p className="text-sm font-medium">
            {isDragActive ? "Drop PDF transcripts here..." : "Drop con-call PDFs here, or click to browse"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground/60">
            Upload 1 to 8 quarterly earnings call transcripts (.pdf)
          </p>
        </div>
      </div>

      {files.length > 0 && (
        <div className="space-y-2">
          <div className="rounded-xl border border-border/40 divide-y divide-border/30 overflow-hidden">
            {files.map((f, i) => (
              <div key={i} className="flex items-center justify-between px-4 py-3 bg-card">
                <div className="flex items-center gap-3 min-w-0">
                  <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-sm truncate">{f.file.name}</span>
                  <span className="text-[10px] text-muted-foreground/60 shrink-0">
                    {(f.file.size / 1024 / 1024).toFixed(1)} MB
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {f.status === "uploading" && <Loader2 className="h-4 w-4 animate-spin text-blue-400" />}
                  {f.status === "done" && <CheckCircle2 className="h-4 w-4 text-emerald-400" />}
                  {f.status === "pending" && (
                    <button onClick={() => removeFile(i)} className="p-0.5 rounded hover:bg-muted transition-colors">
                      <X className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <Button
            onClick={handleUploadAndAnalyze}
            className="w-full h-11 bg-emerald-600 hover:bg-emerald-500 text-white font-medium"
            disabled={isProcessing}
          >
            {analyzing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Analyzing with AI...
              </>
            ) : uploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Upload &amp; Analyze ({files.length} file{files.length > 1 ? "s" : ""})
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
