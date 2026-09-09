"use client";

import { useEffect, useState } from "react";
import { MessageSquare, Pencil, Trash2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import {
  ClassComment,
  addClassComment,
  deleteClassComment,
  editClassComment,
  getClassComments,
} from "@/lib/courses";

function initialsFrom(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? "")
      .join("") || "U"
  );
}

function Avatar({ name, avatar }: { name: string; avatar?: string }) {
  if (avatar) {
    return (
      <img
        src={avatar}
        alt={name}
        className="h-9 w-9 shrink-0 rounded-full object-cover ring-1 ring-gold-500/40"
      />
    );
  }
  return (
    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gold-gradient text-sm font-semibold text-ink-950 ring-1 ring-gold-500/40">
      {initialsFrom(name)}
    </span>
  );
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return new Date(iso).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function ClassComments({
  slug,
  classId,
}: {
  slug: string;
  classId: string;
}) {
  const { user } = useAuth();
  const [comments, setComments] = useState<ClassComment[]>([]);
  const [draft, setDraft] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");

  useEffect(() => {
    setComments(getClassComments(slug, classId));
  }, [slug, classId]);

  if (!user) return null;

  const post = () => {
    if (!draft.trim()) return;
    setComments(addClassComment(slug, classId, user, draft));
    setDraft("");
  };

  const startEdit = (c: ClassComment) => {
    setEditingId(c.id);
    setEditDraft(c.text);
  };

  const saveEdit = (id: string) => {
    if (!editDraft.trim()) return;
    setComments(editClassComment(slug, classId, id, editDraft));
    setEditingId(null);
    setEditDraft("");
  };

  const remove = (id: string) => {
    setComments(deleteClassComment(slug, classId, id));
    if (editingId === id) setEditingId(null);
  };

  // Newest first.
  const ordered = [...comments].sort((a, b) => b.at.localeCompare(a.at));

  return (
    <section className="panel">
      <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-gold-300/80">
        <MessageSquare className="h-4 w-4" />
        Comments {comments.length > 0 && <span className="text-white/50">({comments.length})</span>}
      </h2>

      {/* Composer */}
      <div className="mt-4 flex gap-3">
        <Avatar name={user.name} avatar={user.avatar} />
        <div className="flex-1">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Add a comment…"
            rows={2}
            className="input-field resize-none"
          />
          <div className="mt-2 flex justify-end">
            <button onClick={post} disabled={!draft.trim()} className="btn-gold disabled:opacity-50">
              Post comment
            </button>
          </div>
        </div>
      </div>

      {/* List */}
      <ul className="mt-5 space-y-4">
        {ordered.length === 0 && (
          <li className="text-sm text-white/50">No comments yet — be the first to comment.</li>
        )}
        {ordered.map((c) => {
          const mine = c.userId === user.id;
          const isEditing = editingId === c.id;
          return (
            <li key={c.id} className="flex gap-3">
              <Avatar name={c.author} avatar={c.avatar} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-white/90">{c.author}</span>
                  <span className="text-xs text-white/45">
                    {timeAgo(c.at)}
                    {c.editedAt && " · edited"}
                  </span>
                </div>

                {isEditing ? (
                  <div className="mt-1.5">
                    <textarea
                      value={editDraft}
                      onChange={(e) => setEditDraft(e.target.value)}
                      rows={2}
                      className="input-field resize-none"
                      autoFocus
                    />
                    <div className="mt-2 flex gap-2">
                      <button onClick={() => saveEdit(c.id)} className="btn-gold !py-1.5 text-sm">
                        Save
                      </button>
                      <button onClick={() => setEditingId(null)} className="btn-ghost text-sm">
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="mt-1 whitespace-pre-line text-sm text-white/80">{c.text}</p>
                )}

                {mine && !isEditing && (
                  <div className="mt-1.5 flex gap-3 text-xs text-white/50">
                    <button
                      onClick={() => startEdit(c)}
                      className="inline-flex items-center gap-1 transition hover:text-gold-300"
                    >
                      <Pencil className="h-3 w-3" /> Edit
                    </button>
                    <button
                      onClick={() => remove(c.id)}
                      className="inline-flex items-center gap-1 transition hover:text-red-300"
                    >
                      <Trash2 className="h-3 w-3" /> Delete
                    </button>
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
