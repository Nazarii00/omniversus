"use client";

import { type ReactNode, useState, useTransition } from "react";
import { importCharacterBatchAction } from "../actions/characterImportActions";
import type { BatchImportResult } from "../logic/characterImportCore";

export function CharacterImportConsole() {
  const [jsonText, setJsonText] = useState("");
  const [result, setResult] = useState<BatchImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleImport = () => {
    if (!jsonText.trim()) {
      setError("Please paste valid JSON");
      return;
    }

    setError(null);
    setResult(null);

    const formData = new FormData();
    formData.set("json", jsonText);

    startTransition(async () => {
      try {
        const res = await importCharacterBatchAction(formData);
        setResult(res);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      }
    });
  };

  return (
    <div style={{ marginBottom: "2rem" }}>
      <h3 style={{ marginBottom: "0.5rem" }}>
        📥 Character Import — Paste JSON
      </h3>
      <textarea
        rows={16}
        style={{
          width: "100%",
          fontFamily: "monospace",
          fontSize: "0.85rem",
          padding: "0.75rem",
          borderRadius: "6px",
          border: "1px solid #334155",
          background: "#0f172a",
          color: "#e2e8f0",
        }}
        placeholder={`Paste a JSON array of character imports...
Example:
[
  {
    "subject": {
      "slug": "batman",
      "displayName": "Batman",
      "canonicalName": "Bruce Wayne",
      "kind": "INDIVIDUAL",
      "originMedium": "COMIC",
      "originName": "DC Comics",
      "summary": "The Dark Knight..."
    },
    "version": {
      "slug": "post-crisis",
      "label": "Post-Crisis",
      "canonScope": "MAIN_CANON",
      ...
    },
    "aliases": ["Dark Knight", "Caped Crusader"],
    "capabilities": [...]
  }
]`}
        value={jsonText}
        onChange={(e) => setJsonText(e.target.value)}
      />
      <div style={{ marginTop: "0.75rem", display: "flex", gap: "0.5rem" }}>
        <button
          type="button"
          onClick={handleImport}
          disabled={isPending}
          style={{
            padding: "0.5rem 1.25rem",
            background: isPending ? "#475569" : "#3b82f6",
            color: "white",
            border: "none",
            borderRadius: "6px",
            cursor: isPending ? "not-allowed" : "pointer",
            fontWeight: 600,
          }}
        >
          {isPending ? "Importing..." : "🚀 Import Characters"}
        </button>
        <button
          type="button"
          onClick={() => {
            setJsonText("");
            setResult(null);
            setError(null);
          }}
          style={{
            padding: "0.5rem 1.25rem",
            background: "#334155",
            color: "white",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
          }}
        >
          Clear
        </button>
      </div>

      {error && (
        <div
          style={{
            marginTop: "0.75rem",
            padding: "0.75rem",
            background: "#7f1d1d",
            color: "#fca5a5",
            borderRadius: "6px",
            fontFamily: "monospace",
            fontSize: "0.85rem",
          }}
        >
          ❌ {error}
        </div>
      )}

      {result && (
        <div
          style={{
            marginTop: "0.75rem",
            padding: "0.75rem",
            background: "#064e3b",
            color: "#6ee7b7",
            borderRadius: "6px",
            fontFamily: "monospace",
            fontSize: "0.85rem",
            whiteSpace: "pre-wrap",
          }}
        >
          ✅ Import complete:
          {JSON.stringify(result, null, 2)}
        </div>
      )}
    </div>
  );
}
