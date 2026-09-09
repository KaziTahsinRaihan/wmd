import Link from "next/link";
import Logo from "@/components/Logo";
import ThemeToggle from "@/components/ThemeToggle";
import { LoginForm } from "@/components/AuthForms";

export default function LoginPage() {
  return (
    <div className="relative min-h-screen bg-ink-950">
      <div className="pointer-events-none absolute inset-0 bg-hero-radial opacity-70" />
      <div className="relative mx-auto flex min-h-screen max-w-6xl flex-col px-6 py-6">
        <header className="flex items-center justify-between gap-3">
          <Logo />
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link href="/signup" className="btn-ghost">
              New here? <span className="gold-text font-semibold">Create an account</span>
            </Link>
          </div>
        </header>
        <main className="flex flex-1 items-center justify-center py-12">
          <div className="w-full max-w-md panel">
            <h1 className="text-2xl font-bold tracking-tight">
              Welcome back to <span className="gold-text">Wise Man's Doctrine</span>
            </h1>
            <p className="mt-1 text-sm text-white/60">
              Choose your role and sign in.
            </p>
            <div className="mt-6">
              <LoginForm />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
