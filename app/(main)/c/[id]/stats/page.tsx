import type { Metadata } from "next";
import { ConversationStats } from "@/components/stats";

export const metadata: Metadata = { title: "The stats" };

export default async function ConversationStatsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ConversationStats id={id} />;
}
