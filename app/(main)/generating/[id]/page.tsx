import { ReportJob } from "@/components/report-job";

export default async function GeneratingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ReportJob key={id} id={id} />;
}
