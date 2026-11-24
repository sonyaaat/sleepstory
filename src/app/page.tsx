import { redirect } from "next/navigation";
import { AutoStart } from "@/components/auto-start";
import { currentSession } from "@/db/session";

/** Testers land straight on Maya's morning: a new visitor gets their own copy of her data first. */
export default async function StartPage() {
  if (await currentSession()) redirect("/patient");
  return <AutoStart />;
}
