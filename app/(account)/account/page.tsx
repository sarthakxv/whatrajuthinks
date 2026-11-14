import type { Metadata } from "next";
import { Workspace } from "@/components/workspace";

export const metadata: Metadata = { title: "Your account" };

export default function AccountPage() {
  return <Workspace />;
}
