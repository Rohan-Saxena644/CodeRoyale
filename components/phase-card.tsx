import type { PhaseTask } from "@/lib/types";

type PhaseCardProps = {
  phase: PhaseTask;
};

export function PhaseCard({ phase }: PhaseCardProps) {
  return (
    <article className="card-border rounded-[28px] border border-white/10 bg-panel/95 p-6">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white text-lg font-semibold text-ink">
            {phase.id}
          </div>
          <div>
            <h3 className="text-xl font-semibold text-white">{phase.title}</h3>
            <p className="text-sm text-white/55">{phase.estimate}</p>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.24em] text-white/45">Tasks</p>
          <ul className="space-y-2 text-sm text-white/78">
            {phase.tasks.map((task) => (
              <li key={task} className="flex gap-3">
                <span className="mt-1 h-2 w-2 rounded-full bg-white/40" />
                <span>{task}</span>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.24em] text-white/45">Tech stack</p>
          <div className="flex flex-wrap gap-2">
            {phase.techStack.map((item) => (
              <span
                key={item}
                className="rounded-full border border-white/10 bg-black/25 px-3 py-1 text-xs text-white/70"
              >
                {item}
              </span>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-lime/35 bg-lime/12 px-4 py-3 text-sm text-lime">
          {phase.statusLine}
        </div>
        <div className="rounded-2xl border border-gold/35 bg-gold/10 px-4 py-3 text-sm text-gold">
          {phase.warning}
        </div>
      </div>
    </article>
  );
}
