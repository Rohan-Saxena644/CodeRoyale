import { Header } from "@/components/header";
import { JoinRoomForm } from "@/components/join-room-form";
import { MatchForm } from "@/components/match-form";

export default function MatchPage() {
  return (
    <main className="pb-24">
      <Header />
      <section className="mx-auto mt-10 max-w-5xl px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-4xl font-semibold text-white">Create a duel room</h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-white/70">
            Choose your mode and difficulty, then share the invite code with your opponent.
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