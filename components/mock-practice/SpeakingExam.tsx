"use client";

// Full-screen IELTS computer-delivered Speaking test interface for the Mock
// Practice section, in the same shell as the Writing exam:
//
//  - top bar: IELTS logotype, "Test taker ID", status icons, settings
//  - microphone permission screen before the test can begin
//  - Part 1 & 3: questions arrive one at a time (next arrow); recording starts
//    automatically when a question appears and the student presses
//    "Submit recording" to end the answer
//  - Part 2: the cue card appears with a 1-minute preparation countdown; after
//    a 2-second pause and the message "You may start speaking now", a 2-minute
//    recording starts automatically and ends automatically
//  - bottom bar: three part tiles (1 Introduction / 2 Long turn / 3 Discussion)
//  - finally the whole set of recordings is submitted for evaluation

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { SIZE_PX, THEMES, type SizeKey, type ThemeKey } from "@/lib/exam-theme";
import { OptionsScreen, StatusBar, TestLoadingScreen, useExamBoot, useTestTakerId } from "./exam-ui";
import { sanitizeHtml } from "@/lib/rich-html";
import {
  buildSpeakingTasks,
  type SpeakingTask,
  type SpeakingTest,
} from "@/lib/speaking-mock";
import {
  Bell,
  Check,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Menu,
  Mic,
  Send,
  Square,
  Wifi,
} from "lucide-react";

export type SpeakingExamProps = {
  test: SpeakingTest;
  userId: string;
  onExit: () => void;
  /** When present, the final submission is POSTed to /api/attempts. */
  submitTarget?: { questionId: string; questionName: string; studentEmail: string };
};

type Recording = { blob: Blob; url: string; seconds: number; mimeType: string };

const PART_META: Record<1 | 2 | 3, { title: string; blurb: string }> = {
  1: { title: "Part 1 — Introduction", blurb: "Answer each question about yourself and familiar topics." },
  2: { title: "Part 2 — Individual long turn", blurb: "Prepare for 1 minute, then speak for 2 minutes about the topic on the card." },
  3: { title: "Part 3 — Thematic discussion", blurb: "Discuss the following questions in more depth." },
};

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.max(0, s) % 60).padStart(2, "0")}`;

/**
 * Live microphone level meter — a row of bars rising and falling with the
 * student's voice, so they can see that their speech is being picked up.
 */
function VoiceMeter({ analyser, color }: { analyser: AnalyserNode | null; color: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || !analyser) return;
    const ctx2d = canvas.getContext("2d");
    if (!ctx2d) return;
    const data = new Uint8Array(analyser.frequencyBinCount);
    const BARS = 24;
    let raf = 0;
    const draw = () => {
      analyser.getByteFrequencyData(data);
      const { width, height } = canvas;
      ctx2d.clearRect(0, 0, width, height);
      const step = Math.max(1, Math.floor(data.length / BARS));
      const bw = width / BARS;
      ctx2d.fillStyle = color;
      for (let i = 0; i < BARS; i++) {
        let sum = 0;
        for (let j = 0; j < step; j++) sum += data[i * step + j];
        const v = sum / step / 255;
        const h = Math.max(3, v * height);
        // Bars grow from the vertical centre, equaliser-style.
        ctx2d.fillRect(i * bw + 1.5, (height - h) / 2, bw - 3, h);
      }
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, [analyser, color]);
  return <canvas ref={ref} width={190} height={36} aria-hidden className="align-middle" />;
}

export default function SpeakingExam({ test, userId, onExit, submitTarget }: SpeakingExamProps) {
  const booting = useExamBoot();
  const takerId = useTestTakerId();
  const [themeKey, setThemeKey] = useState<ThemeKey>("bw");
  const [sizeKey, setSizeKey] = useState<SizeKey>("regular");
  const theme = THEMES[themeKey];
  const bw = themeKey === "bw";
  const [optionsOpen, setOptionsOpen] = useState(false);

  const tasks = useMemo(() => buildSpeakingTasks(test), [test]);
  const [stage, setStage] = useState<"mic" | "exam" | "review" | "finished">("mic");
  const [micError, setMicError] = useState<string | null>(null);
  const [current, setCurrent] = useState(0);
  const [recordings, setRecordings] = useState<Record<number, Recording>>({});
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Part 2 machine: prep countdown → 2s pause → auto-recorded speaking.
  const [p2Phase, setP2Phase] = useState<"prep" | "pause" | "speak" | "done">("prep");
  const [p2Seconds, setP2Seconds] = useState(test.part2.prepSeconds);

  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const startedAtRef = useRef(0);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

  const task: SpeakingTask | undefined = tasks[current];
  const done = (i: number) => recordings[tasks[i]?.number ?? -1] !== undefined;
  const allDone = tasks.every((_, i) => done(i));

  // ------------------------------ microphone -------------------------------
  const enableMic = async () => {
    setMicError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      // Live level meter: tap the stream with a Web Audio analyser.
      try {
        const ctx = new AudioContext();
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.7;
        ctx.createMediaStreamSource(stream).connect(analyser);
        void ctx.resume();
        audioCtxRef.current = ctx;
        analyserRef.current = analyser;
      } catch {
        /* meter is optional — recording works without it */
      }
      setStage("exam");
    } catch {
      setMicError("Microphone access was refused. Please allow the microphone in your browser and try again.");
    }
  };

  useEffect(
    () => () => {
      recorderRef.current?.state === "recording" && recorderRef.current.stop();
      streamRef.current?.getTracks().forEach((t) => t.stop());
      void audioCtxRef.current?.close().catch(() => {});
      try {
        window.speechSynthesis?.cancel();
      } catch {}
    },
    [],
  );

  /** Read a question aloud; resolves when speech ends (immediately if TTS is unavailable). */
  const speakText = useCallback(
    (text: string) =>
      new Promise<void>((resolve) => {
        try {
          if (!("speechSynthesis" in window) || !text.trim()) return resolve();
          window.speechSynthesis.cancel();
          const u = new SpeechSynthesisUtterance(text);
          u.lang = "en-GB";
          u.rate = 0.95;
          u.onend = () => resolve();
          u.onerror = () => resolve();
          window.speechSynthesis.speak(u);
        } catch {
          resolve();
        }
      }),
    [],
  );

  // ------------------------------- recording -------------------------------
  const startRecording = useCallback(() => {
    const stream = streamRef.current;
    if (!stream || recorderRef.current?.state === "recording") return;
    const rec = new MediaRecorder(stream);
    chunksRef.current = [];
    rec.ondataavailable = (e) => e.data.size > 0 && chunksRef.current.push(e.data);
    rec.start();
    recorderRef.current = rec;
    startedAtRef.current = Date.now();
    setElapsed(0);
    setRecording(true);
  }, []);

  const stopRecording = useCallback(
    (taskNumber: number) =>
      new Promise<void>((resolve) => {
        const rec = recorderRef.current;
        if (!rec || rec.state !== "recording") return resolve();
        rec.onstop = () => {
          const mimeType = rec.mimeType || "audio/webm";
          const blob = new Blob(chunksRef.current, { type: mimeType });
          const seconds = Math.round((Date.now() - startedAtRef.current) / 1000);
          setRecordings((r) => {
            const old = r[taskNumber];
            if (old) URL.revokeObjectURL(old.url);
            return { ...r, [taskNumber]: { blob, url: URL.createObjectURL(blob), seconds, mimeType } };
          });
          setRecording(false);
          resolve();
        };
        rec.stop();
      }),
    [],
  );

  // Elapsed-time ticker while recording.
  useEffect(() => {
    if (!recording) return;
    const t = setInterval(() => setElapsed(Math.round((Date.now() - startedAtRef.current) / 1000)), 250);
    return () => clearInterval(t);
  }, [recording]);

  // ----------------------- task arrival (auto-record) ----------------------
  useEffect(() => {
    if (stage !== "exam" || !task) return;
    if (task.part === 2) {
      // The cue card is read silently by the student during preparation.
      if (!recordings[task.number]) {
        setP2Phase("prep");
        setP2Seconds(test.part2.prepSeconds);
      } else {
        setP2Phase("done");
      }
      return;
    }
    if (recordings[task.number]) return;
    // Parts 1 & 3: the question fades in and is read aloud; recording starts
    // 1 second after the voice finishes.
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    void speakText(task.question).then(() => {
      if (!cancelled) timer = setTimeout(startRecording, 1000);
    });
    return () => {
      cancelled = true;
      clearTimeout(timer);
      try {
        window.speechSynthesis?.cancel();
      } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, current]);

  // Part 2 preparation countdown → pause → auto speaking.
  useEffect(() => {
    if (stage !== "exam" || task?.part !== 2 || p2Phase !== "prep") return;
    if (recordings[task.number]) return;
    const t = setInterval(() => {
      setP2Seconds((s) => {
        if (s > 1) return s - 1;
        clearInterval(t);
        setP2Phase("pause");
        return 0;
      });
    }, 1000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, current, p2Phase]);

  useEffect(() => {
    if (stage !== "exam" || task?.part !== 2 || p2Phase !== "pause") return;
    const t = setTimeout(() => {
      setP2Phase("speak");
      setP2Seconds(test.part2.speakSeconds);
      startRecording();
    }, 2000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, current, p2Phase]);

  useEffect(() => {
    if (stage !== "exam" || task?.part !== 2 || p2Phase !== "speak") return;
    const n = task.number;
    const t = setInterval(() => {
      setP2Seconds((s) => {
        if (s > 1) return s - 1;
        clearInterval(t);
        void stopRecording(n).then(() => setP2Phase("done"));
        return 0;
      });
    }, 1000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, current, p2Phase]);

  const submitAnswer = async () => {
    if (!task) return;
    await stopRecording(task.number);
  };

  const goNext = () => {
    if (current < tasks.length - 1) setCurrent(current + 1);
    else setStage("review");
  };

  // ------------------------------ submission -------------------------------
  const blobToDataUrl = (blob: Blob) =>
    new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result));
      r.onerror = reject;
      r.readAsDataURL(blob);
    });

  const submitAll = async () => {
    if (!submitTarget) {
      setStage("finished");
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      const items = [];
      for (const t of tasks) {
        const rec = recordings[t.number];
        if (!rec) continue;
        items.push({
          number: t.number,
          part: t.part,
          question: t.part === 2 ? "Cue card (Part 2)" : t.question,
          seconds: rec.seconds,
          mimeType: rec.mimeType,
          audio: await blobToDataUrl(rec.blob),
        });
      }
      const res = await fetch("/api/attempts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionId: submitTarget.questionId,
          questionName: submitTarget.questionName,
          module: "speaking",
          studentEmail: submitTarget.studentEmail,
          answers: { recordings: items },
        }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "Submission failed");
      setStage("finished");
    } catch (e) {
      setSubmitError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  // ================================ screens =================================
  if (booting) return <TestLoadingScreen />;

  const surface = (children: React.ReactNode) => (
    <div
      className="exam-surface fixed inset-0 z-[300] flex flex-col"
      style={{
        background: theme.pageBg,
        color: theme.fg,
        fontFamily: "Arial, Helvetica, sans-serif",
        colorScheme: bw ? "light" : "dark",
      }}
    >
      <header
        className="flex items-center justify-between border-b px-5 py-2"
        style={{ background: theme.chromeTopBg, borderColor: theme.chromeBorder }}
      >
        <div className="flex items-center gap-5">
          <span className="select-none text-[30px] font-black leading-none tracking-tight text-[#E31837]">
            IELTS<sup className="align-super text-[11px] font-bold">™</sup>
          </span>
          <div>
            <p className="text-[15px] font-bold leading-tight" style={{ color: theme.chromeFg }}>
              Test Taker ID: {takerId}
            </p>
            <p className="text-[13px] leading-tight" style={{ color: theme.chromeFg }}>
              Speaking test
            </p>
          </div>
        </div>
        <div className="flex items-center gap-6" style={{ color: theme.chromeFg }}>
          <Wifi className="h-6 w-6" />
          <Bell className="h-6 w-6" />
          <button type="button" aria-label="Options" onClick={() => setOptionsOpen(true)} className="rounded p-0.5 transition hover:opacity-70">
            <Menu className="h-6 w-6" />
          </button>
        </div>
      </header>
      {children}
      <StatusBar theme={theme} bw={bw} />
      {optionsOpen && (
        <OptionsScreen
          theme={theme}
          themeKey={themeKey}
          sizeKey={sizeKey}
          onTheme={setThemeKey}
          onSize={setSizeKey}
          onClose={() => setOptionsOpen(false)}
          onSubmission={() => {
            setOptionsOpen(false);
            if (!recording) setStage("review");
          }}
        />
      )}
    </div>
  );

  // ------------------------- microphone permission -------------------------
  if (stage === "mic") {
    return surface(
      <main className="grid min-h-0 flex-1 place-items-center" style={{ background: theme.contentBg }}>
        <div className="w-[520px] max-w-[92vw] rounded-lg border p-8 text-center shadow-xl" style={{ background: theme.contentBg, borderColor: theme.border }}>
          <span className="mx-auto grid h-16 w-16 place-items-center rounded-full" style={{ background: theme.accentSoftBg, color: theme.accent }}>
            <Mic className="h-8 w-8" />
          </span>
          <h2 className="mt-4 text-2xl font-bold">Microphone required</h2>
          <p className="mt-3 text-[15px] leading-relaxed" style={{ color: theme.muted }}>
            This is a speaking test: your answers are recorded. Questions appear one at a time —
            recording starts when a question appears, and you press <b>Submit recording</b> when you
            finish speaking. In Part 2 you have 1 minute to prepare, then 2 minutes of speaking are
            recorded automatically.
          </p>
          {micError && <p className="mt-3 text-sm text-[#b3261e]">{micError}</p>}
          <div className="mt-6 flex justify-center gap-3">
            <button type="button" onClick={onExit} className="rounded border px-4 py-2 text-sm font-medium" style={{ borderColor: theme.border, color: theme.fg }}>
              Cancel
            </button>
            <button type="button" onClick={enableMic} className="inline-flex items-center gap-2 rounded bg-[#1f1f1f] px-5 py-2 text-sm font-bold text-white hover:bg-black">
              <Mic className="h-4 w-4" /> Turn on my microphone
            </button>
          </div>
        </div>
      </main>,
    );
  }

  // ------------------------------- finished --------------------------------
  if (stage === "finished") {
    return surface(
      <main className="grid min-h-0 flex-1 place-items-center" style={{ background: theme.contentBg }}>
        <div className="w-[460px] max-w-[92vw] rounded-lg border p-8 text-center shadow-xl" style={{ background: theme.contentBg, borderColor: theme.border }}>
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[#2f9e44]">
            <Check className="h-8 w-8 text-white" />
          </span>
          <h2 className="mt-4 text-2xl font-bold">Speaking test finished</h2>
          <p className="mt-2 text-sm" style={{ color: theme.muted }}>
            {submitTarget
              ? "Your recording has been submitted for evaluation."
              : "Practice recordings are not uploaded — well done!"}
          </p>
          <button type="button" onClick={onExit} className="mt-6 rounded bg-[#1f1f1f] px-5 py-2 text-sm font-bold text-white hover:bg-black">
            Save and exit
          </button>
        </div>
      </main>,
    );
  }

  // -------------------------------- review ---------------------------------
  if (stage === "review") {
    return surface(
      <main className="scrollbar-none min-h-0 flex-1 overflow-y-auto" style={{ background: theme.contentBg, fontSize: SIZE_PX[sizeKey] }}>
        <div className="mx-auto w-full max-w-[760px] px-6 py-8">
          <h2 className="text-2xl font-bold">Submit your recording</h2>
          <p className="mt-1 text-[14px]" style={{ color: theme.muted }}>
            Listen back if you wish, then submit the whole recording for the final evaluation.
          </p>
          <div className="mt-5 space-y-2.5">
            {tasks.map((t) => {
              const rec = recordings[t.number];
              return (
                <div key={t.number} className="flex items-center gap-3 rounded border px-3 py-2.5" style={{ borderColor: theme.border }}>
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-[13px] font-bold" style={{ background: theme.accentSoftBg, color: theme.accent }}>
                    {t.number}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-bold">
                      {t.part === 2 ? "Part 2 — Cue card" : `Part ${t.part} — ${t.question}`}
                    </p>
                    <p className="text-[12px]" style={{ color: theme.muted }}>
                      {rec ? `Recorded · ${fmt(rec.seconds)}` : "Not recorded"}
                    </p>
                  </div>
                  {rec && <audio controls src={rec.url} className="h-9 w-56 shrink-0" />}
                </div>
              );
            })}
          </div>
          {submitError && <p className="mt-4 text-sm text-[#b3261e]">Submission failed: {submitError}</p>}
          <div className="mt-6 flex items-center gap-3">
            <button
              type="button"
              onClick={() => setStage("exam")}
              className="rounded border px-4 py-2 text-[14px] font-medium"
              style={{ borderColor: theme.border, color: theme.fg }}
            >
              ← Back to the test
            </button>
            <button
              type="button"
              disabled={!allDone || submitting}
              onClick={submitAll}
              className="inline-flex items-center gap-2 rounded bg-[#2f9e44] px-5 py-2 text-[14px] font-bold text-white hover:bg-[#27853a] disabled:opacity-50"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Submit for evaluation
            </button>
            {!allDone && (
              <span className="text-[13px]" style={{ color: theme.muted }}>
                Every question must be recorded first.
              </span>
            )}
          </div>
        </div>
      </main>,
    );
  }

  // --------------------------------- exam ----------------------------------
  if (!task) return null;
  const meta = PART_META[task.part];
  const rec = recordings[task.number];
  const partTasks = (p: 1 | 2 | 3) => tasks.filter((t) => t.part === p);
  const partDone = (p: 1 | 2 | 3) => partTasks(p).filter((t) => recordings[t.number]).length;
  const canNext = !!rec;

  return surface(
    <>
      <main className="scrollbar-none relative min-h-0 flex-1 overflow-y-auto" style={{ background: theme.contentBg, fontSize: SIZE_PX[sizeKey] }}>
        <div className="px-5 pt-4">
          <div className="rounded border px-4 py-1.5" style={{ background: bw ? "#f0f0ea" : theme.panelBg, borderColor: theme.border }}>
            <p className="font-bold">{meta.title}</p>
            <p className="mt-0">{meta.blurb}</p>
          </div>
        </div>

        {/* Keyed by task so each question re-mounts and fades in. */}
        <div key={task.number} className="animate-fade-in mx-auto w-full max-w-[820px] px-6 pb-32 pt-8">
          {task.part === 2 ? (
            <>
              <div className="rounded-lg border p-6" style={{ borderColor: theme.inputBorder, background: bw ? "#fcfbf7" : theme.panelBg }}>
                {test.part2.cueCardHtml ? (
                  <div className="pasted-rich text-[1.05em] leading-relaxed" dangerouslySetInnerHTML={{ __html: sanitizeHtml(test.part2.cueCardHtml) }} />
                ) : (
                  <div className="space-y-4 text-[1.05em] leading-relaxed">
                    {(test.part2.cueCardText ?? "").split(/\n\s*\n/).map((p, i) => (
                      <p key={i} className={i === 0 ? "font-bold" : "whitespace-pre-line"}>
                        {p}
                      </p>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-8 text-center">
                {p2Phase === "prep" && !rec && (
                  <>
                    <p className="text-[15px] font-bold" style={{ color: theme.muted }}>
                      Preparation time — make notes if you wish
                    </p>
                    <p className="mt-2 text-5xl font-black tabular-nums">{fmt(p2Seconds)}</p>
                    <p className="mt-2 text-[13px]" style={{ color: theme.muted }}>
                      Speaking starts automatically when the timer ends.
                    </p>
                  </>
                )}
                {p2Phase === "pause" && (
                  <p className="text-3xl font-black text-[#2f9e44]">You may start speaking now</p>
                )}
                {p2Phase === "speak" && (
                  <>
                    <p className="inline-flex items-center gap-2 text-[15px] font-bold text-[#b3261e]">
                      <span className="h-3 w-3 animate-pulse rounded-full bg-[#b3261e]" /> Recording
                    </p>
                    <p className="mt-2 text-5xl font-black tabular-nums">{fmt(p2Seconds)}</p>
                    <div className="mt-3 flex justify-center">
                      <VoiceMeter analyser={analyserRef.current} color="#b3261e" />
                    </div>
                    <p className="mt-2 text-[13px]" style={{ color: theme.muted }}>
                      The recording stops automatically when the timer ends.
                    </p>
                  </>
                )}
                {p2Phase === "done" && rec && (
                  <div className="inline-flex flex-col items-center gap-3">
                    <p className="inline-flex items-center gap-2 text-[15px] font-bold text-[#2f9e44]">
                      <Check className="h-5 w-5" strokeWidth={3} /> Long turn recorded · {fmt(rec.seconds)}
                    </p>
                    <audio controls src={rec.url} className="h-10 w-80 max-w-full" />
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              {task.topicTitle && (
                <p className="text-[13px] font-bold uppercase tracking-wide" style={{ color: theme.muted }}>
                  Topic: {task.topicTitle}
                </p>
              )}
              <h2 className="mt-2 text-[1.5em] font-bold leading-snug">{task.question}</h2>

              <div className="mt-10">
                {rec ? (
                  <div className="flex flex-wrap items-center gap-4">
                    <p className="inline-flex items-center gap-2 text-[15px] font-bold text-[#2f9e44]">
                      <Check className="h-5 w-5" strokeWidth={3} /> Answer recorded · {fmt(rec.seconds)}
                    </p>
                    <audio controls src={rec.url} className="h-10 w-72 max-w-full" />
                  </div>
                ) : recording ? (
                  <div className="flex flex-wrap items-center gap-5">
                    <p className="inline-flex items-center gap-2 text-[15px] font-bold text-[#b3261e]">
                      <span className="h-3 w-3 animate-pulse rounded-full bg-[#b3261e]" /> Recording · {fmt(elapsed)}
                    </p>
                    <VoiceMeter analyser={analyserRef.current} color="#b3261e" />
                    <button
                      type="button"
                      onClick={submitAnswer}
                      className="inline-flex items-center gap-2 rounded bg-[#1f1f1f] px-5 py-2.5 text-[15px] font-bold text-white hover:bg-black"
                    >
                      <Square className="h-4 w-4 fill-current" /> Submit recording
                    </button>
                    <span className="text-[13px]" style={{ color: theme.muted }}>
                      Speak your answer, then submit to end this recording.
                    </span>
                  </div>
                ) : (
                  <p className="inline-flex items-center gap-2 text-[15px] font-bold" style={{ color: theme.muted }}>
                    <span className="h-3 w-3 rounded-full" style={{ background: theme.muted }} />
                    Listen to the question — recording starts just after it is read out…
                  </p>
                )}
              </div>
            </>
          )}
        </div>

        {/* Floating prev/next arrows */}
        <div className="pointer-events-none absolute bottom-6 right-8 flex gap-2">
          <button
            type="button"
            aria-label="Previous question"
            disabled={current === 0 || recording}
            onClick={() => setCurrent((c) => Math.max(0, c - 1))}
            className="pointer-events-auto grid h-12 w-14 place-items-center rounded text-white shadow-md transition"
            style={{ background: current === 0 || recording ? "#c9c9c9" : "#1f1f1f", cursor: current === 0 || recording ? "not-allowed" : "pointer" }}
          >
            <ChevronLeft className="h-7 w-7" strokeWidth={2.75} />
          </button>
          <button
            type="button"
            aria-label="Next question"
            disabled={!canNext}
            onClick={goNext}
            className="pointer-events-auto grid h-12 w-14 place-items-center rounded text-white shadow-md transition"
            style={{ background: canNext ? "#1f1f1f" : "#c9c9c9", cursor: canNext ? "pointer" : "not-allowed" }}
          >
            <ChevronRight className="h-7 w-7" strokeWidth={2.75} />
          </button>
        </div>
      </main>

      {/* ======================= Part navigation tiles ===================== */}
      <nav className="flex select-none items-stretch border-t" style={{ background: bw ? "#ffffff" : theme.chromeNavBg, borderColor: theme.chromeBorder }}>
        <div className="flex flex-1 items-stretch gap-3 px-3">
          {([1, 2, 3] as const).map((p) => {
            const total = partTasks(p).length;
            const doneCount = partDone(p);
            const complete = total > 0 && doneCount === total;
            const active = task.part === p;
            const segGray = bw ? "#d9d9d9" : "#444444";
            return (
              <button
                key={p}
                type="button"
                disabled={recording}
                onClick={() => {
                  const idx = tasks.findIndex((t) => t.part === p);
                  if (idx >= 0) setCurrent(idx);
                }}
                className="flex flex-1 flex-col items-stretch pb-2.5 pt-0"
                style={{ color: theme.chromeFg }}
              >
                <span aria-hidden className="h-[5px] w-full rounded-full" style={{ background: complete ? "#2f9e44" : segGray }} />
                <span className="mt-2 flex items-center gap-3 pl-2">
                  {complete && <Check className="h-5 w-5 text-[#2f9e44]" strokeWidth={3} />}
                  <span className={`text-[15px] ${active ? "font-black" : "font-bold"}`}>Part {p}</span>
                  <span className="text-[13px]" style={{ color: theme.muted }}>
                    {p === 1 ? "Introduction" : p === 2 ? "Long turn" : "Discussion"}
                  </span>
                  {!complete && (
                    <span className="text-[14px]" style={{ color: theme.muted }}>
                      {doneCount} of {total}
                    </span>
                  )}
                </span>
              </button>
            );
          })}
        </div>
        <button
          type="button"
          aria-label="Submit recording for evaluation"
          disabled={recording}
          onClick={() => setStage("review")}
          className="grid w-16 place-items-center transition hover:opacity-80"
          style={{ background: bw ? "#e9e9e9" : theme.chromeStatusBg, color: theme.chromeFg }}
        >
          <Check className="h-6 w-6" strokeWidth={3} />
        </button>
      </nav>
    </>,
  );
}
