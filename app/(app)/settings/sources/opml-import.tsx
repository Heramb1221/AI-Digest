"use client";
// app/(app)/settings/sources/opml-import.tsx
// Polished OPML import widget — supports file picker and drag-and-drop.
// Shows a preview of how many feeds were found before importing.
// Used in the Sources settings page.

import { useState, useRef, useCallback } from "react";
import { Upload, FileText, Check, AlertCircle, Loader2, X } from "lucide-react";
import { Button }   from "@/components/ui/button";
import { useToast } from "@/components/ui/toaster";
import { cn }       from "@/lib/utils";

interface OPMLResult {
  total:     number;
  added:     number;
  skipped:   number;
  limited:   boolean;
  planLimit: number;
}

interface OPMLImportProps {
  onImported: () => void;  // called after successful import so parent can reload
}

export function OPMLImport({ onImported }: OPMLImportProps) {
  const { toast }             = useToast();
  const fileInputRef          = useRef<HTMLInputElement>(null);
  const [dragging, setDragging]   = useState(false);
  const [file,     setFile]       = useState<File | null>(null);
  const [preview,  setPreview]    = useState<{ feedCount: number } | null>(null);
  const [result,   setResult]     = useState<OPMLResult | null>(null);
  const [loading,  setLoading]    = useState(false);
  const [error,    setError]      = useState<string | null>(null);

  // ── File parsing for preview ───────────────────────────────────────────────
  async function readFile(f: File) {
    setFile(f);
    setResult(null);
    setError(null);

    const text = await f.text();
    // Quick client-side count of xmlUrl attributes
    const matches = text.match(/xmlUrl=/gi);
    setPreview({ feedCount: matches?.length ?? 0 });
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) readFile(f);
    e.target.value = ""; // reset so same file can be re-picked
  }

  // ── Drag and drop ─────────────────────────────────────────────────────────
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f && (f.name.endsWith(".opml") || f.name.endsWith(".xml"))) {
      readFile(f);
    } else {
      setError("Please drop an OPML or XML file.");
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Import ────────────────────────────────────────────────────────────────
  async function handleImport() {
    if (!file) return;
    setLoading(true);
    setError(null);

    const text = await file.text();
    const res  = await fetch("/api/sources/opml", {
      method:  "POST",
      headers: { "Content-Type": "text/xml" },
      body:    text,
    });
    setLoading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Import failed.");
      return;
    }

    const data: OPMLResult = await res.json();
    setResult(data);
    setFile(null);
    setPreview(null);

    toast({
      title:       `Imported ${data.added} feed${data.added !== 1 ? "s" : ""}.`,
      description: data.limited
        ? `${data.skipped} skipped — source limit reached.`
        : data.skipped > 0
          ? `${data.skipped} already existed.`
          : undefined,
      type: "success",
    });

    onImported();
  }

  function handleClear() {
    setFile(null);
    setPreview(null);
    setResult(null);
    setError(null);
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Drop zone */}
      {!file && !result && (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={cn(
            "border-2 border-dashed rounded-xl p-6 flex flex-col items-center gap-3",
            "cursor-pointer transition-colors select-none",
            dragging
              ? "border-accent bg-accent-subtle"
              : "border-border hover:border-ink-faint hover:bg-paper-sunken"
          )}
        >
          <div className={cn(
            "h-10 w-10 rounded-full flex items-center justify-center transition-colors",
            dragging ? "bg-accent text-white" : "bg-paper-sunken text-ink-faint"
          )}>
            <Upload size={18} />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium">
              {dragging ? "Drop your OPML file" : "Import OPML file"}
            </p>
            <p className="text-xs text-ink-faint mt-0.5">
              Drag & drop or click · .opml or .xml · from Feedly, NewsBlur, Reeder, etc.
            </p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".opml,.xml"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>
      )}

      {/* File preview */}
      {file && preview && !loading && (
        <div className="border border-border rounded-xl p-4 bg-paper-raised flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
            <FileText size={16} className="text-blue-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{file.name}</p>
            <p className="text-xs text-ink-muted">
              {preview.feedCount} feed{preview.feedCount !== 1 ? "s" : ""} found
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleClear}
              className="text-ink-faint hover:text-ink transition-colors"
            >
              <X size={14} />
            </button>
            <Button size="sm" loading={loading} onClick={handleImport}>
              Import
            </Button>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="border border-border rounded-xl p-4 bg-paper-raised flex items-center gap-3">
          <Loader2 size={16} className="animate-spin text-accent shrink-0" />
          <p className="text-sm text-ink-muted">Importing feeds…</p>
        </div>
      )}

      {/* Success result */}
      {result && (
        <div className="border border-green-200 rounded-xl p-4 bg-green-50 flex items-start gap-3">
          <Check size={16} className="text-green-500 mt-0.5 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-green-800">
              Import complete — {result.added} feed{result.added !== 1 ? "s" : ""} added
            </p>
            {(result.skipped > 0 || result.limited) && (
              <p className="text-xs text-green-700 mt-0.5">
                {result.skipped} skipped (duplicates
                {result.limited ? " or plan limit reached" : ""})
                {result.limited && ` · limit is ${result.planLimit} sources`}
              </p>
            )}
          </div>
          <button
            onClick={handleClear}
            className="text-green-400 hover:text-green-600 transition-colors shrink-0"
          >
            <X size={13} />
          </button>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="border border-red-200 rounded-xl p-4 bg-red-50 flex items-start gap-3">
          <AlertCircle size={16} className="text-red-500 mt-0.5 shrink-0" />
          <p className="text-sm text-red-700">{error}</p>
          <button
            onClick={() => setError(null)}
            className="text-red-400 hover:text-red-600 ml-auto shrink-0"
          >
            <X size={13} />
          </button>
        </div>
      )}
    </div>
  );
}
