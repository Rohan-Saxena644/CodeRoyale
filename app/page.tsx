import Link from "next/link";
import { Header } from "@/components/header";
import { ModeShowcase } from "@/components/mode-showcase";
import { PhaseCard } from "@/components/phase-card";
import { roadmap } from "@/lib/roadmap";

export default function HomePage() {
  return (
    <main className="pb-24">
      <Header />

      <section className="mx-auto mt-8 max-w-7xl px-6 lg:px-8">
        <div className="grid items-end gap-10 lg:grid-cols-[1.15fr_0.85fr]">
          <div>
            <div className="inline-flex rounded-full border border-gold/35 bg-gold/10 px-4 py-2 text-sm text-gold">
              Realtime duel platform for competitive coders and software engineers
            </div>
            <h1 className="mt-6 max-w-4xl text-5xl font-semibold tracking-tight text-white md:text-7xl">
              Build the arena where coders race, debug, and out-think each other live.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-white/72">
              CodeRoyale now has a concrete product direction inside the repo: competitive mode for generated
              algorithm duels, developer mode for starter-code bug fixing, and a staged roadmap for editor sync,
              judging, and deployment.
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                href="/match"
                className="rounded-full bg-white px-6 py-3 font-semibold text-ink transition hover:scale-[1.01]"
              >
                Start Phase 1 flow
              </Link>
              <a
                href="#roadmap"
                className="rounded-full border border-white/10 px-6 py-3 font-semibold text-white/80"
              >
                Review all 8 phases
              </a>
            </div>
          </div>

          <div className="card-border rounded-[32px] border border-white/10 bg-panel bg-grain p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/45">Current product call</p>
            <div className="mt-4 space-y-4">
              <div className="rounded-3xl border border-lime/30 bg-lime/10 p-4 text-sm text-lime">
                Developer mode should lead with prerequisite code fixes, not only MCQs.
              </div>
              <div className="rounded-3xl border border-gold/30 bg-gold/10 p-4 text-sm text-gold">
                MCQ packs are still useful later for system design, networking, and interview warmups.
              </div>
              <div className="rounded-3xl border border-white/10 bg-black/20 p-4 text-sm text-white/72">
                Competitive questions should come from AI-generated or clearly permissive sources only.
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto mt-20 max-w-7xl px-6 lg:px-8">
        <div className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gold">Modes</p>
          <h2 className="mt-3 text-3xl font-semibold text-white">Three lanes, one arena</h2>
        </div>
        <ModeShowcase />
      </section>

      <section id="roadmap" className="mx-auto mt-20 max-w-7xl px-6 lg:px-8">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gold">Roadmap</p>
            <h2 className="mt-3 text-3xl font-semibold text-white">All 8 phases from your screenshots are now mapped</h2>
          </div>
          <p className="max-w-xl text-sm leading-6 text-white/60">
            Phase 0 is scaffolded in-repo now. The remaining phases are codified so we can build them in order
            without losing the product shape.
          </p>
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          {roadmap.map((phase) => (
            <PhaseCard key={phase.id} phase={phase} />
          ))}
        </div>
      </section>
    </main>
  );
}
