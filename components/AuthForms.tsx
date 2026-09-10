"use client";

import { useState } from "react";
import { ApiError, Gender, Role, useAuth } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { GraduationCap, UserCog, ShieldCheck } from "lucide-react";

const roleOptions: { value: Role; label: string; description: string; icon: any }[] = [
  {
    value: "student",
    label: "Student",
    description: "I’m preparing for the IELTS exam.",
    icon: GraduationCap,
  },
  {
    value: "instructor",
    label: "Instructor",
    description: "I teach and evaluate IELTS candidates.",
    icon: UserCog,
  },
  {
    value: "admin",
    label: "Admin",
    description: "I manage the platform, users and content.",
    icon: ShieldCheck,
  },
];

// Signup never offers "admin" — the platform is seeded with one admin
// account (see server/.env), and only an existing admin can promote/create
// other admins from the dashboard.
const signupRoleOptions = roleOptions.filter((r) => r.value !== "admin");

function RoleSelector({
  value,
  onChange,
  options = roleOptions,
}: {
  value: Role;
  onChange: (r: Role) => void;
  options?: typeof roleOptions;
}) {
  return (
    <div className={`grid gap-2 ${options.length === 2 ? "grid-cols-2" : "grid-cols-3"}`}>
      {options.map((r) => {
        const Icon = r.icon;
        const active = value === r.value;
        return (
          <button
            key={r.value}
            type="button"
            onClick={() => onChange(r.value)}
            className={`flex flex-col items-center gap-1 rounded-xl border p-3 text-center transition ${
              active
                ? "border-gold-400 bg-gold-500/15 text-gold-100 shadow-gold"
                : "border-gold-500/20 bg-ink-800/60 text-white/70 hover:border-gold-400/60"
            }`}
          >
            <Icon className="h-5 w-5" />
            <span className="text-sm font-semibold">{r.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function destinationFor(role: Role) {
  if (role === "student") return "/student";
  if (role === "instructor") return "/instructor";
  return "/admin";
}

export function SignupForm() {
  const router = useRouter();
  const { signup } = useAuth();
  const [role, setRole] = useState<Exclude<Role, "admin">>("student");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [gender, setGender] = useState<Gender | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!name.trim() || !email.trim() || !password) {
      setError("Please complete all fields.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (role === "student" && !gender) {
      setError("Please select your gender. This decides which voice practice room you can enter.");
      return;
    }
    setSubmitting(true);
    try {
      const u = await signup({
        name,
        email,
        password,
        role,
        ...(role === "student" && gender ? { gender } : {}),
      });
      router.push(destinationFor(u.role));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div>
        <span className="mb-2 block text-xs uppercase tracking-wide text-white/50">
          I am signing up as
        </span>
        <RoleSelector value={role} onChange={(r) => setRole(r as Exclude<Role, "admin">)} options={signupRoleOptions} />
        <p className="mt-2 text-xs text-white/50">
          {roleOptions.find((r) => r.value === role)?.description}
        </p>
      </div>
      <div className="grid grid-cols-1 gap-3">
        <label className="block">
          <span className="mb-1 block text-xs uppercase tracking-wide text-white/50">Full name</span>
          <input
            className="input-field"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Aisha Rahman"
            autoComplete="name"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs uppercase tracking-wide text-white/50">Email</span>
          <input
            className="input-field"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs uppercase tracking-wide text-white/50">Password</span>
          <input
            className="input-field"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Choose a strong password"
            autoComplete="new-password"
          />
        </label>
      </div>

      {role === "student" && (
        <div>
          <span className="mb-2 block text-xs uppercase tracking-wide text-white/50">
            Gender
          </span>
          <div className="grid grid-cols-2 gap-2">
            <GenderTile
              active={gender === "male"}
              onClick={() => setGender("male")}
              label="Male"
              accent="#5a8cff"
            />
            <GenderTile
              active={gender === "female"}
              onClick={() => setGender("female")}
              label="Female"
              accent="#e08fd1"
            />
          </div>
          <p className="mt-2 text-xs text-white/50">
            Used to assign you to the matching single-gender voice practice room.
          </p>
        </div>
      )}

      {error && <p className="text-sm text-red-400">{error}</p>}
      <button className="btn-gold w-full" type="submit" disabled={submitting}>
        {submitting ? "Creating account…" : "Create account"}
      </button>
    </form>
  );
}

function GenderTile({
  active,
  onClick,
  label,
  accent,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  accent: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center justify-center gap-2 rounded-xl border p-3 text-center transition ${
        active
          ? "shadow-gold"
          : "border-gold-500/20 bg-ink-800/60 text-white/70 hover:border-gold-400/60"
      }`}
      style={
        active
          ? { borderColor: accent, background: `${accent}1f`, color: "#fff" }
          : undefined
      }
    >
      <span
        className="inline-block h-2 w-2 rounded-full"
        style={{ background: accent }}
      />
      <span className="text-sm font-semibold">{label}</span>
    </button>
  );
}

export function LoginForm() {
  const router = useRouter();
  const { login } = useAuth();
  const [role, setRole] = useState<Role>("student");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email.trim() || !password) {
      setError("Please enter your email and password.");
      return;
    }
    setSubmitting(true);
    try {
      const u = await login(email, password, role);
      router.push(destinationFor(u.role));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div>
        <span className="mb-2 block text-xs uppercase tracking-wide text-white/50">
          Log in as
        </span>
        <RoleSelector value={role} onChange={setRole} />
      </div>
      <div className="grid grid-cols-1 gap-3">
        <label className="block">
          <span className="mb-1 block text-xs uppercase tracking-wide text-white/50">Email</span>
          <input
            className="input-field"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs uppercase tracking-wide text-white/50">Password</span>
          <input
            className="input-field"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete="current-password"
          />
        </label>
      </div>
      {error && <p className="text-sm text-red-400">{error}</p>}
      <div className="flex flex-col gap-2">
        <button className="btn-gold w-full" type="submit" disabled={submitting}>
          {submitting ? "Logging in…" : "Log in"}
        </button>
      </div>
    </form>
  );
}
