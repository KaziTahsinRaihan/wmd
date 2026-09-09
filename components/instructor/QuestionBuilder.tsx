"use client";

// Teacher question builder — a blank page in the student panel's exact visual
// language. Teachers paste sections of a paper straight in; typing a question
// number followed by underscores ("12_____") drops the answer box for Q12 in
// place, and the system sequences everything from those numbers. "Special
// type" sections add a picture + customizable option table side by side, plus
// a drag-gap text box and a draggable-option generator (one option per line →
// Generate) — every element individually removable/addable. The student
// preview is hidden until "See student preview" is pressed; it renders the
// REAL student exam components, so what teachers preview is pixel-for-pixel
// what students get.

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useExitGuard } from "@/lib/use-exit-guard";
import ListeningExam, { listeningStorageKey } from "@/components/mock-practice/ListeningExam";
import ReadingExam, { readingStorageKey } from "@/components/mock-practice/ReadingExam";
import WritingExam, { writingStorageKey } from "@/components/mock-practice/WritingExam";
import SpeakingExam from "@/components/mock-practice/SpeakingExam";
import {
  GAP_TOKEN,
  HEADING_TOKEN,
  MODULE_TYPES,
  authoredToListening,
  authoredToReading,
  authoredToSpeaking,
  authoredToWriting,
  groupRanges,
  lines,
  listAuthored,
  listQuestionNumbers,
  newAuthoredTest,
  newGroup,
  parseAnswerKey,
  parseNumberedText,
  parseTableRows,
  pastedSourceText,
  readingPassageAt,
  saveAuthored,
  totalQuestions,
  WRITING_TASK1_TYPES,
  WRITING_TASK2_TYPES,
  type AuthoredGroup,
  type AuthoredModule,
  type AuthoredTest,
  type SpecialElements,
} from "@/lib/authoring";
import { sanitizeHtml, textToHtml } from "@/lib/rich-html";
import { LISTENING_TEMPLATES } from "@/lib/listening-template";
import { READING_TEMPLATES } from "@/lib/reading-template";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Check,
  Eye,
  FileText,
  ImagePlus,
  Music,
  Plus,
  Trash2,
  X,
} from "lucide-react";

const BORDER = "#c9c9c9";
const DEFAULT_ELEMENTS: SpecialElements = { picture: true, table: true, drag: true, options: true };

// ============================================================================
// Small building blocks
// ============================================================================

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

function Label({ children }: { children: React.ReactNode }) {
  return <p className="mb-1 mt-3 text-[13px] font-bold text-[#555]">{children}</p>;
}

function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full rounded border px-2.5 py-1.5 text-[15px] outline-none focus:border-[#1565c0] ${props.className ?? ""}`}
      style={{ borderColor: BORDER, ...props.style }}
    />
  );
}

function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`w-full resize-y rounded border px-2.5 py-1.5 text-[15px] leading-relaxed outline-none focus:border-[#1565c0] ${props.className ?? ""}`}
      style={{ borderColor: BORDER, ...props.style }}
    />
  );
}

function ToolButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded border bg-white px-2.5 py-1 text-[13px] font-medium text-[#1565c0] transition hover:bg-[#eef4fb]"
      style={{ borderColor: "#9ec1e0" }}
    >
      {children}
    </button>
  );
}

/** Move-up / move-down / remove controls on a section header row. */
function SectionControls({ onMove, onRemove }: { onMove: (d: -1 | 1) => void; onRemove: () => void }) {
  return (
    <div className="flex items-center gap-1">
      <button type="button" aria-label="Move up" onClick={() => onMove(-1)} className="rounded p-1 text-[#999] hover:bg-[#f0f0f0]">
        <ArrowUp className="h-4 w-4" />
      </button>
      <button type="button" aria-label="Move down" onClick={() => onMove(1)} className="rounded p-1 text-[#999] hover:bg-[#f0f0f0]">
        <ArrowDown className="h-4 w-4" />
      </button>
      <button type="button" aria-label="Remove section" onClick={onRemove} className="rounded p-1 text-[#c26066] hover:bg-[#fbeae9]">
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}

/** Blank-exam-style instructions line: looks like plain page text until focused. */
function InstructionsInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Add the instructions shown to the student…"
      className="mt-1 w-full rounded border border-transparent px-1 py-0.5 text-[16px] leading-relaxed outline-none placeholder:italic placeholder:text-[#aaa] hover:border-[#e6e6e6] focus:border-[#1565c0]"
    />
  );
}

function rangeLabel(range: [number, number]): string {
  if (range[1] < range[0]) return "—";
  return range[0] === range[1] ? String(range[0]) : `${range[0]}–${range[1]}`;
}

/** Which part a section belongs to (listening 1–4, reading 1–3). */
function PartSelect({
  value,
  onChange,
  count = 4,
}: {
  value: number;
  onChange: (n: number) => void;
  count?: number;
}) {
  return (
    <label className="flex items-center gap-1.5 text-[13px] font-bold text-[#555]">
      Part
      <select
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="rounded border bg-white px-1.5 py-0.5 text-[13px] font-normal"
        style={{ borderColor: BORDER }}
        aria-label="Part"
      >
        {Array.from({ length: count }, (_, i) => i + 1).map((n) => (
          <option key={n} value={n}>
            {n}
          </option>
        ))}
      </select>
    </label>
  );
}

/** Speaking Part 2 cue card — rich paste (bold, lists, indentation kept). */
function CueCardEditor({ html, onChange }: { html?: string; onChange: (html: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.innerHTML = html?.trim() ? sanitizeHtml(html) : "";
    // Seed once on mount only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const store = () => {
    if (ref.current) onChange(sanitizeHtml(ref.current.innerHTML));
  };
  return (
    <div
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      onInput={store}
      onBlur={store}
      onPaste={(e) => {
        const h = e.clipboardData.getData("text/html");
        const t = e.clipboardData.getData("text/plain");
        if (!h && !t) return;
        e.preventDefault();
        document.execCommand("insertHTML", false, h ? sanitizeHtml(h) : textToHtml(t));
        store();
      }}
      data-placeholder={
        "Paste or type the cue card here — formatting is kept.\nFirst line: the topic. Then “You should say:” with its points."
      }
      className="pasted-rich mt-3 min-h-[160px] w-full max-w-[560px] rounded border-2 border-dashed p-4 text-[16px] leading-relaxed outline-none focus:border-solid focus:border-[#1565c0]"
      style={{ borderColor: "#d9d9d9" }}
    />
  );
}

// ============================================================================
// Listening v2 — pasted section
// ============================================================================

function PastedSection({
  g,
  range,
  onChange,
  onMove,
  onRemove,
  partControl,
}: {
  g: AuthoredGroup;
  range: [number, number];
  onChange: (p: Partial<AuthoredGroup>) => void;
  onMove: (d: -1 | 1) => void;
  onRemove: () => void;
  partControl?: React.ReactNode;
}) {
  const numbers = parseNumberedText(pastedSourceText(g)).numbers;
  const editorRef = useRef<HTMLDivElement>(null);

  // Uncontrolled rich editor: seed the DOM once (per section), then only read
  // from it — React never rewrites the content, so the caret stays put.
  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    el.innerHTML = g.html?.trim() ? sanitizeHtml(g.html) : textToHtml(g.text);
    // Seed once on mount only; `g` changes must not reset the editor.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const store = () => {
    const el = editorRef.current;
    if (!el) return;
    onChange({ html: sanitizeHtml(el.innerHTML) });
  };

  return (
    <section className="mt-8">
      <div className="flex items-center justify-between">
        <h3 className="text-[17px] font-bold">Questions {rangeLabel(range)}</h3>
        <div className="flex items-center gap-3">
          {partControl}
          <SectionControls onMove={onMove} onRemove={onRemove} />
        </div>
      </div>
      <InstructionsInput value={g.instructions} onChange={(instructions) => onChange({ instructions })} />
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={store}
        onBlur={store}
        onPaste={(e) => {
          // Keep the pasted formatting (bold, fonts, indentation, tables with
          // merged cells) but strip everything unsafe before it enters the DOM.
          const htmlData = e.clipboardData.getData("text/html");
          const textData = e.clipboardData.getData("text/plain");
          if (!htmlData && !textData) return;
          e.preventDefault();
          const clean = htmlData ? sanitizeHtml(htmlData) : textToHtml(textData);
          document.execCommand("insertHTML", false, clean);
          store();
        }}
        data-placeholder={
          "Paste this section here exactly as in the paper — formatting (bold, fonts, indentation, tables) is kept. Type the question number followed by underscores where an answer box belongs, e.g. 12_____"
        }
        className="pasted-rich mt-3 min-h-[140px] w-full rounded border-2 border-dashed p-3 text-[16px] leading-[1.9] outline-none focus:border-solid focus:border-[#1565c0]"
        style={{ borderColor: "#d9d9d9" }}
      />
      <p className="mt-1 text-[12px] text-[#999]">
        {numbers.length > 0
          ? `Answer boxes detected: ${numbers.join(", ")}`
          : "No answer boxes yet — write them as 12_____ (number + underscores)."}
      </p>
    </section>
  );
}

// ============================================================================
// Listening v2 — special type section
// ============================================================================

function ElementBox({
  title,
  onRemove,
  children,
}: {
  title: string;
  onRemove: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border-2 border-dashed p-3" style={{ borderColor: "#d9d9d9" }}>
      <div className="mb-2 flex items-center justify-between">
        <p className="text-[13px] font-bold text-[#555]">{title}</p>
        <button type="button" aria-label={`Remove ${title}`} onClick={onRemove} className="rounded p-0.5 text-[#c26066] hover:bg-[#fbeae9]">
          <X className="h-4 w-4" />
        </button>
      </div>
      {children}
    </div>
  );
}

function SpecialSection({
  g,
  range,
  onChange,
  onMove,
  onRemove,
  partControl,
}: {
  g: AuthoredGroup;
  range: [number, number];
  onChange: (p: Partial<AuthoredGroup>) => void;
  onMove: (d: -1 | 1) => void;
  onRemove: () => void;
  partControl?: React.ReactNode;
}) {
  const el = g.elements ?? DEFAULT_ELEMENTS;
  const setEl = (k: keyof SpecialElements, v: boolean) => onChange({ elements: { ...el, [k]: v } });
  const fileRef = useRef<HTMLInputElement>(null);
  const [newOption, setNewOption] = useState("");
  const dragNums = parseNumberedText(g.dragText).numbers;
  const tableInfo = parseTableRows(g.rows);
  const missing = (Object.keys(DEFAULT_ELEMENTS) as (keyof SpecialElements)[]).filter((k) => !el[k]);

  return (
    <section className="mt-8">
      <div className="flex items-center justify-between">
        <h3 className="text-[17px] font-bold">Questions {rangeLabel(range)}</h3>
        <div className="flex items-center gap-2">
          {missing.map((k) => (
            <ToolButton key={k} onClick={() => setEl(k, true)}>
              <Plus className="h-3.5 w-3.5" />
              Add {k === "picture" ? "picture" : k === "table" ? "option table" : k === "drag" ? "drag gaps" : "options"}
            </ToolButton>
          ))}
          {partControl}
          <SectionControls onMove={onMove} onRemove={onRemove} />
        </div>
      </div>
      <InstructionsInput value={g.instructions} onChange={(instructions) => onChange({ instructions })} />

      {(el.picture || el.table) && (
        <div className={`mt-3 grid gap-4 ${el.picture && el.table ? "md:grid-cols-2" : ""}`}>
          {el.picture && (
            <ElementBox title="Picture" onRemove={() => { setEl("picture", false); onChange({ image: undefined, elements: { ...el, picture: false } }); }}>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (f) onChange({ image: await readFileAsDataUrl(f) });
                }}
              />
              {g.image ? (
                <div>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={g.image} alt="" className="max-h-52 w-auto max-w-full rounded border" style={{ borderColor: BORDER }} />
                  <div className="mt-2 flex gap-2">
                    <ToolButton onClick={() => fileRef.current?.click()}>Replace</ToolButton>
                    <button type="button" onClick={() => onChange({ image: undefined })} className="text-[13px] text-[#c26066] hover:underline">
                      Remove picture
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="grid h-36 w-full place-items-center rounded border-2 border-dashed text-[#999] transition hover:border-[#9ec1e0] hover:text-[#1565c0]"
                  style={{ borderColor: "#d9d9d9" }}
                >
                  <span className="flex items-center gap-2 text-[14px]">
                    <ImagePlus className="h-5 w-5" /> Add picture from computer
                  </span>
                </button>
              )}
            </ElementBox>
          )}
          {el.table && (
            <ElementBox title="Option selection table" onRemove={() => onChange({ rows: undefined, elements: { ...el, table: false } })}>
              <div className="grid grid-cols-[1fr_90px] gap-3">
                <div>
                  <p className="mb-1 text-[12px] text-[#888]">Rows — start each with its question number</p>
                  <TextArea
                    rows={5}
                    value={g.rows ?? ""}
                    onChange={(e) => onChange({ rows: e.target.value })}
                    placeholder={"16 Farm shop\n17 Disabled entry\n18 Adventure playground"}
                  />
                </div>
                <div>
                  <p className="mb-1 text-[12px] text-[#888]">Columns</p>
                  <TextArea rows={5} value={g.cols ?? ""} onChange={(e) => onChange({ cols: e.target.value })} />
                </div>
              </div>
              {tableInfo.labels.length > 0 && tableInfo.start === null && (
                <p className="mt-1 text-[12px] text-[#c26066]">Tip: begin the first row with its question number (e.g. “16 Farm shop”).</p>
              )}
            </ElementBox>
          )}
        </div>
      )}

      {(el.drag || el.options) && (
        <div className={`mt-4 grid gap-4 ${el.drag && el.options ? "md:grid-cols-2" : ""}`}>
          {el.drag && (
            <ElementBox title="Text with draggable answer placeholders" onRemove={() => onChange({ dragText: undefined, elements: { ...el, drag: false } })}>
              <textarea
                value={g.dragText ?? ""}
                onChange={(e) => onChange({ dragText: e.target.value })}
                rows={5}
                placeholder={`Paste the text here — “16_____” becomes the drop box for question 16.`}
                className="w-full resize-y rounded border p-2.5 text-[15px] leading-[1.9] outline-none focus:border-[#1565c0]"
                style={{ borderColor: BORDER }}
              />
              <p className="mt-1 text-[12px] text-[#999]">
                {dragNums.length > 0 ? `Drop boxes detected: ${dragNums.join(", ")}` : "No drop boxes yet — write them as 16_____."}
              </p>
            </ElementBox>
          )}
          {el.options && (
            <ElementBox title="Draggable options" onRemove={() => onChange({ optionsRaw: undefined, optionsList: undefined, elements: { ...el, options: false } })}>
              <TextArea
                rows={4}
                value={g.optionsRaw ?? ""}
                onChange={(e) => onChange({ optionsRaw: e.target.value })}
                placeholder={"Paste the options —\none per line — then press Generate."}
              />
              <div className="mt-2">
                <ToolButton onClick={() => onChange({ optionsList: lines(g.optionsRaw) })}>Generate options</ToolButton>
              </div>
              {(g.optionsList ?? []).length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {(g.optionsList ?? []).map((o) => (
                    <span key={o} className="inline-flex items-center gap-1.5 rounded-[6px] border px-3 py-1 font-bold" style={{ borderColor: "#9a9a9a" }}>
                      {o}
                      <button
                        type="button"
                        aria-label={`Remove option ${o}`}
                        onClick={() => onChange({ optionsList: (g.optionsList ?? []).filter((x) => x !== o) })}
                        className="text-[#c26066]"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <div className="mt-2 flex gap-2">
                <input
                  value={newOption}
                  onChange={(e) => setNewOption(e.target.value)}
                  placeholder="Add one option…"
                  className="flex-1 rounded border px-2 py-1 text-[13px] outline-none focus:border-[#1565c0]"
                  style={{ borderColor: BORDER }}
                />
                <ToolButton
                  onClick={() => {
                    const v = newOption.trim();
                    if (v) onChange({ optionsList: [...(g.optionsList ?? []), v] });
                    setNewOption("");
                  }}
                >
                  <Plus className="h-3.5 w-3.5" /> Add
                </ToolButton>
              </div>
            </ElementBox>
          )}
        </div>
      )}
    </section>
  );
}

// ============================================================================
// Reading (v1) — legacy section editor, kept until reading gets the v2 flow
// ============================================================================

function GapTextarea({
  value,
  onChange,
  rows = 6,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  placeholder?: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const insert = (token: string) => {
    const el = ref.current;
    const pos = el ? el.selectionStart : value.length;
    onChange(value.slice(0, pos) + token + value.slice(el ? el.selectionEnd : pos));
    requestAnimationFrame(() => el?.focus());
  };
  return (
    <div>
      <div className="mb-1.5 flex flex-wrap gap-2">
        <ToolButton onClick={() => insert(GAP_TOKEN)}>
          <Plus className="h-3.5 w-3.5" /> Add answer placeholder
        </ToolButton>
      </div>
      <textarea
        ref={ref}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        placeholder={placeholder}
        className="w-full resize-y rounded border px-2.5 py-1.5 text-[15px] leading-relaxed outline-none focus:border-[#1565c0]"
        style={{ borderColor: BORDER }}
      />
    </div>
  );
}

function ReadingGroupEditor({
  g,
  range,
  onChange,
  onRemove,
  onMove,
  typeLabel,
  partControl,
}: {
  g: AuthoredGroup;
  range: [number, number];
  onChange: (patch: Partial<AuthoredGroup>) => void;
  onRemove: () => void;
  onMove: (dir: -1 | 1) => void;
  typeLabel: string;
  partControl?: React.ReactNode;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  return (
    <div className="rounded-lg border bg-white p-4" style={{ borderColor: BORDER }}>
      <div className="flex items-center justify-between gap-3">
        <p className="font-bold">
          {typeLabel}{" "}
          <span className="font-normal text-[#666]">— Questions {rangeLabel(range)}</span>
        </p>
        <div className="flex items-center gap-3">
          {partControl}
          <SectionControls onMove={onMove} onRemove={onRemove} />
        </div>
      </div>

      <Label>Instructions (shown to the student)</Label>
      <TextArea rows={2} value={g.instructions} onChange={(e) => onChange({ instructions: e.target.value })} placeholder="e.g. Complete the notes. Write ONE WORD ONLY for each answer." />

      {(g.type === "gap-text" || g.type === "drag-text" || g.type === "picture" || g.type === "flowchart") && (
        <>
          <Label>Title (optional)</Label>
          <TextInput value={g.title ?? ""} onChange={(e) => onChange({ title: e.target.value })} />
        </>
      )}

      {(g.type === "gap-text" || g.type === "drag-text" || g.type === "picture") && (
        <>
          {g.type === "picture" && (
            <>
              <Label>Picture (from your computer)</Label>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (f) onChange({ image: await readFileAsDataUrl(f) });
                }}
              />
              <div className="flex items-center gap-3">
                <ToolButton onClick={() => fileRef.current?.click()}>
                  <ImagePlus className="h-3.5 w-3.5" /> {g.image ? "Replace picture" : "Add picture"}
                </ToolButton>
                {g.image && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={g.image} alt="" className="h-14 w-auto rounded border" style={{ borderColor: BORDER }} />
                )}
              </div>
            </>
          )}
          <Label>Question text — paste in plain text, then insert placeholders</Label>
          <GapTextarea value={g.text ?? ""} onChange={(text) => onChange({ text })} rows={7} placeholder="Paste the question text, then click “Add answer placeholder”." />
          {(g.type === "drag-text" || g.type === "picture") && (
            <>
              <Label>Draggable options — one per line (shown bold)</Label>
              <TextArea rows={4} value={g.options ?? ""} onChange={(e) => onChange({ options: e.target.value })} />
            </>
          )}
        </>
      )}

      {g.type === "mcq" && (
        <>
          <Label>Question type</Label>
          <select
            value={g.variant}
            onChange={(e) => onChange({ variant: e.target.value as AuthoredGroup["variant"] })}
            className="rounded border px-2 py-1.5 text-[14px]"
            style={{ borderColor: BORDER }}
            aria-label="MCQ variant"
          >
            <option value="single">Single answer (circle options)</option>
            <option value="double">Double answer — choose TWO (rectangular options)</option>
            <option value="tfng">TRUE / FALSE / NOT GIVEN</option>
            <option value="ynng">YES / NO / NOT GIVEN</option>
          </select>
          <div className="mt-2 space-y-4">
            {(g.questions ?? []).map((q, qi) => (
              <div key={qi} className="rounded border p-3" style={{ borderColor: "#e2e2e2" }}>
                <div className="flex items-center justify-between">
                  <p className="text-[13px] font-bold text-[#555]">
                    {g.variant === "tfng" || g.variant === "ynng" ? "Statement" : "Question"} {qi + 1}
                  </p>
                  <button
                    type="button"
                    aria-label="Remove question"
                    onClick={() => onChange({ questions: (g.questions ?? []).filter((_, i) => i !== qi) })}
                    className="rounded p-1 text-[#c26066] hover:bg-[#fbeae9]"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                <TextInput
                  value={q.stem}
                  onChange={(e) => onChange({ questions: (g.questions ?? []).map((x, i) => (i === qi ? { ...x, stem: e.target.value } : x)) })}
                  placeholder={g.variant === "tfng" || g.variant === "ynng" ? "Statement text…" : "Question text…"}
                />
                {g.variant !== "tfng" && g.variant !== "ynng" && (
                  <>
                    <Label>Options — paste one per line</Label>
                    <TextArea
                      rows={4}
                      value={q.options}
                      onChange={(e) => onChange({ questions: (g.questions ?? []).map((x, i) => (i === qi ? { ...x, options: e.target.value } : x)) })}
                    />
                  </>
                )}
              </div>
            ))}
          </div>
          <div className="mt-2">
            <ToolButton onClick={() => onChange({ questions: [...(g.questions ?? []), { stem: "", options: "" }] })}>
              <Plus className="h-3.5 w-3.5" /> Add {g.variant === "tfng" || g.variant === "ynng" ? "statement" : "question"}
            </ToolButton>
          </div>
        </>
      )}

      {g.type === "table" && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>Rows — one per line (each row is one question)</Label>
            <TextArea rows={6} value={g.rows ?? ""} onChange={(e) => onChange({ rows: e.target.value })} />
          </div>
          <div>
            <Label>Columns — one letter per line</Label>
            <TextArea rows={6} value={g.cols ?? ""} onChange={(e) => onChange({ cols: e.target.value })} />
          </div>
        </div>
      )}

      {g.type === "flowchart" && (
        <>
          <Label>Flowchart boxes (top to bottom)</Label>
          <div className="space-y-3">
            {(g.steps ?? []).map((step, si) => (
              <div key={si} className="rounded border p-3" style={{ borderColor: "#e2e2e2" }}>
                <div className="flex items-center justify-between">
                  <p className="text-[13px] font-bold text-[#555]">Box {si + 1}</p>
                  <button
                    type="button"
                    aria-label="Remove box"
                    onClick={() => onChange({ steps: (g.steps ?? []).filter((_, i) => i !== si) })}
                    className="rounded p-1 text-[#c26066] hover:bg-[#fbeae9]"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                <GapTextarea value={step} onChange={(v) => onChange({ steps: (g.steps ?? []).map((x, i) => (i === si ? v : x)) })} rows={2} />
              </div>
            ))}
          </div>
          <div className="mt-2">
            <ToolButton onClick={() => onChange({ steps: [...(g.steps ?? []), ""] })}>
              <Plus className="h-3.5 w-3.5" /> Add box
            </ToolButton>
          </div>
          <Label>Draggable options — one per line (shown bold)</Label>
          <TextArea rows={4} value={g.options ?? ""} onChange={(e) => onChange({ options: e.target.value })} />
        </>
      )}

      {g.type === "headings" && (
        <>
          <Label>List of Headings — one per line (shown bold)</Label>
          <TextArea rows={6} value={g.options ?? ""} onChange={(e) => onChange({ options: e.target.value })} />
          <p className="mt-2 text-[13px] text-[#888]">
            Use “Insert wide answer placeholder” in the passage editor above to place the gaps on top of paragraphs.
          </p>
        </>
      )}
    </div>
  );
}

// ============================================================================
// Answers step (listening & reading)
// ============================================================================

function AnswersEditor({ test, patch }: { test: AuthoredTest; patch: (p: Partial<AuthoredTest>) => void }) {
  const nums = listQuestionNumbers(test);
  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-white p-4" style={{ borderColor: BORDER }}>
        <p className="font-bold">Answer key</p>
        <p className="mt-1 text-[13px] text-[#666]">
          One line per question, in order ({nums.join(", ") || "—"}). If several answers are
          accepted, separate them with a slash — e.g. <b>2 years / two years</b>. The system checks
          students&apos; answers against every alternative.
        </p>
        <TextArea
          rows={Math.min(Math.max(nums.length, 4), 16)}
          value={test.answersRaw ?? ""}
          onChange={(e) => patch({ answersRaw: e.target.value })}
          placeholder={nums.slice(0, 4).map((n) => `Answer for question ${n}`).join("\n")}
          className="mt-3 font-mono"
        />
      </div>

      {test.module === "listening" && !test.audio && (
        <p className="rounded-lg border border-dashed p-3 text-[13px] text-[#c26066]" style={{ borderColor: BORDER }}>
          No audio attached yet — add it at the top of the questions page.
        </p>
      )}
    </div>
  );
}

// ============================================================================
// Main builder
// ============================================================================

export default function QuestionBuilder() {
  const router = useRouter();
  const search = useSearchParams();
  const editId = search.get("edit");

  const [test, setTest] = useState<AuthoredTest>(() => newAuthoredTest("listening"));
  const [loadingEdit, setLoadingEdit] = useState(!!editId);
  const [dirty, setDirty] = useState(false);
  const [view, setView] = useState<"build" | "answers">("build");
  const [addType, setAddType] = useState<string>(MODULE_TYPES.listening[0].key);
  const [quitOpen, setQuitOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewNonce, setPreviewNonce] = useState(0);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!editId) return;
    listAuthored()
      .then((items) => {
        const found = items.find((q) => q.id === editId);
        if (found) setTest({ ...found.payload.test, id: found.id });
      })
      .catch(() => setMessage("Could not load the question for editing."))
      .finally(() => setLoadingEdit(false));
  }, [editId]);

  const patch = useCallback((p: Partial<AuthoredTest>) => {
    setTest((t) => ({ ...t, ...p }));
    setDirty(true);
  }, []);

  const patchGroup = useCallback((id: string, p: Partial<AuthoredGroup>) => {
    setTest((t) => ({ ...t, groups: t.groups.map((g) => (g.id === id ? { ...g, ...p } : g)) }));
    setDirty(true);
  }, []);

  const exit = useCallback(() => router.push("/instructor/question-bank"), [router]);
  useExitGuard(dirty && !quitOpen && !previewOpen, () => setQuitOpen(true));

  const ranges = groupRanges(test);
  const nums = listQuestionNumbers(test);
  const typeOptions = MODULE_TYPES[test.module];
  const typeLabel = (g: AuthoredGroup) =>
    (
      typeOptions.find(
        (x) => x.type === g.type && (!x.preset?.variant || x.preset.variant === g.variant),
      ) ?? typeOptions.find((x) => x.type === g.type)
    )?.label ?? g.type;

  const doSave = async (status: "draft" | "published") => {
    setSaving(true);
    setMessage(null);
    try {
      const saved = await saveAuthored({ ...test, status });
      setTest((t) => ({ ...t, id: saved.id, status }));
      setDirty(false);
      return true;
    } catch (e) {
      setMessage(`Save failed: ${(e as Error).message}`);
      return false;
    } finally {
      setSaving(false);
    }
  };

  const moduleTemplates =
    test.module === "reading" ? READING_TEMPLATES : test.module === "listening" ? LISTENING_TEMPLATES : [];
  const [templateId, setTemplateId] = useState(LISTENING_TEMPLATES[0].id);

  const loadTemplate = () => {
    const tpl = moduleTemplates.find((x) => x.id === templateId) ?? moduleTemplates[0];
    if (!tpl) return;
    const hasContent = test.groups.some(
      (g) =>
        (g.text ?? "").trim() ||
        (g.html ?? "").trim() ||
        (g.dragText ?? "").trim() ||
        (g.questions ?? []).some((q) => q.stem.trim()),
    );
    if (hasContent && !window.confirm(`Replace the current sections with “${tpl.label}”?`)) return;
    setTest((t) => ({
      ...tpl.test,
      id: t.id,
      status: t.status,
      name: t.name.trim() ? t.name : tpl.test.name,
      groups: tpl.test.groups.map((g, i) => ({
        ...g,
        id: `g-${Date.now()}-${i}`,
        questions: g.questions?.map((q) => ({ ...q })),
      })),
    }));
    setDirty(true);
    setView("build");
  };

  const openPreview = () => {
    // Fresh preview every time: drop the preview-user's saved answers.
    const id = `authored-${test.id ?? "new"}`;
    try {
      window.localStorage.removeItem(listeningStorageKey("teacher-preview", id));
      window.localStorage.removeItem(readingStorageKey("teacher-preview", id));
      window.localStorage.removeItem(writingStorageKey("teacher-preview", id));
    } catch {}
    setPreviewNonce((n) => n + 1);
    setPreviewOpen(true);
  };

  /** Reading: update one part's passage (writes the 3-slot passages array). */
  const patchPassage = (pn: number, p: { title?: string; passage?: string }) => {
    setTest((t) => {
      const arr = [0, 1, 2].map((i) => ({
        title: t.readingPassages?.[i]?.title ?? (i === 0 ? (t.passageTitle ?? "") : ""),
        passage: t.readingPassages?.[i]?.passage ?? (i === 0 ? (t.passage ?? "") : ""),
      }));
      arr[pn - 1] = { ...arr[pn - 1], ...p };
      return { ...t, readingPassages: arr };
    });
    setDirty(true);
  };

  // Sections display (and number) in part order, so moves operate on the
  // part-sorted order and that order becomes canonical.
  const moveGroup = (id: string, dir: -1 | 1) => {
    setTest((t) => {
      const sorted = [...t.groups].sort((a, b) => (a.part ?? 1) - (b.part ?? 1));
      const i = sorted.findIndex((g) => g.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= sorted.length) return t;
      [sorted[i], sorted[j]] = [sorted[j], sorted[i]];
      return { ...t, groups: sorted };
    });
    setDirty(true);
  };
  const removeGroup = (id: string) => {
    setTest((t) => ({ ...t, groups: t.groups.filter((g) => g.id !== id) }));
    setDirty(true);
  };

  if (loadingEdit) {
    return (
      <div className="exam-surface fixed inset-0 z-[300] grid place-items-center bg-white text-[#1f1f1f]" style={{ fontFamily: "Arial, Helvetica, sans-serif" }}>
        Loading question…
      </div>
    );
  }

  return (
    <div
      className="exam-surface fixed inset-0 z-[300] flex flex-col bg-white text-[#1f1f1f]"
      style={{ fontFamily: "Arial, Helvetica, sans-serif", colorScheme: "light" }}
    >
      {/* ============================ Header ============================ */}
      <header className="flex items-center justify-between border-b px-5 py-2.5" style={{ borderColor: BORDER }}>
        <div className="flex items-center gap-4">
          <button type="button" aria-label="Back" onClick={() => (dirty ? setQuitOpen(true) : exit())} className="rounded p-1.5 hover:bg-[#f0f0f0]">
            <ArrowLeft className="h-6 w-6" />
          </button>
          <span className="select-none text-[26px] font-black leading-none tracking-tight text-[#E31837]">
            IELTS<sup className="align-super text-[10px] font-bold">™</sup>
          </span>
          <div>
            <p className="text-[15px] font-bold leading-tight">Question builder</p>
            <p className="text-[12px] leading-tight text-[#666]">Teacher panel — the student preview is the real student interface</p>
          </div>
        </div>
        <div className="flex items-center gap-3 text-[14px]">
          {message && <span className="text-[#b3261e]">{message}</span>}
          <span className={`rounded-full px-2.5 py-0.5 text-[12px] font-bold ${test.status === "published" ? "bg-[#e2f3e6] text-[#2f9e44]" : "bg-[#f0f0f0] text-[#666]"}`}>
            {test.status === "published" ? "Published" : "Draft"}
          </span>
        </div>
      </header>

      {/* ====================== Functionalities bar ===================== */}
      <div className="flex flex-wrap items-center gap-3 border-b bg-[#fafafa] px-5 py-2.5 text-[14px]" style={{ borderColor: BORDER }}>
        <label className="flex items-center gap-2">
          <span className="font-bold">Module</span>
          <select
            value={test.module}
            onChange={(e) => {
              const module = e.target.value as AuthoredModule;
              setTest((t) => ({ ...newAuthoredTest(module), name: t.name, id: t.id, status: t.status }));
              setDirty(true);
              setAddType(MODULE_TYPES[module][0]?.key ?? "notes");
              setTemplateId(
                (module === "reading" ? READING_TEMPLATES : LISTENING_TEMPLATES)[0]?.id ?? "",
              );
              setView("build");
            }}
            className="rounded border px-2 py-1.5"
            style={{ borderColor: BORDER }}
            aria-label="Module"
          >
            <option value="listening">Listening</option>
            <option value="reading">Reading</option>
            <option value="writing">Writing</option>
            <option value="speaking">Speaking</option>
          </select>
        </label>

        <label className="flex min-w-[200px] flex-1 items-center gap-2">
          <span className="font-bold">Name</span>
          <TextInput value={test.name} onChange={(e) => patch({ name: e.target.value })} placeholder="e.g. Holiday camp — matching & map" />
        </label>

        {test.module === "speaking" ? null : test.module === "writing" ? (
          <label className="flex items-center gap-2">
            <span className="font-bold">Format</span>
            <select
              value={test.writingFormat}
              onChange={(e) => patch({ writingFormat: e.target.value as "computer" | "paper" })}
              className="rounded border px-2 py-1.5"
              style={{ borderColor: BORDER }}
              aria-label="Writing format"
            >
              <option value="computer">Writing on Computer</option>
              <option value="paper">Writing on Paper</option>
            </select>
          </label>
        ) : (
          <>
            <label className="flex items-center gap-2">
              <span className="font-bold">Question type</span>
              <select
                value={addType}
                onChange={(e) => setAddType(e.target.value)}
                className="max-w-[320px] rounded border px-2 py-1.5"
                style={{ borderColor: BORDER }}
                aria-label="Question type"
              >
                {typeOptions.map((t) => (
                  <option key={t.key} value={t.key}>
                    {t.label}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={() => {
                setTest((t) => {
                  const entry =
                    typeOptions.find((x) => x.key === addType) ?? typeOptions[0];
                  if (!entry) return t;
                  const g: AuthoredGroup = {
                    ...newGroup(entry.type),
                    ...(entry.preset ? (JSON.parse(JSON.stringify(entry.preset)) as Partial<AuthoredGroup>) : {}),
                  };
                  // New sections join the same part as the last one.
                  if (t.module !== "writing" && t.groups.length) {
                    g.part = t.groups[t.groups.length - 1].part ?? 1;
                  }
                  return { ...t, groups: [...t.groups, g] };
                });
                setDirty(true);
              }}
              className="inline-flex items-center gap-1.5 rounded bg-[#1f1f1f] px-3 py-1.5 font-medium text-white hover:bg-black"
            >
              <Plus className="h-4 w-4" /> Add section
            </button>
            {moduleTemplates.length > 0 && (
              <div className="flex items-center gap-0">
                <label className="flex items-center">
                  <span className="sr-only">Full-test template</span>
                  <select
                    value={templateId}
                    onChange={(e) => setTemplateId(e.target.value)}
                    className="max-w-[280px] rounded-l border bg-white px-2 py-1.5 text-[#1565c0]"
                    style={{ borderColor: "#9ec1e0" }}
                    aria-label="Full-test template"
                  >
                    {moduleTemplates.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  type="button"
                  onClick={loadTemplate}
                  title="Loads a complete 40-question sample test (with answer key) that you can edit"
                  className="inline-flex items-center gap-1.5 rounded-r border border-l-0 bg-white px-3 py-1.5 font-bold text-[#1565c0] transition hover:bg-[#eef4fb]"
                  style={{ borderColor: "#9ec1e0" }}
                >
                  <FileText className="h-4 w-4" /> Load full test
                </button>
              </div>
            )}
          </>
        )}

        <button
          type="button"
          onClick={openPreview}
          className="inline-flex items-center gap-1.5 rounded border bg-white px-3 py-1.5 font-bold text-[#1565c0] transition hover:bg-[#eef4fb]"
          style={{ borderColor: "#9ec1e0" }}
        >
          <Eye className="h-4 w-4" /> See student preview
        </button>
      </div>

      {/* ============================= Body ============================= */}
      <div className="scrollbar-none min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-[1050px] px-6 pb-24 pt-4">
          {view === "answers" ? (
            <AnswersEditor test={test} patch={patch} />
          ) : test.module === "listening" ? (
            <>
              {/* Audio comes first — before the Part 1 questions. */}
              <div className="mb-5 mt-2 rounded-lg border bg-white p-4" style={{ borderColor: BORDER }}>
                <p className="font-bold">Audio recording</p>
                <p className="mt-1 text-[13px] text-[#666]">
                  Add the recording students will hear, then build the questions below.
                </p>
                <input
                  type="file"
                  accept="audio/*"
                  className="mt-3"
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    if (f) patch({ audio: await readFileAsDataUrl(f) });
                  }}
                />
                {test.audio ? (
                  <p className="mt-2 flex items-center gap-2 text-[13px] text-[#2f9e44]">
                    <Music className="h-4 w-4" /> Audio attached
                    <button type="button" onClick={() => patch({ audio: undefined })} className="text-[#c26066] hover:underline">
                      remove
                    </button>
                  </p>
                ) : (
                  <p className="mt-2 text-[13px] text-[#c26066]">No audio yet — students will see a silent test.</p>
                )}
              </div>
              {[1, 2, 3, 4].map((pn) => {
                const inPart = ranges
                  .map((r, gi) => ({ ...r, gi }))
                  .filter(({ group }) => (group.part ?? 1) === pn);
                if (inPart.length === 0) return null;
                const partNums = inPart.flatMap(({ range }) =>
                  range[1] >= range[0] ? [range[0], range[1]] : [],
                );
                return (
                  <div key={pn} className="mt-6 first:mt-0">
                    <div className="rounded border px-4 py-1.5" style={{ background: "#f0f0ea", borderColor: BORDER }}>
                      <p className="font-bold">Part {pn}</p>
                      <p>
                        {partNums.length > 0
                          ? `Listen and answer questions ${Math.min(...partNums)}–${Math.max(...partNums)}.`
                          : "Listen and answer the questions."}
                      </p>
                    </div>
                    {inPart.map(({ group, range, gi }) => {
                      const partControl = (
                        <PartSelect value={group.part ?? 1} onChange={(part) => patchGroup(group.id, { part })} />
                      );
                      return group.type === "special" ? (
                        <SpecialSection
                          key={group.id}
                          g={group}
                          range={range}
                          partControl={partControl}
                          onChange={(p) => patchGroup(group.id, p)}
                          onMove={(d) => moveGroup(group.id, d)}
                          onRemove={() => removeGroup(group.id)}
                        />
                      ) : group.type === "pasted" ? (
                        <PastedSection
                          key={group.id}
                          g={group}
                          range={range}
                          partControl={partControl}
                          onChange={(p) => patchGroup(group.id, p)}
                          onMove={(d) => moveGroup(group.id, d)}
                          onRemove={() => removeGroup(group.id)}
                        />
                      ) : (
                        /* MCQ / matching sections reuse the standard editor. */
                        <div key={group.id} className="mt-8">
                          <ReadingGroupEditor
                            g={group}
                            range={range}
                            typeLabel={typeLabel(group)}
                            partControl={partControl}
                            onChange={(p) => patchGroup(group.id, p)}
                            onRemove={() => removeGroup(group.id)}
                            onMove={(d) => moveGroup(group.id, d)}
                          />
                        </div>
                      );
                    })}
                  </div>
                );
              })}
              {ranges.length === 0 && (
                <p className="mt-10 rounded-lg border-2 border-dashed p-8 text-center text-[#999]" style={{ borderColor: "#d9d9d9" }}>
                  Add a section above to start pasting the paper in.
                </p>
              )}
            </>
          ) : test.module === "speaking" ? (
            <>
              {/* ---------------------- Part 1 — Introduction ---------------------- */}
              <div className="mt-2">
                <div className="rounded border px-4 py-1.5" style={{ background: "#f0f0ea", borderColor: BORDER }}>
                  <p className="font-bold">Part 1 — Introduction</p>
                  <p>Questions about familiar topics, asked one at a time. Topic 2 is optional.</p>
                </div>
                {[1, 2].map((tn) => {
                  const topic = tn === 1 ? test.speaking?.topic1 : test.speaking?.topic2;
                  const patchSpeaking = (p: Partial<NonNullable<AuthoredTest["speaking"]>>) =>
                    patch({ speaking: { topic1: { title: "", questions: "" }, part3Questions: "", ...test.speaking, ...p } });
                  if (tn === 2 && !topic) {
                    return (
                      <div key={tn} className="mt-3">
                        <ToolButton onClick={() => patchSpeaking({ topic2: { title: "", questions: "" } })}>
                          <Plus className="h-3.5 w-3.5" /> Add Topic 2 (optional)
                        </ToolButton>
                      </div>
                    );
                  }
                  const setTopic = (p: Partial<{ title: string; questions: string }>) =>
                    patchSpeaking(
                      tn === 1
                        ? { topic1: { ...(test.speaking?.topic1 ?? { title: "", questions: "" }), ...p } }
                        : { topic2: { ...(test.speaking?.topic2 ?? { title: "", questions: "" }), ...p } },
                    );
                  const count = lines(topic?.questions).length;
                  return (
                    <div key={tn} className="mt-4 rounded-lg border bg-white p-4" style={{ borderColor: BORDER }}>
                      <div className="flex items-center justify-between">
                        <p className="font-bold">Topic {tn}{tn === 2 ? " (optional)" : ""}</p>
                        {tn === 2 && (
                          <button
                            type="button"
                            aria-label="Remove Topic 2"
                            onClick={() => patchSpeaking({ topic2: undefined })}
                            className="rounded p-1 text-[#c26066] hover:bg-[#fbeae9]"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                      <Label>Topic name (shown to the student)</Label>
                      <TextInput
                        value={topic?.title ?? ""}
                        onChange={(e) => setTopic({ title: e.target.value })}
                        placeholder={tn === 1 ? "e.g. Your home town" : "e.g. Free time"}
                      />
                      <Label>Questions — one per line (each line becomes one recorded question)</Label>
                      <TextArea
                        rows={5}
                        value={topic?.questions ?? ""}
                        onChange={(e) => setTopic({ questions: e.target.value })}
                        placeholder={"Where is your home town, and what is it like?\nWhat do you like most about living there?"}
                      />
                      <p className="mt-1 text-[12px] text-[#999]">
                        {count > 0 ? `${count} question${count === 1 ? "" : "s"} detected` : "No questions yet — write one per line."}
                      </p>
                    </div>
                  );
                })}
              </div>

              {/* ------------------- Part 2 — Individual long turn ------------------ */}
              <div className="mt-6">
                <div className="rounded border px-4 py-1.5" style={{ background: "#f0f0ea", borderColor: BORDER }}>
                  <p className="font-bold">Part 2 — Individual long turn</p>
                  <p>
                    The cue card is shown with a 1-minute preparation timer; then 2 minutes of
                    speaking are recorded automatically.
                  </p>
                </div>
                <CueCardEditor
                  html={test.speaking?.cueCardHtml}
                  onChange={(cueCardHtml) =>
                    patch({ speaking: { topic1: { title: "", questions: "" }, part3Questions: "", ...test.speaking, cueCardHtml } })
                  }
                />
              </div>

              {/* ------------------- Part 3 — Thematic discussion ------------------- */}
              <div className="mt-6">
                <div className="rounded border px-4 py-1.5" style={{ background: "#f0f0ea", borderColor: BORDER }}>
                  <p className="font-bold">Part 3 — Thematic discussion</p>
                  <p>Deeper follow-up questions on the Part 2 theme, asked one at a time.</p>
                </div>
                <div className="mt-4 rounded-lg border bg-white p-4" style={{ borderColor: BORDER }}>
                  <Label>Questions — one per line</Label>
                  <TextArea
                    rows={6}
                    value={test.speaking?.part3Questions ?? ""}
                    onChange={(e) =>
                      patch({ speaking: { topic1: { title: "", questions: "" }, ...test.speaking, part3Questions: e.target.value } })
                    }
                    placeholder={"Why do you think some places become popular with visitors?\nHow does tourism change a place over time?"}
                  />
                  <p className="mt-1 text-[12px] text-[#999]">
                    {lines(test.speaking?.part3Questions).length > 0
                      ? `${lines(test.speaking?.part3Questions).length} questions detected`
                      : "No questions yet — write one per line."}
                  </p>
                </div>
              </div>
            </>
          ) : test.module === "writing" ? (
            <>
              {[1, 2].map((tn) => {
                const key = tn === 1 ? ("task1" as const) : ("task2" as const);
                const t = tn === 1 ? test.task1 : test.task2;
                const qtypes = tn === 1 ? WRITING_TASK1_TYPES : WRITING_TASK2_TYPES;
                return (
                  <div key={tn} className="mt-6 first:mt-2">
                    <div className="rounded border px-4 py-1.5" style={{ background: "#f0f0ea", borderColor: BORDER }}>
                      <p className="font-bold">Part {tn}</p>
                      <input
                        value={t?.instructions ?? ""}
                        onChange={(e) => patch({ [key]: { ...t!, instructions: e.target.value } })}
                        className="w-full border-b border-transparent bg-transparent outline-none hover:border-[#c9c9c9] focus:border-[#1565c0]"
                        aria-label={`Task ${tn} instructions`}
                      />
                    </div>
                    <label className="mt-3 flex items-center gap-2 text-[13px]">
                      <span className="font-bold text-[#555]">Question type</span>
                      <select
                        value={t?.qtype ?? ""}
                        onChange={(e) => patch({ [key]: { ...t!, qtype: e.target.value || undefined } })}
                        className="rounded border px-2 py-1 text-[13px]"
                        style={{ borderColor: BORDER }}
                        aria-label={`Task ${tn} question type`}
                      >
                        <option value="">— not set —</option>
                        {qtypes.map((qt) => (
                          <option key={qt} value={qt}>
                            {qt}
                          </option>
                        ))}
                      </select>
                      <span className="text-[#999]">not shown to students — used to filter practice questions</span>
                    </label>
                    <textarea
                      value={t?.prompt ?? ""}
                      onChange={(e) => patch({ [key]: { ...t!, prompt: e.target.value } })}
                      rows={6}
                      placeholder={`Paste the Task ${tn} question text here. A blank line starts a new paragraph.`}
                      className="mt-4 w-full resize-y rounded border-2 border-dashed p-3 text-[16px] font-bold leading-relaxed outline-none placeholder:font-normal focus:border-solid focus:border-[#1565c0]"
                      style={{ borderColor: "#d9d9d9" }}
                    />
                    {tn === 1 && (
                      <WritingPictureBox
                        image={test.task1?.image}
                        onImage={(image) => patch({ task1: { ...test.task1!, image } })}
                      />
                    )}
                  </div>
                );
              })}
            </>
          ) : (
            /* --------------------- Reading (3 passages) --------------------- */
            <>
              {[1, 2, 3].map((pn) => {
                const inPart = ranges.filter(({ group }) => (group.part ?? 1) === pn);
                const pas = readingPassageAt(test, pn);
                const partNums = inPart.flatMap(({ range }) =>
                  range[1] >= range[0] ? [range[0], range[1]] : [],
                );
                const hasHeadings = inPart.some(({ group }) => group.type === "headings");
                return (
                  <div key={pn} className="mt-6 first:mt-2">
                    <div className="rounded border px-4 py-1.5" style={{ background: "#f0f0ea", borderColor: BORDER }}>
                      <p className="font-bold">Part {pn}</p>
                      <p>
                        {partNums.length > 0
                          ? `Read the passage and answer questions ${Math.min(...partNums)}–${Math.max(...partNums)}.`
                          : "Read the passage and answer the questions."}
                      </p>
                    </div>
                    <div className="mt-4 rounded-lg border bg-white p-4" style={{ borderColor: BORDER }}>
                      <p className="font-bold">Reading passage {pn}</p>
                      <Label>Passage title</Label>
                      <TextInput
                        value={pas.title}
                        onChange={(e) => patchPassage(pn, { title: e.target.value })}
                        placeholder="e.g. The physics of traffic behaviour"
                      />
                      <Label>Passage — paste the whole passage (blank line = new paragraph)</Label>
                      <textarea
                        value={pas.passage}
                        onChange={(e) => patchPassage(pn, { passage: e.target.value })}
                        rows={9}
                        placeholder="Paste the reading passage here…"
                        className="w-full resize-y rounded border px-2.5 py-1.5 text-[15px] leading-relaxed outline-none focus:border-[#1565c0]"
                        style={{ borderColor: BORDER }}
                      />
                      {hasHeadings && (
                        <p className="mt-1.5 text-[12px] text-[#1565c0]">
                          Matching headings: a draggable heading gap is placed above <b>every paragraph</b>{" "}
                          automatically in the student view. To position gaps yourself, put{" "}
                          <code>{HEADING_TOKEN}</code> on its own line before chosen paragraphs instead.
                        </p>
                      )}
                    </div>
                    {inPart.map(({ group, range }) => {
                      const partControl = (
                        <PartSelect
                          value={group.part ?? 1}
                          count={3}
                          onChange={(part) => patchGroup(group.id, { part })}
                        />
                      );
                      return group.type === "pasted" ? (
                        <PastedSection
                          key={group.id}
                          g={group}
                          range={range}
                          partControl={partControl}
                          onChange={(p) => patchGroup(group.id, p)}
                          onMove={(d) => moveGroup(group.id, d)}
                          onRemove={() => removeGroup(group.id)}
                        />
                      ) : (
                        <div key={group.id} className="mt-4">
                          <ReadingGroupEditor
                            g={group}
                            range={range}
                            typeLabel={typeLabel(group)}
                            partControl={partControl}
                            onChange={(p) => patchGroup(group.id, p)}
                            onRemove={() => removeGroup(group.id)}
                            onMove={(d) => moveGroup(group.id, d)}
                          />
                        </div>
                      );
                    })}
                    {inPart.length === 0 && (
                      <p className="mt-4 rounded-lg border border-dashed p-4 text-center text-[13px] text-[#999]" style={{ borderColor: BORDER }}>
                        No question sections in Part {pn} yet — choose a question type above and click <b>Add section</b>, then set its Part to {pn}.
                      </p>
                    )}
                  </div>
                );
              })}
            </>
          )}
        </div>
      </div>

      {/* ============================ Footer ============================ */}
      <footer className="flex items-center justify-between border-t bg-[#fafafa] px-5 py-2.5" style={{ borderColor: BORDER }}>
        <span className="text-[14px] text-[#666]">
          {test.module === "writing"
            ? "2 tasks"
            : test.module === "speaking"
              ? totalQuestions(test) > 0
                ? `${totalQuestions(test)} questions · 3 parts`
                : "No questions yet"
              : nums.length > 0
                ? `${nums.length} question${nums.length === 1 ? "" : "s"} (${nums[0]}–${nums[nums.length - 1]})`
                : "No questions yet"}
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={saving}
            onClick={() => doSave("draft")}
            className="rounded border bg-white px-4 py-2 text-[14px] font-medium hover:bg-[#f0f0f0] disabled:opacity-50"
            style={{ borderColor: BORDER }}
          >
            Save draft
          </button>
          {view === "build" ? (
            test.module === "writing" || test.module === "speaking" ? (
              <button
                type="button"
                disabled={saving}
                onClick={async () => {
                  if (await doSave("published")) exit();
                }}
                className="inline-flex items-center gap-1.5 rounded bg-[#2f9e44] px-4 py-2 text-[14px] font-bold text-white hover:bg-[#27853a] disabled:opacity-50"
              >
                <Check className="h-4 w-4" /> Publish
              </button>
            ) : (
              <button
                type="button"
                disabled={nums.length === 0}
                onClick={() => setView("answers")}
                className="rounded bg-[#1f1f1f] px-4 py-2 text-[14px] font-bold text-white hover:bg-black disabled:opacity-50"
              >
                Submit questions → add answers
              </button>
            )
          ) : (
            <>
              <button
                type="button"
                onClick={() => setView("build")}
                className="rounded border bg-white px-4 py-2 text-[14px] font-medium hover:bg-[#f0f0f0]"
                style={{ borderColor: BORDER }}
              >
                ← Back to questions
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={async () => {
                  if (await doSave("published")) exit();
                }}
                className="inline-flex items-center gap-1.5 rounded bg-[#2f9e44] px-4 py-2 text-[14px] font-bold text-white hover:bg-[#27853a] disabled:opacity-50"
              >
                <Check className="h-4 w-4" /> Publish question
              </button>
            </>
          )}
        </div>
      </footer>

      {/* ================= Student preview (the real exam) =============== */}
      {previewOpen && (
        <>
          {test.module === "listening" && (
            <ListeningExam
              key={previewNonce}
              test={authoredToListening(test)}
              answerKey={parseAnswerKey(test)}
              userId="teacher-preview"
              mode="practice"
              onExit={() => setPreviewOpen(false)}
            />
          )}
          {test.module === "reading" && (
            <ReadingExam
              key={previewNonce}
              test={authoredToReading(test)}
              answerKey={parseAnswerKey(test)}
              userId="teacher-preview"
              mode="practice"
              onExit={() => setPreviewOpen(false)}
            />
          )}
          {test.module === "writing" && (
            <WritingExam
              key={previewNonce}
              exam={authoredToWriting(test)}
              mode={test.writingFormat ?? "computer"}
              testMode="practice"
              userId="teacher-preview"
              onExit={() => setPreviewOpen(false)}
            />
          )}
          {test.module === "speaking" && (
            <SpeakingExam
              key={previewNonce}
              test={authoredToSpeaking(test)}
              userId="teacher-preview"
              onExit={() => setPreviewOpen(false)}
            />
          )}
          <button
            type="button"
            onClick={() => setPreviewOpen(false)}
            className="fixed left-1/2 top-16 z-[400] flex -translate-x-1/2 items-center gap-2 rounded-full bg-[#1f1f1f] px-4 py-2 text-sm font-bold text-white shadow-xl transition hover:bg-black"
          >
            <X className="h-4 w-4" /> Close student preview
          </button>
        </>
      )}

      {/* ========================= Quit dialog ========================== */}
      {quitOpen && (
        <div className="fixed inset-0 z-[340] grid place-items-center bg-black/40 p-4">
          <div className="w-[420px] max-w-full rounded-lg border bg-white p-6 shadow-2xl" style={{ borderColor: BORDER }}>
            <div className="flex items-start justify-between">
              <h3 className="text-lg font-bold">Quit submitting?</h3>
              <button type="button" aria-label="Close" onClick={() => setQuitOpen(false)} className="text-[#666]">
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="mt-1 text-sm text-[#666]">You can save progress and come back later.</p>
            <div className="mt-5 flex flex-col gap-2">
              <button
                type="button"
                disabled={saving}
                onClick={async () => {
                  if (await doSave("draft")) exit();
                }}
                className="rounded bg-[#1f1f1f] px-4 py-2.5 text-sm font-bold text-white hover:bg-black disabled:opacity-50"
              >
                Save progress for later
              </button>
              <button
                type="button"
                onClick={() => setQuitOpen(false)}
                className="rounded border bg-white px-4 py-2.5 text-sm font-medium hover:bg-[#f0f0f0]"
                style={{ borderColor: BORDER }}
              >
                Continue working
              </button>
              <button type="button" onClick={exit} className="rounded px-4 py-2.5 text-sm font-medium text-[#b3261e] hover:bg-[#fbeae9]">
                Quit without saving
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** Task 1 picture box (blank layout: one text box + one picture box). */
function WritingPictureBox({ image, onImage }: { image?: string; onImage: (v: string | undefined) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div className="mt-4">
      <input
        ref={ref}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={async (e) => {
          const f = e.target.files?.[0];
          if (f) onImage(await readFileAsDataUrl(f));
        }}
      />
      {image ? (
        <div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={image} alt="" className="max-h-72 w-auto max-w-full rounded border" style={{ borderColor: BORDER }} />
          <div className="mt-2 flex gap-3">
            <ToolButton onClick={() => ref.current?.click()}>Replace picture</ToolButton>
            <button type="button" onClick={() => onImage(undefined)} className="text-[13px] text-[#c26066] hover:underline">
              Remove picture
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => ref.current?.click()}
          className="grid h-48 w-full max-w-[560px] place-items-center rounded border-2 border-dashed text-[#999] transition hover:border-[#9ec1e0] hover:text-[#1565c0]"
          style={{ borderColor: "#d9d9d9" }}
        >
          <span className="flex items-center gap-2 text-[15px]">
            <ImagePlus className="h-5 w-5" /> Add the Task 1 picture (chart / diagram)
          </span>
        </button>
      )}
    </div>
  );
}
