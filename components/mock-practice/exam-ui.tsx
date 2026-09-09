"use client";

// Shared building blocks for the Mock Practice exam interfaces (Listening,
// Reading, Writing): highlight/note machinery, the full-screen Options window
// (submission / contrast / text size), the Notes side panel, the bottom status
// bar, drag-and-drop plumbing and the selection toolbar — identical across
// every module.

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type DragEvent,
  type ReactNode,
} from "react";
import { type SizeKey, type Theme, type ThemeKey } from "@/lib/exam-theme";
import { sanitizeHtml } from "@/lib/rich-html";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Contrast,
  Highlighter,
  Keyboard,
  MessageSquareQuote,
  Send,
  Trash2,
  Volume2,
  Wifi,
  X,
  ZoomIn,
} from "lucide-react";

// ============================================================================
// Highlight model + context
// ============================================================================

export type ExamHighlight = {
  id: string;
  blockId: string;
  start: number;
  end: number;
  /** Defined (possibly empty) → this highlight carries a private note. */
  note?: string;
  /** Pieces created from one selection share a linkId. */
  linkId?: string;
  /** Part number the note was made on (shown on the note card). */
  part?: number;
  /** Snippet of the selected text (shown on the note card). */
  snippet?: string;
};

export type SelectionPiece = { blockId: string; start: number; end: number };

export type ExamHLValue = {
  theme: Theme;
  getHighlights: (blockId: string) => ExamHighlight[];
  onClickHighlight: (h: ExamHighlight, rect: DOMRect) => void;
};

export const ExamHLCtx = createContext<ExamHLValue | null>(null);

export function useExamHL() {
  const v = useContext(ExamHLCtx);
  if (!v) throw new Error("useExamHL must be used inside an exam provider");
  return v;
}

/** Prose span that supports select-to-highlight (and noted highlights). */
export function HL({
  id,
  text,
  className,
  style,
}: {
  id: string;
  text: string;
  className?: string;
  style?: CSSProperties;
}) {
  const { getHighlights, theme, onClickHighlight } = useExamHL();
  const hls = getHighlights(id).slice().sort((a, b) => a.start - b.start);

  const segs: { text: string; hl?: ExamHighlight }[] = [];
  let i = 0;
  for (const h of hls) {
    if (h.start < i) continue;
    if (h.start > i) segs.push({ text: text.slice(i, h.start) });
    segs.push({ text: text.slice(h.start, h.end), hl: h });
    i = h.end;
  }
  if (i < text.length) segs.push({ text: text.slice(i) });

  return (
    <span data-hl-block={id} className={className} style={style}>
      {segs.map((s, idx) =>
        s.hl ? (
          <mark
            key={idx}
            onClick={(e) => {
              e.stopPropagation();
              onClickHighlight(s.hl!, (e.currentTarget as HTMLElement).getBoundingClientRect());
            }}
            className={s.hl.note !== undefined ? "underline decoration-dotted underline-offset-2" : ""}
            title={s.hl.note !== undefined ? "Note — click to view" : undefined}
            style={{
              background: theme.hlBg,
              color: theme.hlFg,
              padding: "0 1px",
              borderRadius: 2,
              cursor: "pointer",
            }}
          >
            {s.text}
          </mark>
        ) : (
          <span key={idx}>{s.text}</span>
        ),
      )}
    </span>
  );
}

// ============================================================================
// Selection geometry helpers
// ============================================================================

export function rangeLen(block: HTMLElement, container: Node, offset: number): number {
  const r = document.createRange();
  r.selectNodeContents(block);
  try {
    r.setEnd(container, offset);
  } catch {
    return block.textContent?.length ?? 0;
  }
  return r.toString().length;
}

/**
 * Split the current browser selection into per-block pieces so selections that
 * cross block boundaries (a bold word, an answer gap, a paragraph break, or
 * both panes of a split view) still produce a highlight.
 */
export function getSelectionPieces(): { pieces: SelectionPiece[]; text: string; x: number; y: number } | null {
  const sel = window.getSelection();
  if (!sel || sel.isCollapsed || sel.rangeCount === 0) return null;
  const range = sel.getRangeAt(0);
  const blocks = Array.from(document.querySelectorAll<HTMLElement>("[data-hl-block]"));
  const pieces: SelectionPiece[] = [];
  for (const block of blocks) {
    let intersects = false;
    try {
      intersects = range.intersectsNode(block);
    } catch {
      intersects = false;
    }
    if (!intersects) continue;
    const len = block.textContent?.length ?? 0;
    let start = 0;
    let end = len;
    if (block.contains(range.startContainer)) start = rangeLen(block, range.startContainer, range.startOffset);
    if (block.contains(range.endContainer)) end = rangeLen(block, range.endContainer, range.endOffset);
    if (end > start) pieces.push({ blockId: block.dataset.hlBlock!, start, end });
  }
  if (pieces.length === 0) return null;
  const rect = range.getBoundingClientRect();
  const x = Math.max(90, Math.min(rect.left + rect.width / 2, window.innerWidth - 90));
  return { pieces, text: sel.toString(), x, y: rect.bottom + 12 };
}

/** Turn selection pieces into linked highlight entries (one per block). */
export function buildHighlights(
  pieces: SelectionPiece[],
  opts?: { note?: string; part?: number; snippet?: string },
): ExamHighlight[] {
  const linkId = `hl-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  return pieces.map((p, i) => ({
    id: `${linkId}-${i}`,
    linkId,
    blockId: p.blockId,
    start: p.start,
    end: p.end,
    note: opts?.note,
    part: opts?.part,
    snippet: opts?.snippet,
  }));
}

/** Remove a clicked highlight — including every piece from the same selection. */
export function removeHighlight(hs: ExamHighlight[], target: { id?: string; linkId?: string }): ExamHighlight[] {
  const key = target.linkId ?? target.id;
  return hs.filter((h) => (h.linkId ?? h.id) !== key);
}

// ============================================================================
// Drag & drop plumbing — shared by every drag-into-gap question type
// ============================================================================

export type DragPayload = {
  option: string;
  fromGap: number | null;
  groupId: string;
  range: [number, number];
};

export function setDragPayload(e: DragEvent, p: DragPayload) {
  e.dataTransfer.setData("text/plain", JSON.stringify(p));
  e.dataTransfer.effectAllowed = "move";
}

export function getDragPayload(e: DragEvent): DragPayload | null {
  try {
    const p = JSON.parse(e.dataTransfer.getData("text/plain"));
    if (p && typeof p.option === "string" && typeof p.groupId === "string" && Array.isArray(p.range)) return p;
  } catch {
    /* not ours */
  }
  return null;
}

/** Props shared by the drag-and-drop gap primitives (both exam runtimes). */
export type GapDnD = {
  answers: Record<number, string>;
  setAnswer: (n: number, v: string) => void;
  dropOnGap: (gap: number, p: DragPayload) => void;
  registerGap: (n: number, el: HTMLElement | null) => void;
  currentNumbers: number[];
  onFocusQuestion: (n: number) => void;
  hoverGap: number | null;
  setHoverGap: (n: number | null) => void;
};

/** A draggable answer chip (bold for teacher-authored draggable options). */
export function DragChip({
  option,
  groupId,
  fromGap,
  range,
  bold,
}: {
  option: string;
  groupId: string;
  fromGap: number | null;
  range: [number, number];
  bold?: boolean;
}) {
  const { theme } = useExamHL();
  return (
    <span
      draggable
      onDragStart={(e) => setDragPayload(e, { option, fromGap, groupId, range })}
      className={`inline-block cursor-grab select-none rounded-[6px] border px-3 py-1 active:cursor-grabbing ${bold ? "font-bold" : ""}`}
      style={{ borderColor: theme.inputBorder, background: theme.inputBg, color: theme.inputFg }}
    >
      {option}
    </span>
  );
}

/** Droppable numbered gap that accepts DragChips of the same group. */
export function DropGap({
  n,
  groupId,
  range,
  dashed,
  fill,
  answers,
  dropOnGap,
  registerGap,
  currentNumbers,
  onFocusQuestion,
  setAnswer,
  hoverGap,
  setHoverGap,
}: GapDnD & {
  n: number;
  groupId: string;
  range: [number, number];
  dashed?: boolean;
  /** Stretch to fill an absolutely-positioned parent (map boxes). */
  fill?: boolean;
}) {
  const { theme } = useExamHL();
  const value = answers[n];
  const isCurrent = currentNumbers.includes(n);
  const hovered = hoverGap === n;

  return (
    <span
      ref={(el) => registerGap(n, el)}
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        setHoverGap(n);
      }}
      onDragLeave={() => setHoverGap(null)}
      onDrop={(e) => {
        e.preventDefault();
        setHoverGap(null);
        const p = getDragPayload(e);
        if (p && p.groupId === groupId) dropOnGap(n, p);
      }}
      onClick={() => {
        if (value) setAnswer(n, "");
        onFocusQuestion(n);
      }}
      draggable={!!value}
      onDragStart={(e) => {
        if (value) setDragPayload(e, { option: value, fromGap: n, groupId, range });
      }}
      title={value ? "Click to remove, or drag to another gap" : undefined}
      className={`${fill ? "flex h-full w-full" : "mx-1 inline-flex h-[32px] min-w-[130px] align-middle"} items-center justify-center rounded-[6px] px-2 text-center leading-tight ${
        value ? "cursor-grab active:cursor-grabbing" : ""
      }`}
      style={{
        border: `${dashed && !value ? 2 : isCurrent ? 2 : 1.5}px ${dashed && !value ? "dashed" : "solid"} ${
          hovered ? theme.accent : value || isCurrent ? "#7aa7d9" : "#9ec1e0"
        }`,
        background: hovered ? theme.accentSoftBg : theme.inputBg,
        color: theme.inputFg,
        fontWeight: value ? 400 : 700,
        fontSize: value ? "0.92em" : "0.95em",
      }}
    >
      {value || n}
    </span>
  );
}

/**
 * Rich pasted content: renders the teacher's sanitized HTML (bold, fonts,
 * indentation, real tables with merged cells) and swaps every "12_____"
 * placeholder — anywhere, including inside table cells — for a live answer
 * box wired into the same answers/navigation state as ordinary gaps.
 * Shared by the listening and reading exams.
 */
export function RichPasted({
  html,
  answers,
  setAnswer,
  registerGap,
  currentNumbers,
  onFocusQuestion,
}: {
  html: string;
  answers: Record<number, string>;
  setAnswer: (n: number, v: string) => void;
  registerGap: (n: number, el: HTMLElement | null) => void;
  currentNumbers: number[];
  onFocusQuestion: (n: number) => void;
}) {
  const { theme } = useExamHL();
  const ref = useRef<HTMLDivElement>(null);
  const inputs = useRef(new Map<number, HTMLInputElement>());
  const latest = useRef({ setAnswer, registerGap, onFocusQuestion });
  latest.current = { setAnswer, registerGap, onFocusQuestion };

  // Build the DOM once per content: sanitize, then replace gap placeholders
  // in text nodes with real <input> elements (React can't render into raw
  // HTML, so these are wired imperatively via the `latest` ref).
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    root.innerHTML = sanitizeHtml(html);
    inputs.current.clear();
    const RE = /(\d{1,3})\s*_{3,}/g;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const texts: Text[] = [];
    while (walker.nextNode()) texts.push(walker.currentNode as Text);
    for (const tn of texts) {
      const value = tn.nodeValue ?? "";
      if (!/\d\s*_{3,}/.test(value)) continue;
      const frag = document.createDocumentFragment();
      let last = 0;
      for (const m of value.matchAll(RE)) {
        const idx = m.index ?? 0;
        if (idx > last) frag.appendChild(document.createTextNode(value.slice(last, idx)));
        const n = Number(m[1]);
        const inp = document.createElement("input");
        inp.type = "text";
        inp.placeholder = String(n);
        inp.autocomplete = "off";
        inp.spellcheck = false;
        inp.className =
          "wmd-gap-input mx-1 inline-block h-[32px] rounded-[3px] px-2 align-middle outline-none";
        inp.style.background = theme.inputBg;
        inp.style.color = theme.inputFg;
        inp.style.fontSize = "0.95em";
        inp.addEventListener("input", () => latest.current.setAnswer(n, inp.value));
        inp.addEventListener("focus", () => latest.current.onFocusQuestion(n));
        inputs.current.set(n, inp);
        latest.current.registerGap(n, inp);
        frag.appendChild(inp);
        last = idx + m[0].length;
      }
      if (last < value.length) frag.appendChild(document.createTextNode(value.slice(last)));
      tn.replaceWith(frag);
    }
  }, [html, theme]);

  // Keep values, box widths and the current-question border in sync.
  useEffect(() => {
    for (const [n, inp] of inputs.current) {
      const v = answers[n] ?? "";
      if (inp.value !== v) inp.value = v;
      inp.style.width = `${gapInputWidth(v)}px`;
      const isCurrent = currentNumbers.includes(n);
      inp.style.border = `${isCurrent ? 2 : 1}px solid ${isCurrent ? theme.accent : theme.inputBorder}`;
    }
  });

  return <div ref={ref} className="pasted-rich mt-2 leading-[1.9]" />;
}

/** A random 6-digit Test Taker ID, generated once per exam session. */
export function useTestTakerId(): string {
  const [id] = useState(() => String(Math.floor(100000 + Math.random() * 900000)));
  return id;
}

/** The bank of unplaced options; dropping a placed chip back undoes it. */
export function OptionBank({
  groupId,
  options,
  used,
  setAnswer,
  range,
  bold,
}: {
  groupId: string;
  options: string[];
  used: string[];
  setAnswer: (n: number, v: string) => void;
  range: [number, number];
  bold?: boolean;
}) {
  return (
    <div
      className="flex w-56 shrink-0 flex-col items-start gap-3 pt-1"
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        const p = getDragPayload(e);
        if (p && p.groupId === groupId && p.fromGap !== null) {
          e.preventDefault();
          setAnswer(p.fromGap, "");
        }
      }}
    >
      {options
        .filter((o) => !used.includes(o))
        .map((o) => (
          <DragChip key={o} option={o} groupId={groupId} fromGap={null} range={range} bold={bold} />
        ))}
    </div>
  );
}

export function usedOptions(answers: Record<number, string>, range: [number, number]): string[] {
  const used: string[] = [];
  for (let n = range[0]; n <= range[1]; n++) if (answers[n]) used.push(answers[n]);
  return used;
}

/** "⌨ Help" link with a popover explaining the drag interactions. */
export function HelpLink() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && t.closest("[data-help-pop]")) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);
  return (
    <div className="relative flex justify-end" data-help-pop>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 text-[15px] text-[#1565c0] hover:underline"
      >
        <Keyboard className="h-5 w-5" /> Help
      </button>
      {open && (
        <div className="absolute right-0 top-7 z-[115] w-72 rounded-lg border border-[#d0d0d0] bg-white p-3 text-[13px] text-[#333] shadow-xl">
          Drag an answer into a gap to place it. Drag it to another gap to move it, or click a
          placed answer to return it to the list.
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Selection toolbar + delete popover — identical across every module
// ============================================================================

function Caret() {
  return (
    <span
      aria-hidden
      className="absolute -top-[7px] left-1/2 h-3.5 w-3.5 -translate-x-1/2 rotate-45 border-l border-t bg-white"
      style={{ borderColor: "#cfcfcf" }}
    />
  );
}

/** Toolbar shown under a text selection: Highlight first, then Note. */
export function SelectionToolbar({
  x,
  y,
  onHighlight,
  onNote,
}: {
  x: number;
  y: number;
  onHighlight: () => void;
  onNote: () => void;
}) {
  return (
    <div
      data-exam-pop
      className="fixed z-[320] -translate-x-1/2 rounded-lg border bg-white shadow-xl"
      style={{ left: x, top: y, borderColor: "#cfcfcf" }}
    >
      <Caret />
      <div className="flex">
        <button
          type="button"
          onClick={onHighlight}
          className="flex w-20 flex-col items-center gap-1 rounded-l-lg px-3 py-2.5 text-[13px] text-[#666] transition hover:bg-[#f2f2f2]"
        >
          <Highlighter className="h-5 w-5" />
          Highlight
        </button>
        <button
          type="button"
          onClick={onNote}
          className="flex w-20 flex-col items-center gap-1 rounded-r-lg px-3 py-2.5 text-[13px] text-[#666] transition hover:bg-[#f2f2f2]"
        >
          <MessageSquareQuote className="h-5 w-5" />
          Note
        </button>
      </div>
    </div>
  );
}

/** Popover on a clicked plain highlight: Delete Highlight. */
export function HighlightPopover({
  x,
  y,
  note,
  onDelete,
}: {
  x: number;
  y: number;
  note?: string;
  onDelete: () => void;
}) {
  return (
    <div
      data-exam-pop
      className="fixed z-[320] -translate-x-1/2 rounded-lg border bg-white shadow-xl"
      style={{ left: x, top: y, borderColor: "#cfcfcf" }}
    >
      <Caret />
      <div className="flex flex-col items-stretch p-1">
        {note && (
          <p className="max-w-[220px] whitespace-pre-line border-b border-[#eee] px-3 py-2 text-[13px] text-[#222]">
            {note}
          </p>
        )}
        <button
          type="button"
          onClick={onDelete}
          className="flex flex-col items-center gap-1 rounded px-4 py-2 text-[13px] leading-tight text-[#666] transition hover:bg-[#f2f2f2]"
        >
          <Trash2 className="h-5 w-5" />
          <span className="text-center">
            Delete
            <br />
            Highlight
          </span>
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// Full-screen Options window (F2–F6)
// ============================================================================

export function OptionsScreen({
  theme,
  themeKey,
  sizeKey,
  onTheme,
  onSize,
  onClose,
  onSubmission,
}: {
  theme: Theme;
  themeKey: ThemeKey;
  sizeKey: SizeKey;
  onTheme: (t: ThemeKey) => void;
  onSize: (s: SizeKey) => void;
  onClose: () => void;
  onSubmission: () => void;
}) {
  const [view, setView] = useState<"main" | "contrast" | "size">("main");

  const contrasts: { key: ThemeKey; label: string; fg: string; bg: string }[] = [
    { key: "bw", label: "Black on white", fg: "#1f1f1f", bg: "#ffffff" },
    { key: "wb", label: "White on black", fg: "#ffffff", bg: "#111111" },
    { key: "yb", label: "Yellow on black", fg: "#f2d600", bg: "#111111" },
  ];
  const sizes: { key: SizeKey; label: string }[] = [
    { key: "regular", label: "Regular" },
    { key: "large", label: "Large" },
    { key: "xl", label: "Extra large" },
  ];

  const rowClass = "flex w-full items-center gap-5 px-6 py-6 text-left text-[19px] transition hover:opacity-80";

  return (
    <div
      className="scrollbar-none absolute inset-0 z-[250] overflow-y-auto"
      style={{ background: theme.contentBg, color: theme.fg }}
    >
      {/* header */}
      <div className="relative px-8 pt-7">
        {view !== "main" && (
          <button
            type="button"
            onClick={() => setView("main")}
            className="absolute left-6 top-6 flex items-center text-[26px] font-bold"
            style={{ color: theme.fg }}
          >
            <ChevronLeft className="h-8 w-8" strokeWidth={2.75} /> Options
          </button>
        )}
        <h2 className="text-center text-[30px] font-bold">
          {view === "main" ? "Options" : view === "contrast" ? "Contrast" : "Text size"}
        </h2>
        <button
          type="button"
          aria-label="Close options"
          onClick={onClose}
          className="absolute right-8 top-7"
          style={{ color: theme.fg }}
        >
          <X className="h-8 w-8" strokeWidth={3.25} />
        </button>
      </div>

      <div className="mx-auto mt-10 w-full max-w-[960px] px-6 pb-16">
        {view === "main" && (
          <>
            <button
              type="button"
              onClick={onSubmission}
              className="flex w-full items-center gap-5 rounded-lg bg-[#d5464f] px-6 py-6 text-white shadow-md transition hover:bg-[#c23b44]"
            >
              <Send className="h-6 w-6" />
              <span className="flex-1 text-left text-[19px] font-bold">Go to submission page</span>
              <ChevronRight className="h-6 w-6" strokeWidth={3} />
            </button>

            <div
              className="mt-7 overflow-hidden rounded-lg border"
              style={{ borderColor: theme.chromeBorder, background: theme.contentBg }}
            >
              <button type="button" onClick={() => setView("contrast")} className={rowClass} style={{ color: theme.fg }}>
                <Contrast className="h-6 w-6" style={{ color: theme.muted }} />
                <span className="flex-1">Contrast</span>
                <ChevronRight className="h-6 w-6" strokeWidth={3} />
              </button>
              <div style={{ borderTop: `1px solid ${theme.chromeBorder}` }} />
              <button type="button" onClick={() => setView("size")} className={rowClass} style={{ color: theme.fg }}>
                <ZoomIn className="h-6 w-6" style={{ color: theme.muted }} />
                <span className="flex-1">Text size</span>
                <ChevronRight className="h-6 w-6" strokeWidth={3} />
              </button>
            </div>
          </>
        )}

        {view === "contrast" && (
          <div
            className="overflow-hidden rounded-lg border"
            style={{ borderColor: theme.chromeBorder, background: theme.contentBg }}
          >
            {contrasts.map((c, i) => (
              <div key={c.key}>
                {i > 0 && <div style={{ borderTop: `1px solid ${theme.chromeBorder}` }} />}
                <button type="button" onClick={() => onTheme(c.key)} className={rowClass} style={{ color: theme.fg }}>
                  <span className="w-8 shrink-0">
                    {themeKey === c.key && <Check className="h-6 w-6" strokeWidth={3.5} />}
                  </span>
                  <span className="flex-1">{c.label}</span>
                  <span
                    className="flex h-11 w-[70px] shrink-0 flex-col justify-center gap-[4px] rounded-[2px] border px-2 shadow"
                    style={{ background: c.bg, borderColor: "#999999" }}
                    aria-hidden
                  >
                    {[0.9, 1, 1, 0.7].map((w, li) => (
                      <span key={li} className="block h-[2.5px]" style={{ background: c.fg, width: `${w * 100}%` }} />
                    ))}
                  </span>
                </button>
              </div>
            ))}
          </div>
        )}

        {view === "size" && (
          <div
            className="overflow-hidden rounded-lg border"
            style={{ borderColor: theme.chromeBorder, background: theme.contentBg }}
          >
            {sizes.map((s, i) => (
              <div key={s.key}>
                {i > 0 && <div style={{ borderTop: `1px solid ${theme.chromeBorder}` }} />}
                <button type="button" onClick={() => onSize(s.key)} className={rowClass} style={{ color: theme.fg }}>
                  <span className="w-8 shrink-0">
                    {sizeKey === s.key && <Check className="h-6 w-6" strokeWidth={3.5} />}
                  </span>
                  <span className="flex-1">{s.label}</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Notes side panel (F7/F8)
// ============================================================================

export type NoteCard = { linkId: string; part: number; snippet: string; text: string };

function NoteCardView({
  note,
  focused,
  onChange,
  onDelete,
}: {
  note: NoteCard;
  focused: boolean;
  onChange: (text: string) => void;
  onDelete: () => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (focused) ref.current?.focus();
  }, [focused]);
  return (
    <div className="rounded-md bg-[#2f4ecc] p-3 text-white shadow">
      <p className="flex items-baseline gap-2 text-[15px]">
        <span className="shrink-0 font-bold">Part {note.part}</span>
        <span className="truncate italic">{note.snippet}</span>
      </p>
      <input
        ref={ref}
        type="text"
        value={note.text}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Start typing your note"
        className="mt-2 w-full rounded border-2 border-white bg-white px-2 py-2 text-[15px] text-[#1f1f1f] outline-none placeholder:text-[#777] focus:border-[#9ec1e0]"
        style={{ colorScheme: "light" }}
      />
      <div className="mt-2 flex justify-end">
        <button type="button" onClick={onDelete} className="text-[15px] text-white hover:underline">
          Delete
        </button>
      </div>
    </div>
  );
}

export function NotesPanel({
  notes,
  focusLinkId,
  onChange,
  onDelete,
  onClose,
}: {
  notes: NoteCard[];
  focusLinkId: string | null;
  onChange: (linkId: string, text: string) => void;
  onDelete: (linkId: string) => void;
  onClose: () => void;
}) {
  return (
    <aside
      className="flex w-[380px] shrink-0 flex-col border-l"
      style={{ background: "#f2f2f2", borderColor: "#d9d9d9", colorScheme: "light" }}
    >
      <div className="flex items-center justify-between px-5 py-4">
        <span className="text-[17px] text-[#1f1f1f]">Notes</span>
        <button type="button" aria-label="Close notes" onClick={onClose} className="text-[#1f1f1f]">
          <X className="h-6 w-6" strokeWidth={3} />
        </button>
      </div>
      {notes.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-5 px-10 text-center text-[#1f1f1f]">
          <p className="text-[26px] leading-snug">Your private notes will show here</p>
          <p className="text-[16px]">Select text to highlight or create a note.</p>
        </div>
      ) : (
        <div className="scrollbar-none flex-1 space-y-4 overflow-y-auto p-4">
          {notes.map((n) => (
            <NoteCardView
              key={n.linkId}
              note={n}
              focused={n.linkId === focusLinkId}
              onChange={(text) => onChange(n.linkId, text)}
              onDelete={() => onDelete(n.linkId)}
            />
          ))}
        </div>
      )}
    </aside>
  );
}

// ============================================================================
// Pre-test boot: brief "Your test will begin shortly" screen + viewport
// scrollbar hiding while any exam is mounted
// ============================================================================

/**
 * Returns true for ~1.3s after mount (show TestLoadingScreen), and hides the
 * viewport scrollbar (functionality kept) for as long as the exam is open.
 */
export function useExamBoot(delayMs = 1300): boolean {
  const [booting, setBooting] = useState(true);
  useEffect(() => {
    document.documentElement.classList.add("exam-open");
    const t = setTimeout(() => setBooting(false), delayMs);
    return () => {
      clearTimeout(t);
      document.documentElement.classList.remove("exam-open");
    };
  }, [delayMs]);
  return booting;
}

/** Full-screen white loader shown briefly before a test begins. */
export function TestLoadingScreen() {
  return (
    <div
      className="exam-surface fixed inset-0 z-[300] flex flex-col items-center justify-center gap-9 bg-white"
      style={{ fontFamily: "Arial, Helvetica, sans-serif", colorScheme: "light" }}
    >
      <span
        aria-hidden
        className="h-20 w-20 animate-spin rounded-full border-[6px] border-black border-t-transparent"
      />
      <div className="text-center text-[#1f1f1f]">
        <p className="text-[30px] font-bold">Your test will begin shortly</p>
        <p className="mt-4 text-[18px]">Please wait</p>
      </div>
    </div>
  );
}

/**
 * Width for a typed answer box that grows with its content, so long answers
 * enlarge the box and the surrounding text reflows around it.
 */
export function gapInputWidth(value: string | undefined): number {
  const len = value?.length ?? 0;
  return Math.min(460, Math.max(150, 30 + len * 8.6));
}

// ============================================================================
// Bottom status bar (F9): 24-hour clock + optional horizontal volume slider
// ============================================================================

export function StatusBar({
  theme,
  bw,
  showVolume = false,
  volume = 70,
  onVolume,
  extraLeft,
}: {
  theme: Theme;
  bw: boolean;
  showVolume?: boolean;
  volume?: number;
  onVolume?: (v: number) => void;
  extraLeft?: ReactNode;
}) {
  const [clock, setClock] = useState("");
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const tick = () =>
      setClock(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false }));
    tick();
    const t = setInterval(tick, 10000);
    return () => clearInterval(t);
  }, []);

  return (
    <footer
      className="flex items-center justify-between border-t px-4 py-1.5"
      style={{
        background: bw ? "#ececec" : theme.chromeStatusBg,
        borderColor: theme.chromeBorder,
        color: theme.chromeFg,
      }}
    >
      <div>{extraLeft}</div>
      <div className="flex items-center gap-4">
        <Wifi className="h-5 w-5" />
        <span className="text-[15px] tabular-nums">{clock}</span>
        {showVolume && (
          <div className="relative" data-exam-pop>
            <button
              type="button"
              aria-label="Volume"
              onClick={() => setOpen((o) => !o)}
              className="grid place-items-center rounded p-0.5 transition hover:opacity-70"
            >
              <Volume2 className="h-5 w-5" />
            </button>
            {open && (
              <div
                data-exam-pop
                className="absolute bottom-9 right-0 flex items-center gap-2 rounded-lg border bg-white px-3 py-2.5 shadow-xl"
                style={{ borderColor: "#cfcfcf", colorScheme: "light" }}
              >
                {/* Horizontal slider — drag sideways to change the volume. */}
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={volume}
                  onChange={(e) => onVolume?.(Number(e.target.value))}
                  aria-label="Volume level"
                  className="h-1.5 w-40"
                  style={{ accentColor: "#1565c0" }}
                />
                <span className="w-7 text-right text-xs tabular-nums text-[#333]">{volume}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </footer>
  );
}
