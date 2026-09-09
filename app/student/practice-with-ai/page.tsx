"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import { useAuth } from "@/lib/auth";
import {
  Bot,
  Mic,
  PenLine,
  Play,
  Sparkles,
  MessageCircle,
  Send,
  Trash2,
} from "lucide-react";

type Mode = "speaking" | "writing" | "chat";

export default function PracticeWithAIPage() {
  return (
    <Suspense fallback={null}>
      <PracticeWithAI />
    </Suspense>
  );
}

function PracticeWithAI() {
  const search = useSearchParams();
  // When launched from the Speaking practice section, restrict the AI tutor to
  // the speaking simulation only.
  const speakingOnly = search.get("focus") === "speaking";
  const modes: Mode[] = speakingOnly ? ["speaking"] : ["speaking", "writing", "chat"];

  const [mode, setMode] = useState<Mode>("speaking");
  const [started, setStarted] = useState(false);

  return (
    <div className="animate-fade-in">
      <PageHeader
        eyebrow="Practice with AI"
        title={<>Your <span className="gold-text">AI examiner</span></>}
        description={
          speakingOnly
            ? "Run a realistic AI speaking simulation any time — Part 1, 2 & 3 graded against the IELTS speaking criteria."
            : "Run a realistic proficiency-test simulation any time, or chat with the AI tutor for instant doubts and tips."
        }
      />

      {modes.length > 1 && (
        <div className="mb-6 flex flex-wrap gap-2">
          {modes.map((m) => (
            <button
              key={m}
              onClick={() => {
                setMode(m);
                setStarted(false);
              }}
              className={`inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold capitalize transition ${
                mode === m
                  ? "border-gold-400 bg-gold-gradient text-ink-950 shadow-gold"
                  : "border-gold-500/30 bg-ink-800/60 text-white/80 hover:border-gold-400/60"
              }`}
            >
              {m === "speaking" ? (
                <Mic className="h-4 w-4" />
              ) : m === "writing" ? (
                <PenLine className="h-4 w-4" />
              ) : (
                <MessageCircle className="h-4 w-4" />
              )}
              {m === "chat" ? "Chat with AI" : m}
            </button>
          ))}
        </div>
      )}

      {mode === "chat" ? (
        <AIChatPanel />
      ) : (
        <div className="panel">
          <div className="flex items-start gap-4">
            <span className="grid h-12 w-12 place-items-center rounded-xl bg-gold-gradient text-ink-950 shadow-gold">
              <Bot className="h-6 w-6" />
            </span>
            <div className="flex-1">
              <h3 className="text-lg font-bold">
                {mode === "speaking"
                  ? "Speaking Part 1, 2 & 3 simulation"
                  : "Writing Task 1 + Task 2 timed session"}
              </h3>
              <p className="mt-1 text-sm text-white/60">
                {mode === "speaking"
                  ? "11–14 minutes. The AI examiner will ask warm-up questions, give you a cue card, then dive into discussion. Your audio is graded against IELTS speaking criteria."
                  : "60 minutes. You'll get a Task 1 visual and a Task 2 prompt. The AI grades coherence, lexical resource, grammar and task achievement."}
              </p>
              {!started ? (
                <button onClick={() => setStarted(true)} className="btn-gold mt-5">
                  <Play className="h-4 w-4" /> Start AI session
                </button>
              ) : (
                <div className="mt-5 rounded-xl border border-gold-500/30 bg-ink-800/60 p-4">
                  <div className="flex items-center gap-2 text-sm text-gold-200">
                    <Sparkles className="h-4 w-4" />
                    <span>AI examiner is ready.</span>
                  </div>
                  <p className="mt-3 text-sm text-white/70">
                    {mode === "speaking"
                      ? "“Let's begin. Can you tell me your full name and where you're from?”"
                      : "“Task 1: The chart below shows the percentage of households using renewable energy from 2010 to 2024. Summarise the information by selecting and reporting the main features.”"}
                  </p>
                  <p className="mt-4 text-xs text-white/40">
                    This is a UI preview — wire up the Claude API key to enable real grading.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================== Chat with AI ==============================

type ChatTurn = {
  id: string;
  role: "user" | "ai";
  text: string;
  at: string;
};

const chatKey = (userId: string) => `wise-mans-doctrine:ai-chat:${userId}`;

function loadHistory(userId: string): ChatTurn[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(chatKey(userId));
    return raw ? (JSON.parse(raw) as ChatTurn[]) : [];
  } catch {
    return [];
  }
}

function saveHistory(userId: string, history: ChatTurn[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(chatKey(userId), JSON.stringify(history));
}

function AIChatPanel() {
  const { user } = useAuth();
  const [history, setHistory] = useState<ChatTurn[]>([]);
  const [draft, setDraft] = useState("");
  const [thinking, setThinking] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!user) return;
    setHistory(loadHistory(user.id));
  }, [user]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [history.length, thinking]);

  if (!user) return null;

  const send = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || thinking) return;
    const now = new Date().toISOString();
    const userTurn: ChatTurn = {
      id: `c-${Date.now()}`,
      role: "user",
      text: trimmed,
      at: now,
    };
    const next = [...history, userTurn];
    setHistory(next);
    saveHistory(user.id, next);
    setDraft("");
    setThinking(true);

    // Simulated AI think + reply
    const delay = 500 + Math.min(1200, trimmed.length * 18);
    setTimeout(() => {
      const reply: ChatTurn = {
        id: `c-${Date.now() + 1}`,
        role: "ai",
        text: replyTo(trimmed),
        at: new Date().toISOString(),
      };
      const updated = [...next, reply];
      setHistory(updated);
      saveHistory(user.id, updated);
      setThinking(false);
      inputRef.current?.focus();
    }, delay);
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    send(draft);
  };

  const clear = () => {
    if (history.length === 0) return;
    if (!confirm("Clear this AI conversation?")) return;
    setHistory([]);
    saveHistory(user.id, []);
  };

  return (
    <div className="panel flex h-[calc(100vh-23rem)] min-h-[460px] flex-col gap-0 p-0">
      <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
        <div className="flex items-center gap-2 text-sm">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-gold-gradient text-ink-950 shadow-gold">
            <Bot className="h-4 w-4" />
          </span>
          <div>
            <p className="font-semibold leading-tight">Wise Man's AI tutor</p>
            <p className="text-xs text-white/55">
              Ask about strategies, structures, vocabulary, scoring — anything.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={clear}
          disabled={history.length === 0}
          className="btn-ghost disabled:opacity-40"
          title="Clear conversation"
        >
          <Trash2 className="h-4 w-4" /> <span className="hidden sm:inline">Clear</span>
        </button>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {history.length === 0 && !thinking && (
          <div className="py-6 text-center">
            <p className="text-sm text-white/55">No messages yet. Try one of these:</p>
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => send(s)}
                  className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/75 hover:border-gold-400/40 hover:text-white"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {history.map((t) => (
          <Bubble key={t.id} turn={t} />
        ))}

        {thinking && (
          <div className="flex justify-start">
            <div className="max-w-[80%] rounded-2xl border border-white/10 bg-ink-800/60 px-4 py-2.5">
              <p className="flex items-center gap-1.5 text-xs font-semibold text-gold-300">
                <Bot className="h-3 w-3" /> Wise Man's AI
              </p>
              <p className="mt-1 text-sm text-white/80">
                <span className="inline-flex gap-1">
                  <Dot d={0} />
                  <Dot d={150} />
                  <Dot d={300} />
                </span>
              </p>
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <form onSubmit={onSubmit} className="border-t border-white/10 p-3">
        <div className="flex gap-2">
          <textarea
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(draft);
              }
            }}
            placeholder="Ask the AI tutor a question…"
            rows={1}
            maxLength={1000}
            className="input-field resize-none"
          />
          <button
            type="submit"
            disabled={!draft.trim() || thinking}
            className="btn-gold"
          >
            <Send className="h-4 w-4" />
            <span className="hidden sm:inline">Send</span>
          </button>
        </div>
        <p className="mt-1.5 text-[11px] text-white/40">
          Demo tutor — pre-canned responses for common IELTS topics. Wire the
          Claude API to enable full reasoning.
        </p>
      </form>
    </div>
  );
}

function Bubble({ turn }: { turn: ChatTurn }) {
  const isUser = turn.role === "user";
  const date = new Date(turn.at);
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[82%] rounded-2xl px-4 py-2.5 ${
          isUser
            ? "border border-gold-500/40 bg-gold-500/15"
            : "border border-white/10 bg-ink-800/60"
        }`}
      >
        {!isUser && (
          <p className="flex items-center gap-1.5 text-xs font-semibold text-gold-300">
            <Bot className="h-3 w-3" /> Wise Man's AI
          </p>
        )}
        <p className="mt-0.5 whitespace-pre-wrap break-words text-sm text-white/90">
          {turn.text}
        </p>
        <p className="mt-1 text-right text-[10px] text-white/40">
          {date.toLocaleTimeString(undefined, {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      </div>
    </div>
  );
}

function Dot({ d }: { d: number }) {
  return (
    <span
      className="inline-block h-1.5 w-1.5 rounded-full bg-gold-300/80"
      style={{ animation: `pulse 1.2s ${d}ms infinite ease-in-out` }}
    />
  );
}

const SUGGESTIONS = [
  "How do I get band 7 in writing task 2?",
  "Best strategy for True / False / Not Given?",
  "Tips for IELTS speaking part 2",
  "How long should my Task 1 essay be?",
];

// ---------- Canned tutor: keyword-driven helpful replies ----------
function replyTo(input: string): string {
  const t = input.toLowerCase();

  if (matches(t, ["hi", "hello", "hey", "salam", "namaste", "hola"]))
    return "Hello, wizard. Ask me anything about IELTS, PTE, TOEFL or Duolingo — strategies, structures, vocabulary, or scoring.";

  if (matches(t, ["task 2", "task two"]))
    return "Task 2 essays score on four equal-weight criteria: Task Response, Coherence & Cohesion, Lexical Resource, and Grammar. Aim for 4 paragraphs (intro · two body · conclusion), 270–300 words, and one clear position throughout. Repeat your stance in the introduction and conclusion.";

  if (matches(t, ["task 1", "task one"]))
    return "Academic Task 1 wants an overview + key trends, not every number. Structure: paraphrased intro · 1-sentence overview · two body paragraphs grouping the main features. Aim for 160–180 words. For GT, follow the letter style (formal / semi-formal / informal) consistently.";

  if (matches(t, ["writing", "essay"]))
    return "For writing band 7+: vary sentence length, use a mix of complex structures (relative, conditional, concessive), and avoid memorised templates. Always plan for 3–5 minutes before you write — most low scores come from off-topic answers, not bad grammar.";

  if (matches(t, ["true false not given", "tfng", "true/false", "t/f/ng"]))
    return "True/False/Not Given: stay literal. 'True' = the text directly states it. 'False' = the text directly contradicts it. 'Not Given' = the text doesn't say either way — don't infer from real-world knowledge. Mark only what the passage commits to.";

  if (matches(t, ["matching headings"]))
    return "Matching headings: read the first and last sentence of each paragraph first, identify the main idea, and choose the heading that fits the WHOLE paragraph, not a single detail. Eliminate distractors that only match a single sentence.";

  if (matches(t, ["reading"]))
    return "Reading is a time game. Try 17 minutes per passage: skim → tackle straightforward question types first (matching, completion) → leave inference questions for the end. If you're stuck for >30 seconds, mark and move on.";

  if (matches(t, ["listening"]))
    return "Listening tip: use the 30 seconds before each section to read ahead and predict the type of answer (number, name, place, plural). Watch for paraphrasing — answers rarely use the same words as the questions.";

  if (matches(t, ["speaking part 1", "part 1"]))
    return "Speaking Part 1: keep answers 2–3 sentences. Don't memorise — extend naturally with a reason or example. The examiner is checking fluency and range, not the content of your answer.";

  if (matches(t, ["speaking part 2", "cue card"]))
    return "Cue card (Part 2): use the 1-minute prep to jot down 3–4 bullets in note form. Speak for the full 1.5–2 minutes. Structure: who/what · when/where · why/how it matters · personal feeling. Don't worry about covering every bullet on the card — coverage of the main topic matters more.";

  if (matches(t, ["speaking part 3", "discussion"]))
    return "Part 3 wants abstract opinions. Use signposting language: 'On one hand…', 'Having said that…', 'I'd argue that…'. Aim for 3–4 sentences per answer. It's totally fine to think aloud for a moment.";

  if (matches(t, ["speaking"]))
    return "Speaking is graded on Fluency, Lexical Resource, Grammatical Range, and Pronunciation — each worth 25%. Pronunciation isn't accent: it's word stress, sentence rhythm, and clear sounds. Keep going even after a mistake — self-correction is rewarded.";

  if (matches(t, ["vocab", "vocabulary", "lexical"]))
    return "Vocab tip: depth > breadth. Knowing 30 topic-collocations (e.g. 'tackle a problem', 'a growing trend', 'on the rise') beats memorising 300 isolated words. Track new phrases in groups by theme.";

  if (matches(t, ["grammar"]))
    return "Grammar at band 7+ requires range AND accuracy. Mix structures: relative clauses, conditionals (esp. 2nd & 3rd), passive voice for variety, concessive clauses ('Although…'). Two grammatically correct complex sentences beats five clunky ones.";

  if (matches(t, ["tense"]))
    return "Tense rule of thumb: Task 1 chart with years → past simple. Task 1 plan/map without dates → present simple. Task 2 → present simple for opinions, present perfect for 'recent change' framing.";

  if (matches(t, ["band 7", "band seven", "7.0"]))
    return "Band 7 in writing wants: clear position, well-developed ideas with examples, a range of complex sentences with mostly accurate grammar, less common vocabulary used naturally, and few errors that impede communication. Focus your practice on the FEW frequent error types you make.";

  if (matches(t, ["band 8", "band eight", "8.0"]))
    return "Band 8 expects nearly error-free language and rich, natural lexical choice. Most candidates reach Band 8 by drastically cutting filler and prescribing fewer ideas — go deeper on 1–2 points instead of skimming 4.";

  if (matches(t, ["band 9", "band nine", "9.0"]))
    return "Band 9 essentially requires native-like flexibility and accuracy. Realistic target for most candidates is 8.0–8.5. Don't chase 9 — chase the band you actually need.";

  if (matches(t, ["band", "score"]))
    return "Bands are 0.5-point increments from 1.0 to 9.0. Overall is the average of the 4 module bands, rounded to nearest 0.5. So 6.5/7/7/7 = 6.875 → 7.0 overall.";

  if (matches(t, ["how long", "word count", "word limit"]))
    return "Word counts: Task 1 ≥ 150 (target 160–180). Task 2 ≥ 250 (target 270–300). Going over by 20 words is fine; under-length is a hard penalty. Plan to leave 2–3 minutes for proofreading.";

  if (matches(t, ["plan", "study plan", "how to start"]))
    return "Suggested 6-week plan: Week 1 diagnostic mock + identify weakest module. Weeks 2–3 daily 1-hour drills on weakest module. Weeks 4–5 full-length mocks under timed conditions. Week 6 fine-tune and rest. Sleep > extra practice in the last 3 days.";

  if (matches(t, ["nervous", "anxiety", "anxious", "scared", "stress"]))
    return "Test-day nerves are normal. Two grounding tricks: (1) breathe in for 4, hold for 4, out for 6 — drops cortisol fast. (2) Tell yourself 'I get to do this, not have to' — reframes anxiety as energy. Trust the practice. You've put in the work.";

  if (matches(t, ["thank", "thanks", "thx"]))
    return "Anytime, wizard. Go and ace it.";

  if (matches(t, ["ielts", "exam", "test"]))
    return "IELTS has four modules — Listening (30 min), Reading (60 min), Writing (60 min), Speaking (11–14 min). Academic vs General Training differ only in Reading and Writing. Tell me which module you'd like to drill into.";

  if (matches(t, ["pte"]))
    return "PTE Academic is fully computer-scored across 20 task types. Strength: instant results in 2 days. Watch out: Read Aloud and Describe Image carry heavy weight because they contribute to multiple skills.";

  if (matches(t, ["toefl"]))
    return "TOEFL iBT is integrated-skills heavy — Speaking and Writing tasks combine reading and listening passages. Templates work well here, more than in IELTS. Build a personal template bank for each integrated task type.";

  if (matches(t, ["duolingo", "duolingo english"]))
    return "Duolingo English Test is 60 minutes, adaptive, fully online. The interactive Reading and Writing sections weight heavily. Practice typing speed — slow typing burns time.";

  return "Good question. Could you give me a bit more context — which exam, which module, and what specifically are you stuck on? The more concrete, the more useful my answer.";
}

function matches(text: string, keys: string[]): boolean {
  return keys.some((k) => text.includes(k));
}
