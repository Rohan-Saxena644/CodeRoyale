export type ModeKind = "competitive" | "dev";

export type MatchStatus = "waiting" | "countdown" | "active" | "ended";

export type DuelLanguage =
  | "python"
  | "javascript"
  | "cpp"
  | "go"
  | "rust";

export type DevCategory =
  | "react-ui"
  | "express-api"
  | "go-backend"
  | "rust-backend"
  | "next-actions";

export interface MatchConfig {
  mode: ModeKind;
  difficulty: "easy" | "medium" | "hard";
  duelLanguage?: DuelLanguage;
  devCategory?: DevCategory;
}

export interface MatchRecord {
  id: string;
  inviteCode: string;
  status: MatchStatus;
  config: MatchConfig;
  createdAt: string;
}

export interface RoomParticipant {
  name: string;
  role: "host" | "guest";
}

export interface StoredMatch extends MatchRecord {
  hostName: string;
  guestName?: string;
  hostReady: boolean;
  guestReady: boolean;
  countdownEndsAt?: number;
}

export interface RoomPresenceState {
  roomId: string;
  inviteCode?: string;
  status: MatchStatus;
  hostName?: string;
  guestName?: string;
  hostReady: boolean;
  guestReady: boolean;
  countdownEndsAt?: number;
}

export interface PhaseTask {
  id: string;
  title: string;
  estimate: string;
  statusLine: string;
  warning: string;
  techStack: string[];
  tasks: string[];
}
