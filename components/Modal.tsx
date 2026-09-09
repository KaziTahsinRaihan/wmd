"use client";

import { X } from "lucide-react";
import { ReactNode, useEffect, useState } from "react";
import { createPortal } from "react-dom";

export default function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = "max-w-lg",
  closeable = true,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: ReactNode;
  maxWidth?: string;
  closeable?: boolean;
}) {
  // Render into <body> via a portal. Otherwise the overlay's `fixed`
  // positioning is captured by any ancestor with a transform/backdrop-filter
  // (e.g. the dashboard header's `backdrop-blur`), which would trap the modal
  // inside that element instead of centering it on the viewport.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && closeable) onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, closeable, onClose]);

  // Lock background scroll while the modal is open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center overflow-y-auto p-4 animate-fade-in">
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm"
        onClick={() => closeable && onClose()}
      />
      <div
        className={`relative my-auto w-full ${maxWidth} max-h-[90vh] overflow-y-auto rounded-2xl border border-gold-500/30 bg-gradient-to-br from-ink-900 via-ink-800 to-ink-900 p-6 shadow-gold animate-scale-in`}
      >
        {closeable && (
          <button
            onClick={onClose}
            aria-label="Close"
            className="absolute right-4 top-4 rounded-lg p-1.5 text-white/60 hover:bg-white/10 hover:text-white transition"
          >
            <X className="h-4 w-4" />
          </button>
        )}
        {(title || subtitle) && (
          <header className="mb-5">
            {title && (
              <h2 className="text-2xl font-bold tracking-tight">
                <span className="gold-text">{title}</span>
              </h2>
            )}
            {subtitle && <p className="mt-1 text-sm text-white/60">{subtitle}</p>}
          </header>
        )}
        {children}
      </div>
    </div>,
    document.body,
  );
}
