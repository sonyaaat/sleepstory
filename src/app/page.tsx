import { AutoStart } from "@/components/auto-start";
import { currentSession } from "@/db/session";

/**
 * Testers land straight on Maya's morning: a new visitor gets their own copy of her data first.
 * No redirect() here: the phone demo re-runs this page in the browser once the session exists.
 */
export default async function StartPage() {
  return <AutoStart hasSession={Boolean(await currentSession())} />;
}
