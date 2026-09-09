"use client";

import { useState } from "react";
import PageHeader from "@/components/PageHeader";
import { instructorSchedule } from "@/lib/mock-data";
import { Mic, MicOff, ScreenShare, Users, Video, VideoOff } from "lucide-react";

export default function ConductClassPage() {
  const [live, setLive] = useState<string | null>(null);
  const [mic, setMic] = useState(true);
  const [cam, setCam] = useState(true);

  return (
    <div className="animate-fade-in">
      <PageHeader
        eyebrow="Conduct Class"
        title={<>Launch a <span className="gold-text">live</span> class</>}
        description="Pick a scheduled session and go live. Students see the join button on their dashboard."
      />

      {live ? (
        <div className="panel">
          <div className="aspect-video w-full overflow-hidden rounded-xl border border-gold-500/30 bg-ink-gradient grid place-items-center">
            {cam ? (
              <div className="text-center">
                <span className="grid h-20 w-20 mx-auto place-items-center rounded-full bg-gold-gradient text-ink-950 font-bold text-2xl">
                  LIVE
                </span>
                <p className="mt-3 text-sm text-white/70">Your camera preview</p>
              </div>
            ) : (
              <p className="text-sm text-white/50">Camera is off</p>
            )}
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm text-white/70">
              <p className="font-semibold">{instructorSchedule.find((c) => c.id === live)?.title}</p>
              <p className="text-xs text-white/50 inline-flex items-center gap-1">
                <Users className="h-3.5 w-3.5" />{" "}
                {instructorSchedule.find((c) => c.id === live)?.seats} students
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setMic((m) => !m)} className="btn-outline">
                {mic ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
              </button>
              <button onClick={() => setCam((c) => !c)} className="btn-outline">
                {cam ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
              </button>
              <button className="btn-outline">
                <ScreenShare className="h-4 w-4" /> Share
              </button>
              <button
                onClick={() => setLive(null)}
                className="rounded-lg bg-red-500/80 px-5 py-2.5 font-semibold text-white hover:bg-red-500 transition"
              >
                End class
              </button>
            </div>
          </div>
          <p className="mt-3 text-xs text-white/40">
            Preview UI — wire to Jitsi/Daily/Twilio Video to enable real WebRTC sessions.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {instructorSchedule.map((c) => (
            <div key={c.id} className="panel">
              <p className="font-semibold">{c.title}</p>
              <p className="text-xs text-white/50 mt-1">
                {c.cohort} · {c.date} · {c.time}
              </p>
              <p className="text-xs text-white/50 mt-1 inline-flex items-center gap-1">
                <Users className="h-3.5 w-3.5" /> {c.seats} seats filled
              </p>
              <button onClick={() => setLive(c.id)} className="btn-gold mt-4 w-full">
                <Video className="h-4 w-4" /> Go live
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
