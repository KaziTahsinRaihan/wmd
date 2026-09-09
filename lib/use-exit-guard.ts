"use client";

import { useEffect, useRef } from "react";

// Guards against leaving an exam / authoring screen by any route other than the
// in-app Exit button, while `active` is true:
//   • Browser Back button  -> stays on the page and calls `onBack()` so the
//     caller can show its own warning dialog.
//   • Refresh / tab close / external navigation -> native browser prompt.
//
// `onBack` is kept in a ref so changing its identity each render doesn't tear
// down and re-arm the guard.
export function useExitGuard(active: boolean, onBack: () => void) {
  const cb = useRef(onBack);
  cb.current = onBack;

  useEffect(() => {
    if (!active) return;

    const beforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", beforeUnload);

    // Seed a history entry so the first Back press fires popstate (which we
    // catch) instead of actually navigating away.
    window.history.pushState(null, "", window.location.href);
    const onPop = () => {
      // Re-seed so we keep catching subsequent Back presses, then prompt.
      window.history.pushState(null, "", window.location.href);
      cb.current();
    };
    window.addEventListener("popstate", onPop);

    return () => {
      window.removeEventListener("beforeunload", beforeUnload);
      window.removeEventListener("popstate", onPop);
    };
  }, [active]);
}
