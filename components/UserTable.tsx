"use client";

import { useState } from "react";
import { ManagedUser } from "@/lib/admin-data";
import { CheckCircle2, MoreVertical, Pause, Play, Trash2, UserPlus } from "lucide-react";
import Modal from "./Modal";

export default function UserTable({
  title,
  role,
  initial,
}: {
  title: string;
  role?: "student" | "instructor";
  initial: ManagedUser[];
}) {
  const [users, setUsers] = useState<ManagedUser[]>(initial);
  const [addOpen, setAddOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [newRole, setNewRole] = useState<"student" | "instructor">(role ?? "student");
  const [query, setQuery] = useState("");

  const filtered = users.filter(
    (u) =>
      (!role || u.role === role) &&
      (u.name.toLowerCase().includes(query.toLowerCase()) ||
        u.email.toLowerCase().includes(query.toLowerCase()))
  );

  const setStatus = (id: string, status: ManagedUser["status"]) =>
    setUsers(users.map((u) => (u.id === id ? { ...u, status } : u)));

  const offboard = (id: string) =>
    setUsers(users.filter((u) => u.id !== id));

  const onboard = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;
    setUsers([
      {
        id: `m-${Date.now()}`,
        name,
        email,
        role: newRole,
        status: "active",
        joined: new Date().toISOString().slice(0, 10),
      },
      ...users,
    ]);
    setName("");
    setEmail("");
    setAddOpen(false);
  };

  return (
    <div className="panel">
      <header className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-bold">{title}</h2>
          <p className="text-xs text-white/50">
            {filtered.length} of {users.filter((u) => !role || u.role === role).length} shown
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name or email…"
            className="input-field max-w-xs"
          />
          <button onClick={() => setAddOpen(true)} className="btn-gold whitespace-nowrap">
            <UserPlus className="h-4 w-4" /> Onboard
          </button>
        </div>
      </header>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-white/5 text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-white/50">
              <th className="py-3 pr-4">Name</th>
              <th className="py-3 pr-4">Email</th>
              <th className="py-3 pr-4">Role</th>
              <th className="py-3 pr-4">Cohort / Specialty</th>
              <th className="py-3 pr-4">Status</th>
              <th className="py-3 pr-4">Joined</th>
              <th className="py-3 pr-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filtered.map((u) => (
              <tr key={u.id} className="hover:bg-white/5 transition">
                <td className="py-3 pr-4 font-semibold">{u.name}</td>
                <td className="py-3 pr-4 text-white/70">{u.email}</td>
                <td className="py-3 pr-4">
                  <span className="badge capitalize">{u.role}</span>
                </td>
                <td className="py-3 pr-4 text-white/70">
                  {u.cohort ?? u.specialty ?? "—"}
                </td>
                <td className="py-3 pr-4">
                  <span
                    className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize ${
                      u.status === "active"
                        ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-300"
                        : u.status === "pending"
                        ? "border-gold-400/40 bg-gold-400/10 text-gold-200"
                        : "border-red-400/40 bg-red-400/10 text-red-300"
                    }`}
                  >
                    {u.status}
                  </span>
                </td>
                <td className="py-3 pr-4 text-white/60">{u.joined}</td>
                <td className="py-3 pr-4">
                  <div className="flex items-center justify-end gap-1">
                    {u.status === "pending" && (
                      <button
                        onClick={() => setStatus(u.id, "active")}
                        title="Approve"
                        className="rounded-lg p-2 text-emerald-300 hover:bg-emerald-400/10 transition"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                      </button>
                    )}
                    {u.status === "active" ? (
                      <button
                        onClick={() => setStatus(u.id, "suspended")}
                        title="Suspend"
                        className="rounded-lg p-2 text-white/60 hover:bg-white/10 transition"
                      >
                        <Pause className="h-4 w-4" />
                      </button>
                    ) : u.status === "suspended" ? (
                      <button
                        onClick={() => setStatus(u.id, "active")}
                        title="Reactivate"
                        className="rounded-lg p-2 text-emerald-300 hover:bg-emerald-400/10 transition"
                      >
                        <Play className="h-4 w-4" />
                      </button>
                    ) : null}
                    <button
                      onClick={() => offboard(u.id)}
                      title="Offboard"
                      className="rounded-lg p-2 text-red-300 hover:bg-red-400/10 transition"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="py-8 text-center text-white/40">
                  No users found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Onboard a new user"
        subtitle="They’ll receive an invitation email to set up their password."
      >
        <form onSubmit={onboard} className="space-y-4">
          <label className="block">
            <span className="mb-1 block text-xs uppercase tracking-wide text-white/50">Full name</span>
            <input className="input-field" value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs uppercase tracking-wide text-white/50">Email</span>
            <input type="email" className="input-field" value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          {!role && (
            <label className="block">
              <span className="mb-1 block text-xs uppercase tracking-wide text-white/50">Role</span>
              <select className="input-field" value={newRole} onChange={(e) => setNewRole(e.target.value as any)}>
                <option value="student">Student</option>
                <option value="instructor">Instructor</option>
              </select>
            </label>
          )}
          <button className="btn-gold w-full">Send invite</button>
        </form>
      </Modal>
    </div>
  );
}
