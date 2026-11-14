export interface Message {
  sender: string;
  text: string;
  timestamp: string | null;
}

export interface ParticipantStats {
  name: string;
  messages: number;
  percentage: number;
  words: number;
  questions: number;
  initiations: number;
  medianReplyMinutes: number | null;
  topWords?: string[];
  topEmoji?: string[];
}

export interface Stats {
  messageCount: number;
  wordCount: number;
  firstDate: string | null;
  lastDate: string | null;
  participants: ParticipantStats[];
  monthly: { month: string; count: number }[];
  topEmoji: { emoji: string; count: number }[];
  daily?: { date: string; count: number }[];
  hours?: number[];
  busiestDay?: { date: string; count: number } | null;
  activeDays?: number;
  longestStreakDays?: number;
  longestSilenceDays?: number;
  nightShare?: number | null;
  busiestHour?: number | null;
}

export interface Session {
  mode: "local";
  aiConfigured: boolean;
  characters: string[];
  paymentsEnabled: boolean;
  emailEnabled: boolean;
}

export interface Conversation {
  id: string;
  title: string;
  participants: string[];
  messageCount: number;
  firstDate: string | null;
  lastDate: string | null;
  platform: string;
  context: string;
  createdAt: string;
  person?: string;
  expiresAt?: string;
  available?: boolean;
  stats?: Stats;
}

export interface StoredConversation extends Conversation {
  messages: Message[] | null;
}

export interface ReportSection {
  title: string;
  body: string;
  quotes?: { sender: string; text: string }[];
}

export interface ReportOptions {
  person: string;
  language?: string;
  tone?: string;
  contextNotes?: string;
  question?: string;
  character?: string;
  mode?: "local" | "ai";
}

export interface Report {
  id: string;
  conversationId?: string;
  conversationIds?: string[];
  title: string;
  createdAt: string;
  character: string;
  person: string | null;
  mode: "local" | "ai";
  kind: "standard" | "ultimate";
  participants: string[];
  messageCount: number;
  stats: Stats;
  sections: ReportSection[];
  question?: string;
  language: string;
  tone: string;
  sourceAvailable?: boolean;
}

export type ReportSummary = Omit<Report, "sections">;
