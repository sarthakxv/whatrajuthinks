import type { Message, Stats } from "./types";

export function parseChat(
  text: string,
  filename?: string,
): { messages: Message[]; participants: string[]; format: string };
export function computeStats(messages: Message[]): Stats;
export function decodeImport(input: {
  filename: string;
  text?: string;
  base64?: string;
}): Promise<string>;
