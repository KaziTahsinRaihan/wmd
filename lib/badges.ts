import type { LucideIcon } from "lucide-react";
import {
  Sparkle,
  Eye,
  Wand2,
  Star,
  Flame,
  BookOpen,
  Moon,
  FlaskConical,
  Zap,
  Sparkles,
  Gem,
  Stars,
  Crown,
  ScrollText,
  Shield,
  Library,
  Trophy,
} from "lucide-react";

export type Badge = {
  band: number;
  name: string;
  description: string;
  Icon: LucideIcon;
  // tailwind gradient class for the badge medallion
  ring: string;
};

// Ascending order — 17 tiers from 1.0 to 9.0 in 0.5 steps.
export const BADGES: Badge[] = [
  { band: 1.0, name: "The Awakening Novice",            description: "The first flicker of language. Curiosity opens the gate.",          Icon: Sparkle,      ring: "from-slate-400 to-slate-600" },
  { band: 1.5, name: "Spellbound Apprentice",           description: "You sense the patterns. The grammar of magic begins to take shape.", Icon: Eye,          ring: "from-slate-300 to-slate-500" },
  { band: 2.0, name: "Incantation Initiate",            description: "First chants land — short phrases shaped with intention.",          Icon: Wand2,        ring: "from-zinc-300 to-zinc-500" },
  { band: 2.5, name: "Charm Weaver",                    description: "You weave simple charms — basic ideas, expressed plainly.",         Icon: Star,         ring: "from-stone-300 to-stone-500" },
  { band: 3.0, name: "Acolyte of the Elements",         description: "You command the elements of grammar with growing confidence.",      Icon: Flame,        ring: "from-amber-700 to-amber-900" },
  { band: 3.5, name: "Rune Scholar",                    description: "Runes (letters and clauses) begin to bend to your study.",          Icon: BookOpen,     ring: "from-amber-600 to-amber-800" },
  { band: 4.0, name: "Mystic Adept",                    description: "Your craft holds together. Communication is real, if rough.",       Icon: Moon,         ring: "from-amber-500 to-amber-700" },
  { band: 4.5, name: "Alchemist of Words",              description: "You transmute thoughts into language with deliberate care.",        Icon: FlaskConical, ring: "from-amber-400 to-amber-600" },
  { band: 5.0, name: "Grand Conjurer",                  description: "Sparks fly — clarity emerges where confusion once ruled.",          Icon: Zap,          ring: "from-yellow-500 to-amber-700" },
  { band: 5.5, name: "Arcane Specialist",               description: "Specialised vocabulary takes shape across topics.",                 Icon: Sparkles,     ring: "from-yellow-400 to-amber-600" },
  { band: 6.0, name: "Spellmaster",                     description: "You command the language. Mistakes shrink and intent shines.",      Icon: Gem,          ring: "from-gold-400 to-gold-700" },
  { band: 6.5, name: "High Sorcerer / High Sorceress",  description: "Complex incantations come fluently. The arcane is yours.",          Icon: Stars,        ring: "from-gold-300 to-gold-600" },
  { band: 7.0, name: "Archmage",                        description: "The mark of mastery — accurate, flexible, persuasive language.",    Icon: Crown,        ring: "from-gold-300 to-gold-500" },
  { band: 7.5, name: "Chronicler of Eldritch Lore",     description: "You record sophisticated ideas with grace and precision.",          Icon: ScrollText,   ring: "from-gold-200 to-gold-500" },
  { band: 8.0, name: "Vanguard of the Mystic Order",    description: "You lead by example — near-native fluency and accuracy.",          Icon: Shield,       ring: "from-gold-200 to-gold-400" },
  { band: 8.5, name: "Keeper of the Eternal Grimoire",  description: "Few reach this tome. Your craft endures.",                          Icon: Library,      ring: "from-gold-100 to-gold-400" },
  { band: 9.0, name: "Supreme Sovereign of the Arcane", description: "The pinnacle. Truly native command of the magical word.",           Icon: Trophy,       ring: "from-gold-100 to-gold-300" },
];

export function getBadgeForBand(band: number): Badge {
  if (!band || band < 1.0) return BADGES[0];
  // Pick the highest badge whose threshold is ≤ band
  let current = BADGES[0];
  for (const b of BADGES) {
    if (band + 1e-6 >= b.band) current = b;
    else break;
  }
  return current;
}

// Bands are only valid at 0.5 increments — never quote raw averages like 6.875.
export function roundToHalf(band: number): number {
  return Math.round(band * 2) / 2;
}

// Returns the user's current badge only if they've actually earned one
// (i.e. completed at least one mock with a band ≥ 1.0). Null for new users.
export function getEarnedBadge(bestBand: number): Badge | null {
  if (!bestBand || bestBand < 1.0) return null;
  return getBadgeForBand(bestBand);
}

export function getNextBadge(band: number): Badge | null {
  const current = getBadgeForBand(band);
  const idx = BADGES.findIndex((b) => b.band === current.band);
  return idx >= 0 && idx < BADGES.length - 1 ? BADGES[idx + 1] : null;
}

// ============================================================================
// Climb tracking — remembers the highest band-tier the user has already seen
// celebrated, per dimension. Used by the performance page to fire the scroll.
// ============================================================================
export type ModuleKey = "overall" | "listening" | "reading" | "writing" | "speaking";
export type SeenBands = Partial<Record<ModuleKey, number>>;

const seenKey = (userId: string) => `wise-mans-doctrine:badges-seen:${userId}`;

export function getSeenBands(userId: string): SeenBands {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(seenKey(userId));
    return raw ? (JSON.parse(raw) as SeenBands) : {};
  } catch {
    return {};
  }
}

export function setSeenBand(
  userId: string,
  key: ModuleKey,
  band: number,
): SeenBands {
  const current = getSeenBands(userId);
  current[key] = band;
  if (typeof window !== "undefined") {
    window.localStorage.setItem(seenKey(userId), JSON.stringify(current));
  }
  return current;
}

export function setSeenBands(userId: string, patch: SeenBands): SeenBands {
  const current = { ...getSeenBands(userId), ...patch };
  if (typeof window !== "undefined") {
    window.localStorage.setItem(seenKey(userId), JSON.stringify(current));
  }
  return current;
}

// Returns the badge that should be celebrated, if any — i.e. the user has just
// crossed a 0.5 tier they hadn't crossed before.
export function detectClimb(
  userId: string,
  key: ModuleKey,
  currentBand: number,
): Badge | null {
  const seen = getSeenBands(userId)[key] ?? 0;
  const currentBadge = getBadgeForBand(currentBand);
  // We celebrate when the new badge's threshold is strictly higher than the
  // last seen, AND the user has actually achieved a band ≥ 1.0.
  if (currentBand < 1.0) return null;
  if (currentBadge.band <= seen) return null;
  return currentBadge;
}
