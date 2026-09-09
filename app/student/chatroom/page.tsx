"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import PageHeader from "@/components/PageHeader";
import ChatRoomNotice from "@/components/ChatRoomNotice";
import { useAuth } from "@/lib/auth";
import {
  ChatMessage,
  getMessages,
  postMessage,
  deleteMessage,
  seedChatroomIfEmpty,
} from "@/lib/chat";
import {
  ArrowRight,
  GraduationCap,
  Mic,
  Send,
  ShieldCheck,
  Sparkles,
  Trash2,
} from "lucide-react";

export default function StudentChatRoomPage() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    seedChatroomIfEmpty();
    const refresh = () => setMessages(getMessages());
    refresh();
    const t = setInterval(refresh, 2500);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length]);

  if (!user) return null;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;
    const next = postMessage({
      userId: user.id,
      userName: user.name,
      role: "student",
      text: trimmed,
    });
    setText("");
    setMessages(next);
  };

  const removeOwn = (id: string) => {
    setMessages(deleteMessage(id));
  };

  return (
    <div className="animate-fade-in">
      <ChatRoomNotice />

      <PageHeader
        eyebrow="Wizard Council"
        title={<>The <span className="gold-text">ChatRoom</span></>}
        description="Connect with fellow wizards. Share strategies, lift each other up. Instructors do not see this room — admins monitor for safety."
      />

      <VoiceRoomsBar />

      <div className="panel flex h-[calc(100vh-22rem)] min-h-[420px] flex-col gap-0 p-0">
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <p className="flex items-center gap-2 text-sm text-white/70">
            <Sparkles className="h-3.5 w-3.5 text-gold-400" />
            {messages.length} message{messages.length === 1 ? "" : "s"} in the chamber
          </p>
          <p className="hidden text-xs text-white/40 sm:block">
            Refreshes every 2.5s · monitored by admins
          </p>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {messages.length === 0 ? (
            <p className="py-12 text-center text-white/50">
              No messages yet — speak first, brave wizard.
            </p>
          ) : (
            messages.map((m) => (
              <Bubble
                key={m.id}
                message={m}
                self={m.userId === user.id}
                onDelete={m.userId === user.id ? () => removeOwn(m.id) : undefined}
              />
            ))
          )}
          <div ref={endRef} />
        </div>

        <form
          onSubmit={submit}
          className="flex gap-2 border-t border-white/10 p-3"
        >
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Speak, wizard…"
            maxLength={500}
            className="input-field flex-1"
          />
          <button type="submit" disabled={!text.trim()} className="btn-gold">
            <Send className="h-4 w-4" />
            <span className="hidden sm:inline">Send</span>
          </button>
        </form>
      </div>
    </div>
  );
}

// Entry bar that takes the student into the voice rooms area for their
// declared gender. The bar itself shows no gender label — the destination
// page renders only the matching rooms.
function VoiceRoomsBar() {
  return (
    <Link
      href="/student/chatroom/voice"
      className="mb-4 flex items-center gap-3 rounded-xl border border-gold-500/40 bg-gold-500/10 px-4 py-3 transition hover:border-gold-400/70 hover:bg-gold-500/15"
    >
      <span
        className="grid h-10 w-10 shrink-0 place-items-center rounded-full ring-1 ring-gold-500/50"
        style={{
          background:
            "radial-gradient(circle at 30% 30%, #fff5d4 0%, #c9a959 45%, #5e4c22 100%)",
          boxShadow: "inset 0 -2px 3px rgba(0,0,0,0.3)",
        }}
        aria-hidden
      >
        <Mic className="h-5 w-5" style={{ color: "#3d2a07" }} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold leading-tight">Voice Practice Room</p>
        <p className="text-xs text-white/60">
          Small-group speaking practice — opens the rooms matched to your
          declared gender.
        </p>
      </div>
      <ArrowRight className="h-4 w-4 text-gold-300" />
    </Link>
  );
}

function Bubble({
  message,
  self,
  onDelete,
}: {
  message: ChatMessage;
  self: boolean;
  onDelete?: () => void;
}) {
  const date = new Date(message.at);
  const isAdmin = message.role === "admin";
  return (
    <div className={`group flex ${self ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
          self
            ? "border border-gold-500/40 bg-gold-500/15"
            : isAdmin
            ? "border border-gold-500/30 bg-ink-800/60"
            : "border border-white/10 bg-ink-800/60"
        }`}
      >
        {!self && (
          <p className="flex items-center gap-1.5 text-xs font-semibold text-gold-300">
            {isAdmin ? <ShieldCheck className="h-3 w-3" /> : <GraduationCap className="h-3 w-3" />}
            {message.userName}
            {isAdmin && (
              <span className="badge text-[10px] !py-0">Admin</span>
            )}
          </p>
        )}
        <p className="mt-0.5 whitespace-pre-wrap break-words text-sm text-white/90">
          {message.text}
        </p>
        <div className="mt-1 flex items-center justify-end gap-2">
          {self && onDelete && (
            <button
              type="button"
              onClick={onDelete}
              aria-label="Delete message"
              className="opacity-0 transition group-hover:opacity-100"
            >
              <Trash2 className="h-3 w-3 text-white/60 hover:text-white" />
            </button>
          )}
          <p className="text-[10px] text-white/40">
            {date.toLocaleTimeString(undefined, {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>
      </div>
    </div>
  );
}
