"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
  Send,
  ShieldCheck,
  GraduationCap,
  Trash2,
  Sparkles,
  Eye,
  Users,
} from "lucide-react";

export default function AdminChatRoomPage() {
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

  const stats = useMemo(() => {
    const uniq = new Set(messages.map((m) => m.userId));
    const since = messages[0]?.at;
    return {
      total: messages.length,
      participants: uniq.size,
      since,
    };
  }, [messages]);

  if (!user) return null;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;
    const next = postMessage({
      userId: user.id,
      userName: user.name,
      role: "admin",
      text: trimmed,
    });
    setText("");
    setMessages(next);
  };

  const remove = (id: string) => {
    if (!confirm("Delete this message? This cannot be undone.")) return;
    setMessages(deleteMessage(id));
  };

  return (
    <div className="animate-fade-in">
      <ChatRoomNotice />

      <PageHeader
        eyebrow="Moderation"
        title={<>ChatRoom <span className="gold-text">monitor</span></>}
        description="Watch the wizards converse. Remove anything that crosses the line — promotion, defamation, bullying, harassment, or mentioning other institutions."
        actions={
          <span className="badge">
            <ShieldCheck className="mr-1 h-3 w-3" /> Admin view
          </span>
        }
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <Stat icon={Sparkles} label="Messages" value={`${stats.total}`} />
        <Stat icon={Users} label="Participants" value={`${stats.participants}`} />
        <Stat
          icon={Eye}
          label="Oldest message"
          value={
            stats.since
              ? new Date(stats.since).toLocaleDateString(undefined, {
                  day: "numeric",
                  month: "short",
                })
              : "—"
          }
        />
      </div>

      <div className="panel flex h-[calc(100vh-25rem)] min-h-[420px] flex-col gap-0 p-0">
        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {messages.length === 0 ? (
            <p className="py-12 text-center text-white/50">No messages yet.</p>
          ) : (
            messages.map((m) => (
              <AdminBubble key={m.id} message={m} onDelete={() => remove(m.id)} />
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
            placeholder="Post an admin notice…"
            maxLength={500}
            className="input-field flex-1"
          />
          <button type="submit" disabled={!text.trim()} className="btn-gold">
            <Send className="h-4 w-4" />
            <span className="hidden sm:inline">Post as Admin</span>
          </button>
        </form>
      </div>
    </div>
  );
}

function AdminBubble({
  message,
  onDelete,
}: {
  message: ChatMessage;
  onDelete: () => void;
}) {
  const date = new Date(message.at);
  const isAdmin = message.role === "admin";
  return (
    <div className="group flex items-start gap-2">
      <div
        className={`flex-1 rounded-2xl px-4 py-2.5 ${
          isAdmin
            ? "border border-gold-500/40 bg-gold-500/10"
            : "border border-white/10 bg-ink-800/60"
        }`}
      >
        <p className="flex items-center gap-1.5 text-xs font-semibold text-gold-300">
          {isAdmin ? (
            <ShieldCheck className="h-3 w-3" />
          ) : (
            <GraduationCap className="h-3 w-3" />
          )}
          {message.userName}
          {isAdmin && <span className="badge text-[10px] !py-0">Admin</span>}
          <span className="ml-auto text-[10px] font-normal text-white/40">
            {date.toLocaleString(undefined, {
              dateStyle: "short",
              timeStyle: "short",
            })}
          </span>
        </p>
        <p className="mt-1 whitespace-pre-wrap break-words text-sm text-white/90">
          {message.text}
        </p>
      </div>
      <button
        type="button"
        onClick={onDelete}
        aria-label="Delete message"
        className="shrink-0 rounded-md border border-red-500/30 bg-red-500/10 p-2 text-red-200 transition hover:bg-red-500/20"
        title="Delete message"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: any;
  label: string;
  value: string;
}) {
  return (
    <div className="panel">
      <p className="flex items-center gap-2 text-xs uppercase tracking-wide text-white/50">
        <Icon className="h-3.5 w-3.5" /> {label}
      </p>
      <p className="mt-1 text-2xl font-black gold-text">{value}</p>
    </div>
  );
}
