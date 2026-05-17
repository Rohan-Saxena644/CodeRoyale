import { Header } from "@/components/header";
import { RoomShell } from "@/components/room-shell";
import type { DevCategory, DuelLanguage, MatchConfig, ModeKind } from "@/lib/types";

type RoomPageProps = {
  params: Promise<{ roomId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function readSingle(param: string | string[] | undefined) {
  return Array.isArray(param) ? param[0] : param;
}

export default async function RoomPage({ params, searchParams }: RoomPageProps) {
  const { roomId } = await params;
  const query = await searchParams;

  const mode = (readSingle(query.mode) as ModeKind | undefined) ?? "competitive";
  const difficulty = (readSingle(query.difficulty) as MatchConfig["difficulty"] | undefined) ?? "medium";

  const config: MatchConfig = {
    mode,
    difficulty
  };

  if (mode === "competitive") {
    config.duelLanguage = ((readSingle(query.track) as DuelLanguage | undefined) ?? "javascript") as DuelLanguage;
  } else {
    config.devCategory = ((readSingle(query.track) as DevCategory | undefined) ?? "react-ui") as DevCategory;
  }

  return (
    <main className="pb-24">
      <Header />
      <section className="mx-auto mt-10 max-w-7xl px-6 lg:px-8">
        <RoomShell
          roomId={roomId}
          inviteCode={(readSingle(query.invite) ?? roomId.slice(-6)).toUpperCase()}
          hostName={readSingle(query.host) ?? "Host"}
          config={config}
        />
      </section>
    </main>
  );
}
