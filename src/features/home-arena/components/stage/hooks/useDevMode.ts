"use client";

import { useEffect, useState } from "react";

type ClearanceInfo = {
  clearance: string | null;
  isAdmin: boolean;
  loading: boolean;
};

export function useDevMode(): ClearanceInfo & {
  isDevMode: boolean;
  toggleDevMode: () => void;
} {
  const [clearance, setClearance] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isDevMode, setIsDevMode] = useState(false);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/auth/clearance")
      .then((res) => res.json())
      .then((data: { clearance: string | null; isAdmin: boolean }) => {
        if (cancelled) return;
        setClearance(data.clearance);
        setIsAdmin(data.isAdmin);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setClearance(null);
        setIsAdmin(false);
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  function toggleDevMode() {
    setIsDevMode((prev) => !prev);
  }

  return { clearance, isAdmin, loading, isDevMode, toggleDevMode };
}
