"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export default function usePageVisibility() {
  const [isPageVisible, setIsPageVisible] = useState(true);
  const wasEverVisibleSinceRef = useRef(true);
  const animationStartedRef = useRef(false);

  useEffect(() => {
    function handleVisibilityChange() {
      const visible = document.visibilityState === "visible";
      setIsPageVisible(visible);

      if (visible && animationStartedRef.current) {
        wasEverVisibleSinceRef.current = true;
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  const markAnimationStarted = useCallback(() => {
    animationStartedRef.current = true;
    wasEverVisibleSinceRef.current = document.visibilityState === "visible";
  }, []);

  const wasEverVisibleSince = useCallback(() => {
    return wasEverVisibleSinceRef.current;
  }, []);

  return {
    isPageVisible,
    markAnimationStarted,
    wasEverVisibleSince,
  };
}
