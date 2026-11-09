import { TesterBar } from "@/components/tester-bar";
import { requireSession } from "@/db/queries";

export const dynamic = "force-dynamic";

export default async function DemoLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();
  return (
    <>
      <TesterBar today={session.today} />
      {children}
    </>
  );
}
