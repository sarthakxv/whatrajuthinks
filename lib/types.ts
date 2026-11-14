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
  mode: "local" | "hosted";
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
  isLargeChat?: boolean;
}

export type SourceConversation = Pick<Conversation, "id" | "title" | "participants"> & {
  context?: string;
  messages: Message[];
};

export interface Consumption {
  id: string;
  model: string;
  stage: "extract" | "reduce" | "write";
  status: "reserved" | "completed" | "uncertain" | "rejected";
  estimatedCostUsd: number;
  costUsd?: number;
  inputTokens?: number;
  outputTokens?: number;
  cacheReadTokens?: number;
  cacheWriteTokens?: number;
  pricingVersion: string;
}

export interface AnalysisUsage {
  method: "direct" | "chunked" | "recent";
  processedMessages: number;
  evidenceMessages: number;
  estimatedCostUsd: number;
  budgetUsd: number;
  calls: Consumption[];
}

export interface ReportJobView {
  id: string;
  status: "planning" | "awaiting_confirmation" | "queued" | "running" | "interrupted" | "failed" | "completed";
  stage: string;
  completedChunks: number;
  totalChunks: number;
  estimatedCostUsd?: number;
  budgetUsd: number;
  consumedCostUsd: number;
  requiresConfirmation: boolean;
  coverage?: Report["aiCoverage"];
  reportId?: string;
  error?: string;
  createdAt: string;
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
  aiCoverage?: {
    conversationId: string;
    totalMessages: number;
    includedMessages: number;
    title?: string;
    firstDate?: string | null;
    lastDate?: string | null;
    hasUndatedMessages?: boolean;
  }[];
  aiAnalysis?: AnalysisUsage;
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
