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

const stats = ["100+ Problems", "6 Languages", "Real-time Sync", "No Signup"];

function StatusBadge({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "primary" | "success" | "warning";
}) {
  const classes = {
    neutral: "border-borderSoft bg-surface3 text-textMuted",
    primary: "border-primary/30 bg-primary/10 text-primary",
    success: "border-success/30 bg-success/10 text-success",
    warning: "border-warning/30 bg-warning/10 text-warning",
  };

  return (
    <span className={`rounded-md border px-2 py-1 text-xs font-medium ${classes[tone]}`}>
      {children}
    </span>
  );
}

export default async function HomePage() {
  const finishedMatches = await getMatchCount();
  const matchDisplay = finishedMatches > 0 ? `${finishedMatches}+ duels completed` : "Live duel ready";

  return (
    <ServerWake>
      <main className="overflow-x-hidden pb-16">
        <Header />

        <section className="mx-auto grid max-w-7xl items-center gap-10 px-6 py-14 lg:grid-cols-[0.95fr_1.05fr] lg:px-8 lg:py-20">
          <div>
            <div className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface2 px-3 py-2 text-xs font-medium text-textMuted">
              <span className="h-1.5 w-1.5 rounded-full bg-success" />
              Real-time competitive coding arena
            </div>
            <h1 className="mt-6 max-w-3xl text-4xl font-semibold tracking-tight text-textMain md:text-6xl">
              Beat your opponent to Accepted.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-textMuted md:text-lg">
              Create a room, solve the same problem, and watch both submissions race in real time.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/match" className="rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-white transition hover:bg-primaryHover">
                Start a duel
              </Link>
              <a href="#how-it-works" className="rounded-lg border border-border bg-surface2 px-5 py-3 text-sm font-semibold text-textMain transition hover:border-primary/70">
                See how it works
              </a>
            </div>
            <div className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-sm text-textSoft">
              {stats.map((item) => <span key={item}>{item}</span>)}
              <span>{matchDisplay}</span>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-surface p-4 shadow-card">
            <div className="flex items-center justify-between border-b border-borderSoft pb-3">
              <div>
                <p className="text-xs font-medium uppercase text-textSoft">Live duel</p>
                <h2 className="mt-1 text-lg font-semibold text-textMain">Minimum Window Substring</h2>
              </div>
              <div className="rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 font-mono text-sm text-warning">18:42</div>
            </div>
            <div className="grid gap-3 py-4 sm:grid-cols-2">
              <div className="rounded-lg border border-borderSoft bg-bgSoft p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-textMain">You</p>
                  <StatusBadge tone="primary">Running</StatusBadge>
                </div>
                <div className="mt-4 h-2 rounded-full bg-surface3"><div className="h-2 w-3/4 rounded-full bg-primary" /></div>
                <p className="mt-3 text-xs text-textSoft">12 / 16 tests passed</p>
              </div>
              <div className="rounded-lg border border-borderSoft bg-bgSoft p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-textMain">Opponent</p>
                  <StatusBadge>Editing</StatusBadge>
                </div>
                <div className="mt-4 h-2 rounded-full bg-surface3"><div className="h-2 w-1/2 rounded-full bg-textSoft" /></div>
                <p className="mt-3 text-xs text-textSoft">8 / 16 tests passed</p>
              </div>
            </div>
            <div className="rounded-lg border border-borderSoft bg-editorBg p-4 font-mono text-xs text-textMuted">
              <div className="flex items-center justify-between">
                <span>submission.log</span>
                <StatusBadge tone="success">Accepted</StatusBadge>
              </div>
              <pre className="mt-3 overflow-hidden text-textSoft">{`case 14 passed
case 15 passed
case 16 passed
verdict: Accepted`}</pre>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="grid divide-y divide-borderSoft rounded-xl border border-border bg-surface2 sm:grid-cols-4 sm:divide-x sm:divide-y-0">
            {stats.map((item) => (
              <div key={item} className="px-5 py-4 text-center text-sm font-medium text-textMuted">{item}</div>
            ))}
          </div>
        </section>

        <section id="how-it-works" className="mx-auto mt-16 max-w-7xl px-6 lg:px-8">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">How it works</p>
          <h2 className="mt-2 text-2xl font-semibold text-textMain">From room to verdict</h2>
          <div className="mt-6 grid gap-3 md:grid-cols-4">
            {["Create a room", "Share invite code", "Solve together", "First Accepted wins"].map((title, index) => (
              <div key={title} className="rounded-xl border border-border bg-surface p-5">
                <p className="font-mono text-xs text-textSoft">0{index + 1}</p>
                <h3 className="mt-3 text-base font-semibold text-textMain">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-textMuted">
                  {index === 0 && "Choose difficulty and language, then create a private room."}
                  {index === 1 && "Send the invite code to your opponent so both players sync."}
                  {index === 2 && "Both editors receive the same generated problem and live code updates."}
                  {index === 3 && "Submit against the judge. The first all-passing result wins."}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section id="modes" className="mx-auto mt-16 max-w-7xl px-6 lg:px-8">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Supported</p>
          <h2 className="mt-2 text-2xl font-semibold text-textMain">Choose your stack</h2>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {["JavaScript", "Python", "C++", "Go", "Rust", "Java"].map((lang) => (
              <div key={lang} className="rounded-xl border border-border bg-surface px-5 py-4">
                <p className="font-semibold text-textMain">{lang}</p>
                <p className="mt-1 text-sm text-textSoft">Judge-backed execution with shared test cases.</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto mt-16 max-w-7xl px-6 lg:px-8">
          <div className="flex flex-col gap-4 rounded-xl border border-border bg-surface2 px-6 py-6 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-textMain">Ready for a real-time duel?</h2>
              <p className="mt-1 text-sm text-textMuted">Create a room, share the code, and race to Accepted.</p>
            </div>
            <Link href="/match" className="inline-flex rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-white transition hover:bg-primaryHover">
              Start a duel
            </Link>
          </div>
        </section>
      </main>
    </ServerWake>
  );

}
