"use client";

import Link from "next/link";
import Logo from "@/components/Logo";
import ThemeToggle from "@/components/ThemeToggle";
import WizardWelcome from "@/components/WizardWelcome";
import CourseCard from "@/components/CourseCard";
import { COURSES } from "@/lib/courses";
import {
  Headphones,
  BookOpen,
  PenLine,
  Mic,
  Sparkles,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";

const modules = [
  { icon: Headphones, label: "Listening" },
  { icon: BookOpen, label: "Reading" },
  { icon: PenLine, label: "Writing" },
  { icon: Mic, label: "Speaking" },
];

export default function LandingPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-ink-950">
      <WizardWelcome />
      <div className="pointer-events-none absolute inset-0 bg-hero-radial" />
      <div className="pointer-events-none absolute -top-32 left-1/2 h-[40rem] w-[40rem] -translate-x-1/2 rounded-full bg-gold-500/10 blur-3xl" />

      <header className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
        <Logo />
        <nav className="hidden items-center gap-1 sm:flex">
          <a href="#features" className="btn-ghost">Features</a>
          <a href="#courses" className="btn-ghost">Courses</a>
          <a href="#pricing" className="btn-ghost">Pricing</a>
        </nav>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link href="/login" className="btn-ghost">Log in</Link>
          <Link href="/signup" className="btn-gold">
            Get started <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </header>

      <section className="relative z-10 mx-auto max-w-7xl px-6 pb-20 pt-10 sm:pt-16">
        <div className="mx-auto max-w-6xl text-center">
          <div className="relative mx-auto mb-8 h-48 w-48 sm:h-64 sm:w-64">
            <span
              aria-hidden
              className="absolute inset-0 -m-6 rounded-full bg-gold-500/25 blur-3xl animate-aura-pulse"
            />
            <span
              aria-hidden
              className="absolute inset-0 -m-2 rounded-full bg-gradient-to-br from-gold-400/30 via-transparent to-gold-700/20 blur-2xl"
            />
            <div
              className="relative h-full w-full overflow-hidden rounded-full ring-2 ring-gold-500/40 shadow-gold"
              style={{ boxShadow: "0 10px 40px -8px rgba(201,169,89,0.55)" }}
            >
              <img
                src="/logo.png"
                alt="Wise Man's Doctrine — Train · Triumph · Transcend"
                className="h-full w-full scale-[1.08] object-cover"
                style={{ objectPosition: "52.05% 43.72%" }}
              />
            </div>
          </div>

          <span className="badge mb-5">
            <Sparkles className="mr-1.5 h-3 w-3" /> Train · Triumph · Transcend
          </span>
          <h1 className="text-balance text-3xl font-black leading-tight tracking-tight sm:text-5xl">
            <span className="gold-text">Ace</span> your proficienty tests with a{" "}
            <span className="gold-text">Wiseman</span>, a{" "}
            <span className="gold-text">Strategic-Plan</span>, and{" "}
            <span className="gold-text">AI</span> by your side.
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base text-white/70 sm:text-lg">
            Wise Man's Doctrine brings together adaptive practice tests, on-demand AI mock exams,
            and live instructor classes — all calibrated to the band you’re aiming for.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/signup" className="btn-gold">
              Start free <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/login" className="btn-outline">
              I already have an account
            </Link>
          </div>
        </div>
      </section>

      <section id="courses" className="relative z-10 mx-auto max-w-7xl px-6 pb-16 sm:pb-20">
        <div className="mb-10 text-center">
          <span className="badge mb-3">
            <Sparkles className="mr-1.5 h-3 w-3" /> Six pathways, one doctrine
          </span>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Choose your <span className="gold-text">course</span>
          </h2>
          <p className="mt-3 text-white/60">
            From building your first sentence to scripting a band 8 essay — start where you stand.
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {COURSES.map((course) => (
            <CourseCard
              key={course.slug}
              course={course}
              href={`/courses/${course.slug}`}
              cta="View course"
            />
          ))}
        </div>
        <div className="mt-8 text-center">
          <Link href="/courses" className="btn-outline">
            See full course catalog <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-7xl px-6 pb-16">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {modules.map(({ icon: Icon, label }) => (
            <div
              key={label}
              className="panel panel-hover flex flex-col items-center gap-3 py-6 text-center"
            >
              <span className="grid h-12 w-12 place-items-center rounded-xl bg-gold-gradient text-ink-950 shadow-gold">
                <Icon className="h-6 w-6" />
              </span>
              <p className="font-semibold">{label}</p>
              <p className="text-xs text-white/50">Adaptive · timed · graded</p>
            </div>
          ))}
        </div>
      </section>

      <section id="features" className="relative z-10 mx-auto max-w-7xl px-6 py-16">
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="panel">
            <h3 className="text-lg font-bold gold-text">Practice that adapts</h3>
            <p className="mt-2 text-sm text-white/70">
              Full-length section practice for Listening, Reading, Writing and Speaking — with
              instant scoring and explanation.
            </p>
            <ul className="mt-4 space-y-2 text-sm text-white/70">
              {["Timed mock conditions","Band-accurate grading","Module-level analytics"].map((s) => (
                <li key={s} className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-gold-400" />{s}
                </li>
              ))}
            </ul>
          </div>
          <div className="panel">
            <h3 className="text-lg font-bold gold-text">Mock tests, your way</h3>
            <p className="mt-2 text-sm text-white/70">
              Book a mock exam with a real instructor or fire up the AI examiner whenever you’re
              ready — both feed into your performance tracker.
            </p>
            <ul className="mt-4 space-y-2 text-sm text-white/70">
              {["Book with Instructor","Practice with AI","Recorded feedback"].map((s) => (
                <li key={s} className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-gold-400" />{s}
                </li>
              ))}
            </ul>
          </div>
          <div className="panel">
            <h3 className="text-lg font-bold gold-text">Performance tracker</h3>
            <p className="mt-2 text-sm text-white/70">
              A live, visual line graph of your trajectory across all four modules — so you
              always know what to fix next.
            </p>
            <ul className="mt-4 space-y-2 text-sm text-white/70">
              {["Module-level trend lines","Target band gap","Weekly recommendations"].map((s) => (
                <li key={s} className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-gold-400" />{s}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section id="pricing" className="relative z-10 mx-auto max-w-5xl px-6 pb-24">
        <div className="panel relative overflow-hidden">
          <div className="absolute inset-0 -z-10 bg-panel-gradient" />
          <div className="grid items-center gap-6 sm:grid-cols-[1fr_auto]">
            <div>
              <h3 className="text-2xl font-bold">
                Ready to <span className="gold-text">begin</span>?
              </h3>
              <p className="mt-2 text-white/70">
                Create your free account and we’ll personalize a study plan for your target band.
              </p>
            </div>
            <Link href="/signup" className="btn-gold whitespace-nowrap">
              Create free account <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <footer className="relative z-10 border-t border-white/5 py-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-6 sm:flex-row">
          <Logo small />
          <p className="text-xs text-white/40">
            © {new Date().getFullYear()} Wise Man's Doctrine. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
