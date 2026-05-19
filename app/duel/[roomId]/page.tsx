import { Header } from "@/components/header";
import { DuelLiveShell } from "@/components/duel-live-shell";
import { getStoredMatchByInviteCode } from "@/lib/match-repository";
import type { DevCategory, DuelLanguage, MatchConfig, ModeKind } from "@/lib/types";

type DuelPageProps = {
  params: Promise<{ roomId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function readSingle(param: string | string[] | undefined) {
  return Array.isArray(param) ? param[0] : param;
}

export default async function DuelPage({ params, searchParams }: DuelPageProps) {
  const { roomId } = await params;
  const query = await searchParams;
  const inviteCode = (readSingle(query.invite) ?? roomId.slice(-6)).toUpperCase();
  const storedMatch = await getStoredMatchByInviteCode(inviteCode);

  const mode = storedMatch?.config.mode ?? ((readSingle(query.mode) as ModeKind | undefined) ?? "competitive");
  const difficulty =
    storedMatch?.config.difficulty ??
    ((readSingle(query.difficulty) as MatchConfig["difficulty"] | undefined) ?? "medium");

  const config: MatchConfig = {
    mode,
    difficulty
  };

  if (mode === "competitive") {
    config.duelLanguage =
      storedMatch?.config.duelLanguage ??
      (((readSingle(query.track) as DuelLanguage | undefined) ?? "javascript") as DuelLanguage);
  } else {
    config.devCategory =
      storedMatch?.config.devCategory ??
      (((readSingle(query.track) as DevCategory | undefined) ?? "react-ui") as DevCategory);
  }

  return (
    <>
      <Header />
      <DuelLiveShell
        roomId={roomId}
        inviteCode={inviteCode}
        hostName={storedMatch?.hostName ?? (readSingle(query.host) ?? "Host")}
        guestName={storedMatch?.guestName ?? readSingle(query.guest)}
        viewerRole={((readSingle(query.role) as "host" | "guest" | undefined) ?? "host")}
        config={config}
      />
    </>
  );
}
