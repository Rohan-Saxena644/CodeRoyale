import { Header } from "@/components/header";
import { JoinRoomForm } from "@/components/join-room-form";
import { MatchForm } from "@/components/match-form";

export default function MatchPage() {
  return (
    <main className="pb-16">
      <Header />
      <section className="mx-auto mt-10 max-w-5xl px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-4xl font-semibold text-textMain">Start a duel</h1>
          <p className="mt-3 max-w-3xl text-base leading-7 text-textMuted">
            Create a room or join with an invite code.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <MatchForm />
          <JoinRoomForm />
        </div>

        <div className="mt-6 rounded-xl border border-border bg-surface2 px-5 py-4 text-center text-sm text-textMuted">
          No signup required · Same problem for both players · Real-time opponent code
        </div>
      </section>
    </main>
  );
}

