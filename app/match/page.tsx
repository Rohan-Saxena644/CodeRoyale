import { Header } from "@/components/header";
import { JoinRoomForm } from "@/components/join-room-form";
import { MatchForm } from "@/components/match-form";

export default function MatchPage() {
  return (
    <main className="pb-24">
      <Header />
      <section className="mx-auto mt-10 max-w-5xl px-6 lg:px-8">
        <div className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gold">Phase 1 kickoff</p>
          <h1 className="mt-3 text-4xl font-semibold text-white">Create a duel room</h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-white/70">
            This is the first real interaction surface for CodeRoyale. It already captures your dual-track product:
            competitive duels for algorithm battles and developer duels for debugging starter projects.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <MatchForm />
          <JoinRoomForm />
        </div>
      </section>
    </main>
  );
}
