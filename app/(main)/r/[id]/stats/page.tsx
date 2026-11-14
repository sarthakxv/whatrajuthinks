import type { Metadata } from "next";
import { ReportStats } from "@/components/stats";

export const metadata: Metadata = { title: "The stats" };

export default async function ReportStatsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ReportStats id={id} />;
}
