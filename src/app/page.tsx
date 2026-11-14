import Link from "next/link";
import { AuthLink } from "@/features/auth";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col bg-background">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-6">
        <span className="text-xl font-bold tracking-tight text-primary">
          Spanglish
        </span>
        <nav className="flex items-center gap-3 text-sm font-semibold">
          <Link
            href="/login"
            className="rounded-lg px-3 py-2 text-[#5a6a85] hover:bg-surface hover:shadow-modern-soft"
          >
            Sign in
          </Link>
          <Link
            href="/register"
            className="rounded-lg bg-primary px-4 py-2 text-white shadow-modern-soft hover:bg-[#4570ea]"
          >
            Get started
          </Link>
        </nav>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col items-center justify-center gap-10 px-6 pb-20 pt-8 text-center">
        <div className="rounded-2xl bg-surface px-8 py-12 shadow-modern sm:px-14">
          <h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-[#2a3547] sm:text-5xl">
            Learn Spanish and English,{" "}
            <span className="text-primary">your way</span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-[#5a6a85]">
            Spanglish helps you practice both languages with lessons tailored to your
            level. Sign in when you are ready — auth wiring comes later.
          </p>
          <div className="mx-auto mt-10 flex w-full max-w-sm flex-col gap-3 sm:flex-row sm:items-stretch">
            <AuthLink href="/register">Create free account</AuthLink>
            <AuthLink href="/login" variant="secondary">
              Sign in
            </AuthLink>
          </div>
        </div>
      </main>
    </div>
  );
}
