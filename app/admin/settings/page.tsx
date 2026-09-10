"use client";

import { useState } from "react";
import PageHeader from "@/components/PageHeader";
import ChangeCredentialsModal from "@/components/ChangeCredentialsModal";
import { useAuth } from "@/lib/auth";
import { KeyRound, Save } from "lucide-react";

export default function AdminSettingsPage() {
  const { user } = useAuth();
  const [siteName, setSiteName] = useState("Wise Man's Doctrine");
  const [allowSignup, setAllowSignup] = useState(true);
  const [defaultBand, setDefaultBand] = useState(7);
  const [saved, setSaved] = useState(false);
  const [changingCredentials, setChangingCredentials] = useState(false);

  return (
    <div className="animate-fade-in">
      <PageHeader
        eyebrow="Settings"
        title={<>Platform <span className="gold-text">configuration</span></>}
        description="Global controls applied across the platform."
      />

      <div className="panel mb-6 max-w-2xl">
        <h2 className="text-lg font-bold">Admin account</h2>
        <p className="mt-1 text-sm text-white/60">
          Change the email and password used to sign in as admin. The seeded demo credentials
          (<code className="rounded bg-white/10 px-1 py-0.5">admin@demo.io</code>) should be
          replaced with your own as soon as possible.
        </p>
        <div className="mt-4 flex items-center justify-between rounded-xl border border-gold-500/20 bg-ink-800/60 p-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{user?.email}</p>
            <p className="text-xs text-white/50">Signed in as admin</p>
          </div>
          <button type="button" onClick={() => setChangingCredentials(true)} className="btn-outline shrink-0">
            <KeyRound className="h-4 w-4" /> Change email / password
          </button>
        </div>
      </div>

      <div className="panel max-w-2xl space-y-5">
        <label className="block">
          <span className="mb-1 block text-xs uppercase tracking-wide text-white/50">Site name</span>
          <input className="input-field" value={siteName} onChange={(e) => setSiteName(e.target.value)} />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs uppercase tracking-wide text-white/50">Default target band</span>
          <input
            type="number"
            min={5}
            max={9}
            step={0.5}
            className="input-field"
            value={defaultBand}
            onChange={(e) => setDefaultBand(Number(e.target.value))}
          />
        </label>
        <label className="flex items-center justify-between rounded-xl border border-gold-500/20 bg-ink-800/60 p-3">
          <div>
            <p className="text-sm font-semibold">Allow public sign-ups</p>
            <p className="text-xs text-white/50">If off, only invited users can register.</p>
          </div>
          <input
            type="checkbox"
            className="h-5 w-5 accent-gold-400"
            checked={allowSignup}
            onChange={(e) => setAllowSignup(e.target.checked)}
          />
        </label>
        <button onClick={() => setSaved(true)} className="btn-gold">
          <Save className="h-4 w-4" /> Save changes
        </button>
        {saved && <p className="text-sm text-gold-300">✓ Settings saved.</p>}
      </div>

      <ChangeCredentialsModal
        open={changingCredentials}
        onClose={() => setChangingCredentials(false)}
        currentEmail={user?.email ?? ""}
        allowEmail
      />
    </div>
  );
}
