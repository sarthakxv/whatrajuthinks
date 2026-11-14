import type {
  Message,
  Conversation,
  StoredConversation,
  Report,
} from "./types";
import type { ReportJob } from "./report-jobs.ts";
import type { Finding } from "./ai-analysis.ts";

export interface Store {
  session(id: string | undefined): string | undefined;
  newSession(id?: string): string;
  purge(now?: string): void;
  addConversation(
    session: string,
    metadata: Conversation,
    messages: Message[],
  ): Conversation;
  conversations(session: string): Conversation[];
  conversation(session: string, id: string): StoredConversation | null;
  deleteConversation(session: string, id: string): boolean;
  updateConversation(
    session: string,
    id: string,
    metadata: Conversation,
    messages: Message[] | null,
  ): boolean;
  deleteAccount(session: string): void;
  addReport(session: string, report: Report, conversationIds: string[]): void;
  reports(session: string): Report[];
  report(session: string, id: string): Report | null;
  deleteReport(session: string, id: string): boolean;
  addJob(session: string, job: ReportJob): void;
  job(session: string, id: string): ReportJob | null;
  jobs(session: string): ReportJob[];
  updateJob(session: string, id: string, update: (job: ReportJob) => ReportJob): ReportJob;
  deleteJob(session: string, id: string): boolean;
  completeJob(session: string, id: string, report: Report): void;
  cachedAnalysis(session: string, key: string): Finding | null;
  cacheAnalysis(session: string, key: string, sourceIds: string[], data: Finding): void;
  close(): void;
}

export function createStore(path?: string): Store;
