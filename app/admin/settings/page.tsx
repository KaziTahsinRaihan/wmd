"use client";

import { useState } from "react";
import PageHeader from "@/components/PageHeader";
import { Save } from "lucide-react";

export default function AdminSettingsPage() {
  const [siteName, setSiteName] = useState("Wise Man's Doctrine");
  const [allowSignup, setAllowSignup] = useState(true);
  const [defaultBand, setDefaultBand] = useState(7);
  const [saved, setSaved] = useState(false);

  return (
    <div className="animate-fade-in">
      <PageHeader
        eyebrow="Settings"
        title={<>Platform <span className="gold-text">configuration</span></>}
        description="Global controls applied across the platform."
      />
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
    </div>
  );
}
