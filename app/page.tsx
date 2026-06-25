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
      <main className="pb-24">
        <Header />

        <section className="mx-auto mt-12 max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <div className="inline-flex rounded-full border border-gold/35 bg-gold/10 px-4 py-2 text-sm text-gold">
              Real-time 1v1 competitive coding duels
            </div>
            <h1 className="mt-6 text-5xl font-semibold tracking-tight text-white md:text-7xl">
              Code faster than your opponent. Win the duel.
            </h1>
            <p className="mt-6 text-lg leading-8 text-white/65">
              CodeRoyale puts two developers head-to-head on the same problem. Write your solution, watch your
              opponent type live, and be the first to pass all test cases.
            </p>
            <div className="mt-10 flex flex-wrap justify-center gap-4">
              <Link
                href="/match"
                className="rounded-full bg-white px-8 py-3.5 font-semibold text-ink transition hover:scale-[1.02]"
              >
                Start a duel
              </Link>
              <a
                href="#how-it-works"
                className="rounded-full border border-white/15 px-8 py-3.5 font-semibold text-white/80 transition hover:border-white/30"
              >
                How it works
              </a>
            </div>
          </div>
        </section>

        <section className="mx-auto mt-20 max-w-7xl px-6 lg:px-8">
          <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
            {[
              { value: "100+", label: "Curated problems" },
              { value: "6", label: "Languages" },
              { value: "30 min", label: "Per duel" },
              { value: matchDisplay, label: "Duels played" },
            ].map((s) => (
              <div key={s.label} className="rounded-[20px] border border-white/10 bg-panel/60 p-6 text-center">
                <p className="text-3xl font-semibold text-white">{s.value}</p>
                <p className="mt-1 text-sm text-white/50">{s.label}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="how-it-works" className="mx-auto mt-24 max-w-7xl px-6 lg:px-8">
          <div className="mb-10 text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gold">How it works</p>
            <h2 className="mt-3 text-3xl font-semibold text-white">From room to verdict in minutes</h2>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {[
              {
                step: "01",
                title: "Create a room",
                desc: "Pick your language, difficulty, and share the invite code with your opponent.",
              },
              {
                step: "02",
                title: "Solve the problem",
                desc: "Both players get the same problem. Write your function — see your opponent's code update live.",
              },
              {
                step: "03",
                title: "First to AC wins",
                desc: "Hit Submit. Your code runs against all test cases. Pass them all first and win the duel.",
              },
            ].map((item) => (
              <div key={item.step} className="rounded-[24px] border border-white/10 bg-panel/60 p-7">
                <span className="text-4xl font-semibold text-gold/30">{item.step}</span>
                <h3 className="mt-4 text-lg font-semibold text-white">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-white/55">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="modes" className="mx-auto mt-24 max-w-7xl px-6 lg:px-8">
          <div className="mb-10 text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gold">Modes</p>
            <h2 className="mt-3 text-3xl font-semibold text-white">Competitive mode</h2>
          </div>
          <div className="mx-auto max-w-2xl rounded-[28px] border border-white/10 bg-panel/60 p-8">
            <div className="flex items-start gap-5">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-gold/30 bg-gold/10 text-xl">
                ⚔️
              </span>
              <div>
                <h3 className="text-xl font-semibold text-white">Algorithm Duel</h3>
                <p className="mt-2 text-sm leading-6 text-white/60">
                  Both players receive the same algorithm problem — arrays, strings, dynamic programming, graphs and
                  more. Write a function that passes all test cases before your opponent does.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {["JavaScript", "Python", "C++", "Go", "Rust", "Java"].map((lang) => (
                    <span
                      key={lang}
                      className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs font-semibold text-white/60"
                    >
                      {lang}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto mt-24 max-w-7xl px-6 text-center lg:px-8">
          <div className="rounded-[32px] border border-gold/20 bg-gold/8 px-8 py-16">
            <h2 className="text-4xl font-semibold text-white">Ready to duel?</h2>
            <p className="mt-4 text-white/60">Create a room, send the invite code, and start coding.</p>
            <Link
              href="/match"
              className="mt-8 inline-block rounded-full bg-white px-8 py-3.5 font-semibold text-ink transition hover:scale-[1.02]"
            >
              Start a duel
            </Link>
          </div>
        </section>
      </main>
    </ServerWake>
  );
}
