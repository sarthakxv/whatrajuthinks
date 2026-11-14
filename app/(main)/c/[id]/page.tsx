import { ConversationView } from "@/components/workspace";
export default async function ConversationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ConversationView id={id} />;
}
