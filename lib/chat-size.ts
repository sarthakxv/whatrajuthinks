import type { SourceConversation } from "./types";

export function isLargeChat(conversation: Omit<SourceConversation, "id">) {
  return isLargeHistory([conversation]);
}

export function isLargeHistory(conversations: Omit<SourceConversation, "id">[]) {
  return JSON.stringify(conversations.map(({ title, context, participants, messages }) => ({ title, context, participants, messages }))).length > 400000;
}
