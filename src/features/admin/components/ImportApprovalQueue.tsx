"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface ApprovalItem {
  id: string;
  suggestedSubjectSlug: string;
  suggestedVersionSlug: string | null;
  status: string;
  createdAt: string;
}

export function ImportApprovalQueue({ items }: { items: ApprovalItem[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  const handleApprove = async (id: string) => {
    setLoading(id);
    try {
      const formData = new FormData();
      formData.set("action", "approve");
      formData.set("suggestionId", id);
      const res = await fetch("/api/admin/import-character", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("Approve failed");
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Approve failed");
    } finally {
      setLoading(null);
    }
  };

  const handleReject = async (id: string) => {
    setLoading(id);
    try {
      const formData = new FormData();
      formData.set("action", "reject");
      formData.set("suggestionId", id);
      const res = await fetch("/api/admin/import-character", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("Reject failed");
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Reject failed");
    } finally {
      setLoading(null);
    }
  };

  if (items.length === 0) {
    return (
      <div
        style={{
          padding: "1rem",
          background: "#1e293b",
          borderRadius: "8px",
          color: "#94a3b8",
          fontSize: "0.85rem",
        }}
      >
        No pending import suggestions.
      </div>
    );
  }

  return (
    <div style={{ marginBottom: "2rem" }}>
      <h3 style={{ marginBottom: "0.75rem" }}>
        📋 Import Queue — Pending ({items.length})
      </h3>
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          fontFamily: "monospace",
          fontSize: "0.8rem",
        }}
      >
        <thead>
          <tr style={{ background: "#1e293b" }}>
            <th style={thStyle}>Subject</th>
            <th style={thStyle}>Version</th>
            <th style={thStyle}>Status</th>
            <th style={thStyle}>Created</th>
            <th style={thStyle}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} style={{ borderBottom: "1px solid #334155" }}>
              <td style={tdStyle}>{item.suggestedSubjectSlug}</td>
              <td style={tdStyle}>{item.suggestedVersionSlug ?? "—"}</td>
              <td style={tdStyle}>
                <span
                  style={{
                    padding: "2px 8px",
                    borderRadius: "4px",
                    background:
                      item.status === "PENDING" ? "#334155" : "#064e3b",
                    color: item.status === "PENDING" ? "#e2e8f0" : "#6ee7b7",
                  }}
                >
                  {item.status}
                </span>
              </td>
              <td style={tdStyle}>
                {new Date(item.createdAt).toLocaleString()}
              </td>
              <td style={tdStyle}>
                <button
                  type="button"
                  onClick={() => handleApprove(item.id)}
                  disabled={loading === item.id}
                  style={{
                    padding: "4px 12px",
                    marginRight: "6px",
                    background: loading === item.id ? "#475569" : "#16a34a",
                    color: "white",
                    border: "none",
                    borderRadius: "4px",
                    cursor: loading === item.id ? "not-allowed" : "pointer",
                    fontSize: "0.75rem",
                  }}
                >
                  Approve
                </button>
                <button
                  type="button"
                  onClick={() => handleReject(item.id)}
                  disabled={loading === item.id}
                  style={{
                    padding: "4px 12px",
                    background: loading === item.id ? "#475569" : "#dc2626",
                    color: "white",
                    border: "none",
                    borderRadius: "4px",
                    cursor: loading === item.id ? "not-allowed" : "pointer",
                    fontSize: "0.75rem",
                  }}
                >
                  Reject
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const thStyle: React.CSSProperties = {
  padding: "8px 12px",
  textAlign: "left",
  color: "#94a3b8",
  fontWeight: 600,
};

const tdStyle: React.CSSProperties = {
  padding: "8px 12px",
  color: "#e2e8f0",
  verticalAlign: "middle",
};
