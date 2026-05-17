import Link from "next/link";
import type { MatchConfig } from "@/lib/types";

type RoomShellProps = {
  roomId: string;
  inviteCode: string;
  hostName: string;
  guestName?: string;
  viewerRole: "host" | "guest";
  config: MatchConfig;
};

export function RoomShell({ roomId, inviteCode, hostName, guestName, viewerRole, config }: RoomShellProps) {
  const roomHeadline = guestName ? "Both players are in the room" : "Waiting for opponent";

  return (
    <section className="grid gap-6 lg:grid-cols-[1.35fr_0.95fr]">
      <article className="card-border rounded-[28px] border border-white/10 bg-panel/92 p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-lime">Room status</p>
            <h1 className="mt-2 text-3xl font-semibold text-white">{roomHeadline}</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/70">
              Invite-code joining is now live in the app. The next step is wiring Socket.IO presence, ready events,
              countdown transitions, and persistent room state so both clients update without refreshes.
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/15 px-4 py-3 text-right">
            <div className="text-xs uppercase tracking-[0.18em] text-white/45">Invite code</div>
            <div className="mt-1 font-mono text-2xl text-gold">{inviteCode}</div>
          </div>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <div className="rounded-3xl border border-white/10 bg-black/15 p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-white/45">Host</p>
            <p className="mt-2 text-lg font-semibold text-white">{hostName}</p>
            <p className="mt-2 text-sm text-lime">{viewerRole === "host" ? "You created this room" : "Host joined"}</p>
          </div>
          <div
            className={`rounded-3xl p-5 ${
              guestName
                ? "border border-white/10 bg-black/15"
                : "border border-dashed border-white/15 bg-black/10"
            }`}
          >
            <p className="text-xs uppercase tracking-[0.18em] text-white/45">Opponent</p>
            <p className="mt-2 text-lg font-semibold text-white/72">{guestName ?? "Open slot"}</p>
            <p className="mt-2 text-sm text-white/45">
              {guestName
                ? viewerRole === "guest"
                  ? "You joined with the invite code"
                  : "A second player has claimed the room"
                : "Another player can now join from /match using the invite code"}
            </p>
          </div>
        </div>

        <div className="mt-8 rounded-[24px] border border-gold/35 bg-gold/10 p-5">
          <p className="text-sm font-semibold text-gold">Planned next for this room</p>
          <ul className="mt-3 space-y-2 text-sm text-white/78">
            <li>Socket event flow: `player:join`, `player:ready`, `match:countdown`, `match:start`</li>
            <li>Guest joins should appear live for the host without copying a full URL manually</li>
            <li>Realtime transition to editor room once both players are present</li>
          </ul>
        </div>
      </article>

      <aside className="space-y-6">
        <div className="card-border rounded-[28px] border border-white/10 bg-black/20 p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/45">Configuration</p>
          <dl className="mt-4 space-y-4 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-white/55">Mode</dt>
              <dd className="font-medium capitalize text-white">{config.mode}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-white/55">Difficulty</dt>
              <dd className="font-medium capitalize text-white">{config.difficulty}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-white/55">Track</dt>
              <dd className="font-medium text-white">{config.duelLanguage ?? config.devCategory}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-white/55">Room id</dt>
              <dd className="font-mono text-xs text-white/75">{roomId}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-white/55">Viewer role</dt>
              <dd className="font-medium capitalize text-white">{viewerRole}</dd>
            </div>
          </dl>
        </div>

        <div className="card-border rounded-[28px] border border-white/10 bg-black/20 p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/45">Dev mode stance</p>
          <p className="mt-4 text-sm leading-6 text-white/72">
            Your repo now encodes the stronger interpretation: dev mode is primarily code-repair with starter
            projects, while theory MCQs stay as a future optional content lane for interviews or warmups.
          </p>
        </div>

        <Link
          href="/match"
          className="inline-flex rounded-full border border-white/10 bg-white px-5 py-3 font-semibold text-ink"
        >
          Create another room
        </Link>
      </aside>
    </section>
  );
}
