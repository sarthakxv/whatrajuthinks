import type { Report } from "./types";

const date = (value: string) => new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(value));

export function coverageNotice(r: Pick<Report, "aiCoverage" | "aiAnalysis" | "messageCount" | "character">) {
  if (r.aiAnalysis?.method === "chunked") return `All ${r.messageCount.toLocaleString()} messages were processed in sections. ${r.character} wrote from combined findings and selected original exchanges. Statistics cover the full export.`;
  if (!r.aiCoverage?.length) return "";
  return r.aiCoverage.map(c => {
    const dated = c.firstDate && c.lastDate && Number.isFinite(Date.parse(c.firstDate)) && Number.isFinite(Date.parse(c.lastDate));
    const period = dated ? ` Covers ${date(c.firstDate!)} to ${date(c.lastDate!)}.` : " The covered period is unknown because usable message dates are unavailable.";
    return `${r.aiCoverage!.length > 1 ? `${c.title ?? "Chat"}: ` : ""}This reading uses ${c.includedMessages < c.totalMessages ? `the most recent ${c.includedMessages.toLocaleString()} of ${c.totalMessages.toLocaleString()}` : `all ${c.totalMessages.toLocaleString()}`} messages.${period}${c.hasUndatedMessages && dated ? " Some included messages have no usable date." : ""}`;
  }).join(" ") + " Statistics cover the full uploaded chat.";
}
