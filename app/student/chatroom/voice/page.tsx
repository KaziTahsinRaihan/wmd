"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import PageHeader from "@/components/PageHeader";
import Modal from "@/components/Modal";
import { useAuth } from "@/lib/auth";
import type { Gender } from "@/lib/auth";
import {
  VOICE_ROOMS,
  VoicePresence,
  VoiceRoom,
  currentRoomOf,
  joinRoom,
  leaveRoom,
  roomsByGender,
  setMuted,
  useVoicePresence,
} from "@/lib/voice-rooms";
import {
  AlertCircle,
  ArrowLeft,
  LogOut,
  Mic,
  MicOff,
  Phone,
  Users,
  Volume2,
} from "lucide-react";

export default function VoicePracticeRoomsPage() {
  const { user, updateProfile } = useAuth();
  const presence = useVoicePresence();
  const [joinError, setJoinError] = useState<string | null>(null);

  // Leave on unmount so stale presence doesn't linger if the user closes the tab
  // without explicitly leaving.
  useEffect(() => {
    return () => {
      if (user) leaveRoom(user.id);
    };
  }, [user]);

  if (!user) return null;

  // Legacy/demo accounts created before gender was added to signup may not
  // have one yet — block entry until they pick.
  if (!user.gender) {
    return (
      <GenderRequiredScreen onSelect={(g) => updateProfile({ gender: g })} />
    );
  }

  const myRoomId = currentRoomOf(user.id);
  const myPresence = presence.find((p) => p.userId === user.id) ?? null;
  const myRooms = roomsByGender(user.gender);

  const onJoin = (roomId: string) => {
    setJoinError(null);
    if (!user.gender) return;
    const result = joinRoom({
      userId: user.id,
      userName: user.name,
      gender: user.gender,
      roomId,
    });
    if (!result.ok) setJoinError(result.reason);
  };

  return (
    <div className="animate-fade-in">
      <div className="mb-4 flex items-center justify-between">
        <Link
          href="/student/chatroom"
          className="inline-flex items-center gap-1.5 text-sm text-white/70 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" /> Back to ChatRoom
        </Link>
        <span className="badge capitalize">
          Your access: {user.gender}-only
        </span>
      </div>

      <PageHeader
        eyebrow="Voice Practice"
        title={
          <>
            <span className="capitalize">{user.gender}</span>-only{" "}
            <span className="gold-text">Voice Rooms</span>
          </>
        }
        description="Drop into a small group to practice speaking out loud. Rooms here are restricted to your gender as declared during sign-up."
      />

      {joinError && (
        <p className="mb-3 flex items-center gap-2 rounded-lg border border-red-400/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          <AlertCircle className="h-4 w-4 shrink-0" /> {joinError}
        </p>
      )}

      {myPresence ? (
        <InRoomPanel
          presence={presence}
          me={myPresence}
          room={VOICE_ROOMS.find((r) => r.id === myPresence.roomId)!}
          onLeave={() => leaveRoom(user.id)}
          onToggleMute={() => setMuted(user.id, !myPresence.muted)}
        />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {myRooms.map((room) => (
            <RoomCard
              key={room.id}
              room={room}
              presence={presence}
              currentRoomId={myRoomId}
              onJoin={onJoin}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

// ============================================================================
// Room card
// ============================================================================

function RoomCard({
  room,
  presence,
  currentRoomId,
  onJoin,
}: {
  room: VoiceRoom;
  presence: VoicePresence[];
  currentRoomId: string | null;
  onJoin: (roomId: string) => void;
}) {
  const accent = room.gender === "male" ? "#5a8cff" : "#e08fd1";
  const inRoom = presence.filter((p) => p.roomId === room.id);
  const isFull = inRoom.length >= room.capacity;
  const canJoin = !isFull && !currentRoomId;

  return (
    <li
      className="panel flex h-full flex-col"
      style={{ borderColor: `${accent}55` }}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="flex items-center gap-1.5 text-sm font-bold">
            <Volume2 className="h-4 w-4 text-gold-300" />
            {room.name}
          </p>
          <p className="mt-0.5 flex items-center gap-1 text-[11px] text-white/50">
            <Users className="h-3 w-3" />
            {inRoom.length} / {room.capacity}
            {isFull && <span className="ml-1 text-red-300">· full</span>}
          </p>
        </div>
        <span
          className="inline-block h-2 w-2 rounded-full"
          style={{ background: accent }}
        />
      </div>

      <div className="mt-3 flex-1">
        {inRoom.length === 0 ? (
          <p className="text-xs italic text-white/45">No one here yet.</p>
        ) : (
          <ul className="flex flex-wrap gap-1.5">
            {inRoom.map((p) => (
              <li
                key={p.userId}
                className="inline-flex items-center gap-1 rounded-full bg-white/5 px-2 py-0.5 text-[11px] text-white/75"
              >
                {p.muted ? (
                  <MicOff className="h-3 w-3 text-white/40" />
                ) : (
                  <Mic className="h-3 w-3 text-green-300" />
                )}
                {p.userName.split(" ")[0]}
              </li>
            ))}
          </ul>
        )}
      </div>

      <button
        type="button"
        onClick={() => onJoin(room.id)}
        disabled={!canJoin}
        className="btn-outline mt-4 w-full disabled:cursor-not-allowed disabled:opacity-40"
        title={
          isFull
            ? "Room is full"
            : currentRoomId
            ? "Leave your current room first"
            : "Join this room"
        }
      >
        <Phone className="h-4 w-4" /> Join room
      </button>
    </li>
  );
}

// ============================================================================
// In-room view
// ============================================================================

function InRoomPanel({
  presence,
  me,
  room,
  onLeave,
  onToggleMute,
}: {
  presence: VoicePresence[];
  me: VoicePresence;
  room: VoiceRoom;
  onLeave: () => void;
  onToggleMute: () => void;
}) {
  const accent = room.gender === "male" ? "#5a8cff" : "#e08fd1";
  const others = useMemo(
    () =>
      presence
        .filter((p) => p.roomId === room.id && p.userId !== me.userId)
        .sort((a, b) => a.joinedAt.localeCompare(b.joinedAt)),
    [presence, room.id, me.userId],
  );

  return (
    <div
      className="rounded-2xl border p-5"
      style={{ borderColor: `${accent}55`, background: `${accent}14` }}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-white/50">
            You are in
          </p>
          <h3 className="text-xl font-bold">
            <span
              className="mr-2 inline-block h-2 w-2 rounded-full align-middle"
              style={{ background: accent }}
            />
            {room.name}{" "}
            <span className="text-white/55">· {room.gender}-only</span>
          </h3>
          <p className="mt-0.5 text-xs text-white/55">
            {1 + others.length} / {room.capacity} in the room
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onToggleMute}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-semibold transition ${
              me.muted
                ? "border-white/15 bg-white/5 text-white/80 hover:bg-white/10"
                : "border-green-400/50 bg-green-500/15 text-green-200 hover:bg-green-500/20"
            }`}
          >
            {me.muted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            {me.muted ? "Unmute" : "Mute"}
          </button>
          <button
            type="button"
            onClick={onLeave}
            className="inline-flex items-center gap-1.5 rounded-lg border border-red-400/40 bg-red-500/10 px-3 py-1.5 text-sm font-semibold text-red-200 transition hover:bg-red-500/15"
          >
            <LogOut className="h-4 w-4" /> Leave
          </button>
        </div>
      </div>

      <ul className="mt-5 grid gap-2 sm:grid-cols-2">
        <Participant presence={me} self />
        {others.map((p) => (
          <Participant key={p.userId} presence={p} />
        ))}
        {others.length === 0 && (
          <li className="rounded-lg border border-dashed border-white/15 px-3 py-2 text-xs italic text-white/45">
            Waiting for other wizards to join…
          </li>
        )}
      </ul>

      <p className="mt-3 text-[11px] text-white/45">
        Demo voice room — presence and mute state sync in real time across
        signed-in sessions. Audio transport will arrive with the live backend.
      </p>
    </div>
  );
}

function Participant({
  presence,
  self,
}: {
  presence: VoicePresence;
  self?: boolean;
}) {
  return (
    <li
      className={`flex items-center justify-between rounded-lg border px-3 py-2 text-sm ${
        self
          ? "border-gold-500/40 bg-gold-500/10"
          : "border-white/10 bg-ink-800/40"
      }`}
    >
      <span className="flex items-center gap-2">
        <Users className="h-3.5 w-3.5 text-white/50" />
        <span className="font-semibold">{presence.userName}</span>
        {self && <span className="badge text-[10px] !py-0">You</span>}
      </span>
      {presence.muted ? (
        <MicOff className="h-4 w-4 text-white/50" />
      ) : (
        <Mic className="h-4 w-4 text-green-300" />
      )}
    </li>
  );
}

// ============================================================================
// Legacy-account gender prompt
// ============================================================================

function GenderRequiredScreen({
  onSelect,
}: {
  onSelect: (g: Gender) => void;
}) {
  return (
    <div className="animate-fade-in">
      <PageHeader
        eyebrow="Voice Practice"
        title={
          <>
            Confirm your <span className="gold-text">gender</span>
          </>
        }
        description="Voice practice rooms are single-gender. Your selection is saved to your profile and decides which rooms you can ever enter from this account."
      />
      <Modal
        open
        onClose={() => undefined}
        closeable={false}
        title="Select your gender"
        subtitle="This is normally asked at sign-up. Your demo account was created before that, so please confirm now."
      >
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => onSelect("male")}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-6 text-center transition hover:border-[#5a8cff66] hover:bg-[#5a8cff14]"
          >
            <span
              className="mx-auto mb-2 inline-block h-3 w-3 rounded-full"
              style={{ background: "#5a8cff" }}
            />
            <p className="text-lg font-bold">Male</p>
          </button>
          <button
            type="button"
            onClick={() => onSelect("female")}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-6 text-center transition hover:border-[#e08fd166] hover:bg-[#e08fd114]"
          >
            <span
              className="mx-auto mb-2 inline-block h-3 w-3 rounded-full"
              style={{ background: "#e08fd1" }}
            />
            <p className="text-lg font-bold">Female</p>
          </button>
        </div>
      </Modal>
    </div>
  );
}
