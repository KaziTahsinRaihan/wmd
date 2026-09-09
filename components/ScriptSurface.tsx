"use client";

import {
  PointerEvent as ReactPointerEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import type { Annotation, TextAnn } from "@/lib/writing";

// ----------------------------------------------------------------------------
// Reusable script-paper + annotation overlay.
//
// Used in both the instructor evaluator (interactive: true) and the student
// feedback view (interactive: false). When interactive, the parent supplies
// the active tool / colour / sizes and a callback to commit a finished
// annotation. The component owns its own draft state so a stroke that's
// still being drawn doesn't roundtrip through the parent on every move.
// ----------------------------------------------------------------------------

export type Tool = "highlighter" | "arrow" | "pen" | "circle" | "text";

export const COLORS = [
  "#facc15", // yellow
  "#f97316", // orange
  "#ef4444", // red
  "#22c55e", // green
  "#3b82f6", // blue
  "#a855f7", // purple
  "#ec4899", // pink
  "#ffffff", // white
];

const HIGHLIGHTER_OPACITY = 0.32;

function slugColor(c: string) {
  return c.replace("#", "");
}

function newId() {
  return `a-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
}

// Default text-box dimensions (surface px) and the minimum a box can shrink to.
const TEXT_BOX_W = 180;
const TEXT_BOX_H = 44;
const TEXT_MIN_W = 60;
const TEXT_MIN_H = 28;

const boxW = (a: { w?: number }) => a.w ?? TEXT_BOX_W;
const boxH = (a: { h?: number }) => a.h ?? TEXT_BOX_H;

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

// Keep a box of (w × h) fully inside a surface of (rectW × rectH).
function clampBox(
  x: number,
  y: number,
  w: number,
  h: number,
  rectW: number,
  rectH: number,
) {
  return {
    x: clamp(x, 0, Math.max(0, rectW - w)),
    y: clamp(y, 0, Math.max(0, rectH - h)),
  };
}

type Props = {
  body: string;
  promptHeader?: string;
  annotations: Annotation[];
  interactive: boolean;
  tool?: Tool;
  color?: string;
  strokeWidth?: number;
  highlighterHeight?: number;
  textSize?: number;
  onChange?: (annotations: Annotation[]) => void;
};

export default function ScriptSurface({
  body,
  promptHeader,
  annotations,
  interactive,
  tool = "highlighter",
  color = COLORS[0],
  strokeWidth = 3,
  highlighterHeight = 20,
  textSize = 14,
  onChange,
}: Props) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [draft, setDraft] = useState<Annotation | null>(null);
  // The id of the text annotation currently being typed into. Kept in a ref
  // so the SVG's pointerdown handler can see the up-to-date value without a
  // re-render race with the input's onBlur.
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const editingTextIdRef = useRef<string | null>(null);
  useEffect(() => {
    editingTextIdRef.current = editingTextId;
  }, [editingTextId]);

  // The text box being edited. Focused explicitly on open because it's created
  // mid-pointer-interaction, where `autoFocus` alone can be unreliable.
  const editRef = useRef<HTMLTextAreaElement | null>(null);
  useEffect(() => {
    if (!editingTextId) return;
    editRef.current?.focus();
  }, [editingTextId]);

  // Position of the cursor over the paper while the Text tool is armed — drives
  // the dotted preview box that follows the pointer before a box is placed.
  const [hoverPoint, setHoverPoint] = useState<{ x: number; y: number } | null>(null);

  // Ephemeral resize state for dragging a placed text box's corner handle.
  const resizeRef = useRef<{
    id: string;
    startClientX: number;
    startClientY: number;
    origW: number;
    origH: number;
  } | null>(null);

  const surfaceSize = () => {
    const r = svgRef.current?.getBoundingClientRect();
    return { w: r?.width ?? 0, h: r?.height ?? 0 };
  };

  // Track the starting point of a circle drag so the anchor doesn't drift as
  // the user drags away from the click position. We can't keep this in draft
  // (we have to keep cx/cy as the running ellipse centre for rendering),
  // and refs are perfect for ephemeral pointer state.
  const circleStartRef = useRef<{ x: number; y: number } | null>(null);

  // Ephemeral drag state for moving a placed text box around the page.
  const textDragRef = useRef<{
    id: string;
    startClientX: number;
    startClientY: number;
    origX: number;
    origY: number;
    moved: boolean;
  } | null>(null);

  const commitAnnotations = (next: Annotation[]) => {
    onChange?.(next);
  };

  // When a text box is being edited, applying the toolbar colour / size updates
  // that box live (so the instructor can restyle text after placing it). This
  // only fires when colour/size actually change — selecting a box to edit
  // leaves its existing styling untouched.
  useEffect(() => {
    const id = editingTextIdRef.current;
    if (!id) return;
    commitAnnotations(
      annotations.map((x) =>
        x.id === id && x.tool === "text" ? { ...x, color, size: textSize } : x,
      ),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [color, textSize]);

  const startEditing = (id: string) => {
    if (!interactive) return;
    setEditingTextId(id);
  };

  // ---- Move (dragging the box's dotted border while it's being edited) ----
  const onFramePointerDown = (e: ReactPointerEvent<HTMLDivElement>, ann: TextAnn) => {
    if (!interactive) return;
    e.stopPropagation();
    // Keep the textarea focused (and the box "selected") while dragging.
    e.preventDefault();
    textDragRef.current = {
      id: ann.id,
      startClientX: e.clientX,
      startClientY: e.clientY,
      origX: ann.x,
      origY: ann.y,
      moved: false,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onFramePointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const d = textDragRef.current;
    if (!d) return;
    e.stopPropagation();
    const dx = e.clientX - d.startClientX;
    const dy = e.clientY - d.startClientY;
    if (!d.moved && Math.hypot(dx, dy) > 3) d.moved = true;
    if (!d.moved) return;
    const { w: rw, h: rh } = surfaceSize();
    commitAnnotations(
      annotations.map((x) => {
        if (x.id !== d.id || x.tool !== "text") return x;
        const { x: nx, y: ny } = clampBox(d.origX + dx, d.origY + dy, boxW(x), boxH(x), rw, rh);
        return { ...x, x: nx, y: ny };
      }),
    );
  };

  const onFramePointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!textDragRef.current) return;
    textDragRef.current = null;
    e.stopPropagation();
  };

  // ---- Resize (bottom-right corner handle) ----
  const onResizePointerDown = (
    e: ReactPointerEvent<HTMLDivElement>,
    ann: TextAnn,
  ) => {
    if (!interactive) return;
    e.stopPropagation();
    // Keep the textarea focused while resizing an actively-edited box.
    e.preventDefault();
    resizeRef.current = {
      id: ann.id,
      startClientX: e.clientX,
      startClientY: e.clientY,
      origW: boxW(ann),
      origH: boxH(ann),
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onResizePointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const r = resizeRef.current;
    if (!r) return;
    e.stopPropagation();
    const { w: rw, h: rh } = surfaceSize();
    commitAnnotations(
      annotations.map((x) => {
        if (x.id !== r.id || x.tool !== "text") return x;
        const maxW = Math.max(TEXT_MIN_W, rw - x.x);
        const maxH = Math.max(TEXT_MIN_H, rh - x.y);
        return {
          ...x,
          w: clamp(r.origW + (e.clientX - r.startClientX), TEXT_MIN_W, maxW),
          h: clamp(r.origH + (e.clientY - r.startClientY), TEXT_MIN_H, maxH),
        };
      }),
    );
  };

  const onResizePointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!resizeRef.current) return;
    e.stopPropagation();
    resizeRef.current = null;
  };

  // ---- Hover preview (dotted box following the cursor before placement) ----
  const updateHover = (clientX: number, clientY: number) => {
    if (!interactive || tool !== "text" || editingTextId || draft) {
      if (hoverPoint) setHoverPoint(null);
      return;
    }
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const { x } = clampBox(
      clientX - rect.left,
      clientY - rect.top,
      TEXT_BOX_W,
      TEXT_BOX_H,
      rect.width,
      rect.height,
    );
    const y = clamp(clientY - rect.top, 0, Math.max(0, rect.height - TEXT_BOX_H));
    setHoverPoint({ x, y });
  };

  const localPoint = (e: ReactPointerEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const rect = svg.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const onPointerDown = (e: ReactPointerEvent<SVGSVGElement>) => {
    if (!interactive) return;
    const p = localPoint(e);

    if (tool === "text") {
      const { w: rw, h: rh } = surfaceSize();
      // Drop the box where it was previewed, fully inside the paper.
      const { x, y } = clampBox(p.x, p.y, TEXT_BOX_W, TEXT_BOX_H, rw, rh);
      const id = newId();
      const ann: TextAnn = {
        id,
        tool: "text",
        color,
        x,
        y,
        text: "",
        size: textSize,
        w: TEXT_BOX_W,
        h: TEXT_BOX_H,
      };
      commitAnnotations([...annotations, ann]);
      setEditingTextId(id);
      setHoverPoint(null);
      return;
    }

    if (tool === "pen") {
      setDraft({
        id: newId(),
        tool: "pen",
        color,
        width: strokeWidth,
        points: [p],
      });
      e.currentTarget.setPointerCapture(e.pointerId);
      return;
    }

    if (tool === "highlighter") {
      setDraft({
        id: newId(),
        tool: "highlighter",
        color,
        height: highlighterHeight,
        x1: p.x,
        y1: p.y,
        x2: p.x,
        y2: p.y,
      });
      e.currentTarget.setPointerCapture(e.pointerId);
      return;
    }

    if (tool === "arrow") {
      setDraft({
        id: newId(),
        tool: "arrow",
        color,
        width: strokeWidth,
        x1: p.x,
        y1: p.y,
        x2: p.x,
        y2: p.y,
      });
      e.currentTarget.setPointerCapture(e.pointerId);
      return;
    }

    if (tool === "circle") {
      circleStartRef.current = { x: p.x, y: p.y };
      setDraft({
        id: newId(),
        tool: "circle",
        color,
        width: strokeWidth,
        cx: p.x,
        cy: p.y,
        rx: 0,
        ry: 0,
      });
      e.currentTarget.setPointerCapture(e.pointerId);
      return;
    }
  };

  const onPointerMove = (e: ReactPointerEvent<SVGSVGElement>) => {
    updateHover(e.clientX, e.clientY);
    if (!draft) return;
    const p = localPoint(e);

    if (draft.tool === "pen") {
      setDraft({ ...draft, points: [...draft.points, p] });
    } else if (draft.tool === "highlighter" || draft.tool === "arrow") {
      setDraft({ ...draft, x2: p.x, y2: p.y });
    } else if (draft.tool === "circle") {
      // Use the stored start point so the anchor doesn't drift as cx/cy
      // become the running ellipse centre.
      const start = circleStartRef.current ?? { x: draft.cx, y: draft.cy };
      const cx = (start.x + p.x) / 2;
      const cy = (start.y + p.y) / 2;
      const rx = Math.abs(p.x - start.x) / 2;
      const ry = Math.abs(p.y - start.y) / 2;
      setDraft({ ...draft, cx, cy, rx, ry });
    }
  };

  const finishDraft = () => {
    if (!draft) return;
    const isZero =
      (draft.tool === "highlighter" &&
        Math.abs(draft.x2 - draft.x1) < 3 &&
        Math.abs(draft.y2 - draft.y1) < 3) ||
      (draft.tool === "arrow" &&
        Math.hypot(draft.x2 - draft.x1, draft.y2 - draft.y1) < 4) ||
      (draft.tool === "circle" && draft.rx < 4 && draft.ry < 4) ||
      (draft.tool === "pen" && draft.points.length < 2);
    circleStartRef.current = null;
    if (!isZero) {
      commitAnnotations([...annotations, draft]);
    }
    setDraft(null);
  };

  const onPointerUp = () => finishDraft();
  const onPointerLeave = () => {
    finishDraft();
    setHoverPoint(null);
  };

  // Drop the preview whenever the Text tool is put away.
  useEffect(() => {
    if (tool !== "text") setHoverPoint(null);
  }, [tool]);

  const cursor = !interactive ? "default" : tool === "text" ? "text" : "crosshair";

  const colorsInUse = Array.from(
    new Set<string>([color, ...annotations.map((a) => a.color)]),
  );

  return (
    <div
      className="relative rounded-2xl border border-gold-500/30"
      style={{
        background:
          "linear-gradient(180deg, #fbf6e6 0%, #f4e9c5 50%, #fbf6e6 100%)",
        boxShadow:
          "inset 0 0 60px rgba(108,78,28,0.15), 0 14px 40px -20px rgba(0,0,0,0.6)",
        color: "#1f1408",
        minHeight: "60vh",
      }}
    >
      <div
        className="relative px-12 py-12 sm:px-16 sm:py-14"
        style={{ minHeight: "60vh" }}
      >
        <article>
          {promptHeader && (
            <p
              className="mb-2 text-xs uppercase tracking-[0.18em]"
              style={{ color: "#7a5e1d" }}
            >
              {promptHeader}
            </p>
          )}
          {body.split(/\n\n/).map((para, i) => (
            <p
              key={i}
              className="mb-4 text-[15px] leading-7"
              style={{ color: "#1f1408" }}
            >
              {para}
            </p>
          ))}
        </article>
      </div>

      <svg
        ref={svgRef}
        className="absolute inset-0 h-full w-full"
        style={{ cursor, touchAction: "none" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerLeave}
      >
        <defs>
          {colorsInUse.map((c) => (
            <marker
              key={c}
              id={`arrow-${slugColor(c)}`}
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M0,0 L10,5 L0,10 Z" fill={c} />
            </marker>
          ))}
        </defs>

        {/* Text annotations are rendered as HTML below so they can be
            multi-line, dragged, and edited; strokes stay in the SVG. */}
        {annotations.map((a) =>
          a.tool === "text" ? null : <AnnotationView key={a.id} ann={a} />,
        )}
        {draft && <AnnotationView ann={draft} />}
      </svg>

      {/* Dotted preview box that follows the cursor before a box is placed. */}
      {interactive && tool === "text" && hoverPoint && !editingTextId && (
        <div
          aria-hidden
          className="pointer-events-none absolute z-30 rounded"
          style={{
            left: hoverPoint.x,
            top: hoverPoint.y,
            width: TEXT_BOX_W,
            height: TEXT_BOX_H,
            border: `1.5px dashed ${color}`,
            background: "rgba(255,255,255,0.5)",
          }}
        >
          <span
            className="absolute left-1.5 top-1 text-[10px] font-semibold"
            style={{ color }}
          >
            Click to place
          </span>
        </div>
      )}

      {/* Text boxes. While a box is selected/edited it shows a dotted frame you
          drag to move and a corner handle to resize; once you click away the
          frame disappears and only the writing remains. */}
      {annotations
        .filter((a): a is TextAnn => a.tool === "text")
        .map((a) => {
          const editing = interactive && a.id === editingTextId;
          const editable = interactive && tool === "text";
          return (
            <div
              key={`text-${a.id}`}
              className="absolute"
              style={{
                left: a.x,
                top: a.y,
                width: boxW(a),
                height: boxH(a),
                zIndex: editing ? 20 : 10,
                pointerEvents: editing || editable ? "auto" : "none",
              }}
            >
              {editing ? (
                // Dotted frame = the drag handle. Dragging the border moves the
                // box; the inner textarea (which stops propagation) is for
                // writing, so the box stays put while you type.
                <div
                  onPointerDown={(e) => onFramePointerDown(e, a)}
                  onPointerMove={onFramePointerMove}
                  onPointerUp={onFramePointerUp}
                  title="Drag this border to move"
                  className="h-full w-full"
                  style={{
                    boxSizing: "border-box",
                    border: `1.5px dashed ${a.color}`,
                    borderRadius: 4,
                    background: "rgba(255,255,255,0.92)",
                    boxShadow: "0 1px 4px rgba(0,0,0,0.18)",
                    padding: 4,
                    cursor: "move",
                  }}
                >
                  <textarea
                    autoFocus
                    ref={(el) => {
                      editRef.current = el;
                    }}
                    value={a.text}
                    onPointerDown={(e) => e.stopPropagation()}
                    onChange={(e) =>
                      commitAnnotations(
                        annotations.map((x) =>
                          x.id === a.id && x.tool === "text"
                            ? { ...x, text: e.target.value }
                            : x,
                        ),
                      )
                    }
                    onBlur={() => {
                      setEditingTextId((prev) => (prev === a.id ? null : prev));
                      const cleaned = annotations.filter(
                        (x) =>
                          !(x.id === a.id && x.tool === "text" && x.text.trim() === ""),
                      );
                      if (cleaned.length !== annotations.length) commitAnnotations(cleaned);
                    }}
                    onKeyDown={(e) => {
                      // Enter = new line; Escape finishes editing.
                      if (e.key === "Escape") (e.target as HTMLTextAreaElement).blur();
                    }}
                    className="h-full w-full resize-none overflow-auto bg-transparent outline-none"
                    style={{
                      color: a.color,
                      fontSize: a.size,
                      fontWeight: 700,
                      lineHeight: 1.25,
                      cursor: "text",
                    }}
                    placeholder="Type…"
                  />
                </div>
              ) : (
                // Finished box — just the writing, no frame. Click to re-edit.
                <div
                  onPointerDown={(e) => {
                    if (!editable) return;
                    e.stopPropagation();
                    startEditing(a.id);
                  }}
                  className="h-full w-full select-none overflow-hidden"
                  style={{
                    color: a.color,
                    fontSize: a.size,
                    fontWeight: 700,
                    lineHeight: 1.25,
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                    // White halo keeps any ink colour legible on the cream paper
                    // without drawing a visible box.
                    textShadow:
                      "0 0 3px rgba(255,255,255,0.95), 0 0 3px rgba(255,255,255,0.95)",
                    cursor: editable ? "text" : "default",
                  }}
                >
                  {a.text}
                </div>
              )}

              {/* Corner resize handle (only while the box is selected). */}
              {editing && (
                <div
                  onPointerDown={(e) => onResizePointerDown(e, a)}
                  onPointerMove={onResizePointerMove}
                  onPointerUp={onResizePointerUp}
                  title="Drag to resize"
                  className="absolute z-30"
                  style={{
                    right: -6,
                    bottom: -6,
                    width: 13,
                    height: 13,
                    borderRadius: 3,
                    background: a.color,
                    border: "2px solid rgba(255,255,255,0.95)",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
                    cursor: "nwse-resize",
                    touchAction: "none",
                  }}
                />
              )}
            </div>
          );
        })}
    </div>
  );
}

function AnnotationView({ ann }: { ann: Annotation }) {
  if (ann.tool === "pen") {
    const d = ann.points
      .map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
      .join(" ");
    return (
      <path
        d={d}
        fill="none"
        stroke={ann.color}
        strokeWidth={ann.width}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    );
  }

  if (ann.tool === "highlighter") {
    return (
      <line
        x1={ann.x1}
        y1={ann.y1}
        x2={ann.x2}
        y2={ann.y2}
        stroke={ann.color}
        strokeOpacity={HIGHLIGHTER_OPACITY}
        strokeWidth={ann.height}
        strokeLinecap="round"
      />
    );
  }

  if (ann.tool === "arrow") {
    return (
      <line
        x1={ann.x1}
        y1={ann.y1}
        x2={ann.x2}
        y2={ann.y2}
        stroke={ann.color}
        strokeWidth={ann.width}
        strokeLinecap="round"
        markerEnd={`url(#arrow-${slugColor(ann.color)})`}
      />
    );
  }

  if (ann.tool === "circle") {
    return (
      <ellipse
        cx={ann.cx}
        cy={ann.cy}
        rx={ann.rx}
        ry={ann.ry}
        fill="none"
        stroke={ann.color}
        strokeWidth={ann.width}
      />
    );
  }

  if (ann.tool === "text") {
    return (
      <text
        x={ann.x}
        y={ann.y}
        fill={ann.color}
        fontSize={ann.size}
        fontWeight={700}
      >
        {ann.text}
      </text>
    );
  }

  return null;
}
