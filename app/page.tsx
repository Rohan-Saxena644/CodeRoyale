import Link from "next/link";
import { Header } from "@/components/header";
import { ServerWake } from "@/components/server-wake";
import { prisma } from "@/lib/prisma";

async function getMatchCount(): Promise<number> {
  try {
    return await prisma.match.count({ where: { status: "finished" } });
  } catch {
    return 0;
  }
}

export default async function HomePage() {
  const finishedMatches = await getMatchCount();
  const matchDisplay = finishedMatches > 0 ? `${finishedMatches}+` : "0";

  return (
    <ServerWake>
      <main className="overflow-x-hidden pb-24">
        <Header />

        {/* ── Hero ── */}
        <section className="relative mx-auto mt-10 max-w-7xl px-6 lg:px-8">
          <div className="pointer-events-none absolute inset-0 flex justify-center">
            <div className="h-[480px] w-[700px] rounded-full bg-gold/5 blur-[120px]" />
          </div>
          <div className="relative mx-auto max-w-3xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-gold/35 bg-gold/10 px-4 py-2 text-sm font-medium text-gold">
              <span className="h-1.5 w-1.5 rounded-full bg-gold animate-pulse" />
              Real-time 1v1 competitive coding duels
            </div>
            <h1 className="mt-6 text-5xl font-semibold tracking-tight text-white md:text-7xl">
              Code faster.<br />
              <span className="text-gold">Win the duel.</span>
            </h1>
            <p className="mt-6 text-lg leading-8 text-white/60">
              Two developers. One problem. First to pass all test cases wins.
              Watch your opponent's code evolve in real time.
            </p>
            <div className="mt-10 flex flex-wrap justify-center gap-4">
              <Link
                href="/match"
                className="rounded-full bg-white px-8 py-3.5 font-semibold text-ink shadow-[0_0_32px_rgba(255,246,228,0.12)] transition hover:scale-[1.02] hover:shadow-[0_0_48px_rgba(255,246,228,0.18)]"
              >
                Start a duel →
              </Link>
              <a
                href="#how-it-works"
                className="rounded-full border border-white/15 px-8 py-3.5 font-semibold text-white/75 transition hover:border-white/30 hover:text-white"
              >
                How it works
              </a>
            </div>
          </div>
        </section>

        {/* ── Stats ── */}
        <section className="mx-auto mt-20 max-w-7xl px-6 lg:px-8">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {[
              { value: "100+", label: "Curated problems", icon: "📚" },
              { value: "6",    label: "Languages",        icon: "⚙️" },
              { value: "30m",  label: "Per duel",         icon: "⏱️" },
              { value: matchDisplay, label: "Duels played", icon: "⚔️" },
            ].map((s) => (
              <div
                key={s.label}
                className="flex flex-col items-center gap-2 rounded-[20px] border border-white/10 bg-panel/60 p-6 text-center"
              >
                <span className="text-2xl">{s.icon}</span>
                <p className="text-3xl font-semibold text-white">{s.value}</p>
                <p className="text-xs text-white/45 uppercase tracking-[0.16em]">{s.label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── How it works ── */}
        <section id="how-it-works" className="mx-auto mt-28 max-w-7xl px-6 lg:px-8">
          <div className="mb-12 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-gold">How it works</p>
            <h2 className="mt-3 text-3xl font-semibold text-white">From room to verdict in minutes</h2>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {[
              {
                step: "01",
                icon: "🏠",
                title: "Create a room",
                desc: "Pick your language, difficulty, and share the invite code with your opponent.",
              },
              {
                step: "02",
                icon: "💻",
                title: "Solve the problem",
                desc: "Both players get the same problem. Write your function — see your opponent's code update live.",
              },
              {
                step: "03",
                icon: "🏆",
                title: "First to AC wins",
                desc: "Hit Submit. Your code runs against all test cases. Pass them all first and win the duel.",
              },
            ].map((item, i) => (
              <div key={item.step} className="relative rounded-[24px] border border-white/10 bg-panel/60 p-7">
                {i < 2 && (
                  <div className="absolute -right-3 top-1/2 z-10 hidden -translate-y-1/2 rounded-full border border-white/10 bg-ink px-2 py-1 text-xs text-white/30 md:block">
                    →
                  </div>
                )}
                <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-black/30 text-lg">
                  {item.icon}
                </div>
                <span className="block text-4xl font-semibold text-gold/20">{item.step}</span>
                <h3 className="mt-2 text-lg font-semibold text-white">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-white/50">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Languages ── */}
        <section id="modes" className="mx-auto mt-28 max-w-7xl px-6 lg:px-8">
          <div className="mb-12 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-gold">Supported</p>
            <h2 className="mt-3 text-3xl font-semibold text-white">Pick your weapon</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { lang: "JavaScript", icon: "🟨", desc: "V8-powered, runs every time" },
              { lang: "Python",     icon: "🐍", desc: "CPython 3, batteries included" },
              { lang: "C++",        icon: "⚡", desc: "Raw speed, full STL" },
              { lang: "Go",         icon: "🔵", desc: "Fast compile, clean output" },
              { lang: "Rust",       icon: "🦀", desc: "Memory-safe, zero overhead" },
              { lang: "Java",       icon: "☕", desc: "JVM classic, full stdlib" },
            ].map((item) => (
              <div
                key={item.lang}
                className="flex items-center gap-4 rounded-[20px] border border-white/10 bg-panel/60 p-5 transition hover:border-white/20"
              >
                <span className="text-3xl">{item.icon}</span>
                <div>
                  <p className="font-semibold text-white">{item.lang}</p>
                  <p className="mt-0.5 text-xs text-white/45">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="mx-auto mt-28 max-w-7xl px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-[32px] border border-white/10 bg-panel/80 px-8 py-20 text-center">
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute left-1/4 top-0 h-64 w-64 -translate-y-1/2 rounded-full bg-gold/8 blur-[80px]" />
              <div className="absolute right-1/4 bottom-0 h-64 w-64 translate-y-1/2 rounded-full bg-gold/6 blur-[80px]" />
              <div className="absolute inset-0 opacity-[0.03]"
                style={{
                  backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.8) 1px, transparent 1px)",
                  backgroundSize: "32px 32px",
                }} />
            </div>
            <div className="relative">
              <div className="mx-auto mb-6 inline-flex h-16 w-16 items-center justify-center rounded-3xl border border-gold/30 bg-gold/12 text-3xl">
                ⚔️
              </div>
              <h2 className="text-4xl font-semibold text-white md:text-5xl">
                Ready to prove<br />
                <span className="text-gold">you're the fastest?</span>
              </h2>
              <p className="mx-auto mt-5 max-w-md text-base text-white/55">
                Create a room, send your opponent the invite code, and start coding.
                The better dev wins.
              </p>
              <div className="mt-10 flex flex-wrap justify-center gap-4">
                <Link
                  href="/match"
                  className="rounded-full bg-gold px-10 py-4 text-base font-semibold text-ink shadow-[0_0_40px_rgba(255,200,60,0.25)] transition hover:scale-[1.02] hover:shadow-[0_0_60px_rgba(255,200,60,0.35)]"
                >
                  Start a duel →
                </Link>
                <a
                  href="#how-it-works"
                  className="rounded-full border border-white/15 px-10 py-4 text-base font-semibold text-white/70 transition hover:border-white/30 hover:text-white"
                >
                  See how it works
                </a>
              </div>
              <div className="mt-10 flex flex-wrap justify-center gap-6 text-xs text-white/30">
                <span>✓ No sign-up required</span>
                <span>✓ Free to use</span>
                <span>✓ 6 languages supported</span>
                <span>✓ 100+ problems</span>
              </div>
            </div>
          </div>
        </section>
      </main>
    </ServerWake>
  );
}
