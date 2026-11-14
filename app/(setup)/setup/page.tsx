import SetupWizard from "@/components/setup-wizard";

export const metadata = { title: "Step 1" };

export default function Page() {
  return <SetupWizard step={1} />;
}
