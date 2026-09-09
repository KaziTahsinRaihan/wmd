"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth";

const HOME_FOR_ROLE = {
  student: "/student",
  instructor: "/instructor",
  admin: "/admin",
} as const;

export default function Logo({ small = false }: { small?: boolean }) {
  const { user } = useAuth();
  // Clicking the logo never signs you out — it just navigates. When signed in,
  // send the user to their own dashboard instead of the public landing page
  // (which would look like a logged-out state). Sign-out only happens via the
  // explicit "Sign out" action.
  const href = user ? HOME_FOR_ROLE[user.role] : "/";

  return (
    <Link href={href} className="group inline-flex items-center gap-2">
      <span
        className={`relative overflow-hidden rounded-full ring-1 ring-gold-500/40 shadow-gold ${
          small ? "h-7 w-7" : "h-9 w-9"
        }`}
      >
        <img
          src="/logo-mark.png"
          alt="Wise Man's Doctrine"
          className="h-full w-full scale-[1.07] object-cover"
          style={{ objectPosition: "52.85% 43.5%" }}
        />
      </span>
      <span
        className={`font-bold tracking-tight ${
          small ? "text-base" : "text-lg"
        } text-white`}
      >
        Wise Man's <span className="gold-text">Doctrine</span>
      </span>
    </Link>
  );
}
