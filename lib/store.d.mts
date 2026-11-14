import type {
  Message,
  Conversation,
  StoredConversation,
  Report,
} from "./types";

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
  close(): void;
}

export function createStore(path?: string): Store;
