"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronDown,
  LogOut,
  Moon,
  Sun,
  UserCog,
  Upload,
  Trash2,
  KeyRound,
} from "lucide-react";
import { useAuth, User } from "@/lib/auth";
import { useTheme } from "@/lib/theme";
import Modal from "./Modal";
import ChangeCredentialsModal from "./ChangeCredentialsModal";

function initialsFrom(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("") || "U";
}

function Avatar({ user, size = 36 }: { user: User; size?: number }) {
  const style = { width: size, height: size, minWidth: size };
  if (user.avatar) {
    return (
      <img
        src={user.avatar}
        alt={user.name}
        style={style}
        className="rounded-full object-cover ring-1 ring-gold-500/40"
      />
    );
  }
  return (
    <span
      style={style}
      className="grid place-items-center rounded-full bg-gold-gradient text-ink-950 font-semibold text-sm ring-1 ring-gold-500/40"
    >
      {initialsFrom(user.name)}
    </span>
  );
}

export default function UserMenu() {
  const { user, logout, updateProfile } = useAuth();
  const { theme, toggle } = useTheme();
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  if (!user) return null;

  const onSignOut = () => {
    setOpen(false);
    logout();
    router.replace("/");
  };

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-2 rounded-full border border-gold-500/30 bg-ink-900/60 py-1 pl-1 pr-3 text-sm text-white/80 hover:bg-white/5 hover:text-white transition"
      >
        <Avatar user={user} size={32} />
        <span className="hidden sm:inline max-w-[7rem] truncate">{user.name}</span>
        <ChevronDown className="h-4 w-4 opacity-60" />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-40 mt-2 w-72 origin-top-right rounded-2xl border border-gold-500/30 bg-ink-900/95 p-3 shadow-gold backdrop-blur animate-scale-in"
        >
          <div className="flex items-center gap-3 rounded-xl bg-panel-gradient p-3">
            <Avatar user={user} size={44} />
            <div className="min-w-0">
              <p className="truncate font-semibold">{user.name}</p>
              <p className="truncate text-xs text-white/60">{user.email}</p>
              <span className="badge mt-1 capitalize">{user.role}</span>
            </div>
          </div>

          <div className="mt-2 space-y-1">
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setEditing(true);
              }}
              className="nav-link w-full"
              role="menuitem"
            >
              <UserCog className="h-4 w-4" />
              <span className="flex-1 text-left">Edit profile</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setChangingPassword(true);
              }}
              className="nav-link w-full"
              role="menuitem"
            >
              <KeyRound className="h-4 w-4" />
              <span className="flex-1 text-left">Change password</span>
            </button>

            <button
              type="button"
              onClick={toggle}
              className="nav-link w-full"
              role="menuitem"
            >
              {theme === "dark" ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
              <span className="flex-1 text-left">
                {theme === "dark" ? "Light theme" : "Dark theme"}
              </span>
              <span className="text-xs text-white/40 capitalize">{theme}</span>
            </button>

            <button
              type="button"
              onClick={onSignOut}
              className="nav-link w-full"
              role="menuitem"
            >
              <LogOut className="h-4 w-4" />
              <span className="flex-1 text-left">Sign out</span>
            </button>
          </div>
        </div>
      )}

      <ProfileEditor
        open={editing}
        onClose={() => setEditing(false)}
        user={user}
        onSave={(patch) => {
          updateProfile(patch);
          setEditing(false);
        }}
      />

      <ChangeCredentialsModal
        open={changingPassword}
        onClose={() => setChangingPassword(false)}
        currentEmail={user.email}
      />
    </div>
  );
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const BANDS = [5, 5.5, 6, 6.5, 7, 7.5, 8, 8.5, 9];
const COUNTRY_SUGGESTIONS = [
  "United Kingdom",
  "United States",
  "Canada",
  "Australia",
  "New Zealand",
  "Ireland",
  "Germany",
];

function ProfileEditor({
  open,
  onClose,
  user,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  user: User;
  onSave: (patch: Partial<User>) => void;
}) {
  const isStudent = user.role === "student";
  const currentYear = new Date().getFullYear();

  // Personal details (all roles)
  const [name, setName] = useState(user.name);
  const [phone, setPhone] = useState(user.phone ?? "");
  const [avatar, setAvatar] = useState<string | undefined>(user.avatar);

  // Student-only goals
  const [score, setScore] = useState<number>(user.targetScore ?? 7);
  const [month, setMonth] = useState<string>(user.targetMonth ?? MONTHS[new Date().getMonth()]);
  const [year, setYear] = useState<number>(user.targetYear ?? currentYear);
  const [country, setCountry] = useState<string>(user.targetCountry ?? "");

  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (open) {
      setName(user.name);
      setPhone(user.phone ?? "");
      setAvatar(user.avatar);
      setScore(user.targetScore ?? 7);
      setMonth(user.targetMonth ?? MONTHS[new Date().getMonth()]);
      setYear(user.targetYear ?? currentYear);
      setCountry(user.targetCountry ?? "");
      setError(null);
    }
  }, [open, user, currentYear]);

  const onPickFile = () => fileRef.current?.click();

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Image must be under 5 MB.");
      return;
    }
    try {
      const dataUrl = await resizeImage(file, 256);
      setAvatar(dataUrl);
      setError(null);
    } catch {
      setError("Could not read that image.");
    }
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Name is required.");
      return;
    }
    // Email is intentionally omitted — it cannot be changed.
    const patch: Partial<User> = {
      name: trimmedName,
      phone: phone.trim() || undefined,
      avatar,
    };
    if (isStudent) {
      patch.targetScore = score;
      patch.targetMonth = month;
      patch.targetYear = year;
      patch.targetCountry = country.trim() || undefined;
    }
    onSave(patch);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Edit profile"
      subtitle={
        isStudent
          ? "Update your goal, personal details and profile picture."
          : "Update your personal details and profile picture."
      }
    >
      <form onSubmit={submit} className="space-y-5">
        {/* Profile picture — all roles */}
        <div className="flex items-center gap-4">
          <Avatar user={{ ...user, avatar }} size={72} />
          <div className="flex flex-1 flex-col gap-2">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onPickFile}
                className="btn-outline !py-2 !px-3 text-sm"
              >
                <Upload className="h-4 w-4" /> Upload
              </button>
              {avatar && (
                <button
                  type="button"
                  onClick={() => setAvatar(undefined)}
                  className="btn-ghost"
                >
                  <Trash2 className="h-4 w-4" /> Remove
                </button>
              )}
            </div>
            <p className="text-xs text-white/50">
              PNG or JPG, up to 5&nbsp;MB. We'll resize it to a square.
            </p>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={onFileChange}
            />
          </div>
        </div>

        {/* Personal details — all roles */}
        <div>
          <label className="mb-1 block text-xs uppercase tracking-wide text-white/50">
            Full name
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input-field"
            placeholder="Your name"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs uppercase tracking-wide text-white/50">
            Phone number
          </label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="input-field"
            placeholder="Optional"
          />
        </div>

        {/* Email — read-only for everyone */}
        <div>
          <label className="mb-1 block text-xs uppercase tracking-wide text-white/50">
            Email
          </label>
          <input
            value={user.email}
            readOnly
            disabled
            aria-readonly
            className="input-field cursor-not-allowed opacity-60"
          />
          <p className="mt-1 text-xs text-white/40">Email can&apos;t be changed.</p>
        </div>

        {/* Student-only goal fields */}
        {isStudent && (
          <>
            <div>
              <label className="mb-1 block text-xs uppercase tracking-wide text-white/50">
                Target band score
              </label>
              <select
                value={score}
                onChange={(e) => setScore(Number(e.target.value))}
                className="input-field"
              >
                {BANDS.map((b) => (
                  <option key={b} value={b}>
                    {b.toFixed(1)}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs uppercase tracking-wide text-white/50">
                  Test month
                </label>
                <select
                  value={month}
                  onChange={(e) => setMonth(e.target.value)}
                  className="input-field"
                >
                  {MONTHS.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs uppercase tracking-wide text-white/50">
                  Test year
                </label>
                <select
                  value={year}
                  onChange={(e) => setYear(Number(e.target.value))}
                  className="input-field"
                >
                  {[currentYear, currentYear + 1, currentYear + 2].map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs uppercase tracking-wide text-white/50">
                Desired country
              </label>
              <input
                list="profile-country-list"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="input-field"
                placeholder="e.g. Canada"
              />
              <datalist id="profile-country-list">
                {COUNTRY_SUGGESTIONS.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>
          </>
        )}

        {error && (
          <p className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-200">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className="btn-ghost">
            Cancel
          </button>
          <button type="submit" className="btn-gold">
            Save changes
          </button>
        </div>
      </form>
    </Modal>
  );
}

function resizeImage(file: File, max: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("decode"));
      img.onload = () => {
        const { width, height } = img;
        const side = Math.min(width, height);
        const sx = (width - side) / 2;
        const sy = (height - side) / 2;
        const canvas = document.createElement("canvas");
        canvas.width = max;
        canvas.height = max;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("ctx"));
        ctx.drawImage(img, sx, sy, side, side, 0, 0, max, max);
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}
