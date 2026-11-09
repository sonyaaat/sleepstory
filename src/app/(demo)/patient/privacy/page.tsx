import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Plain-language privacy page (MY-02, PRIV-03). Wording follows PRIV-08.
const SECTIONS = [
  {
    title: "What we collect",
    body: "Your morning answers about how you slept, the words you type or say, what was different about your day (like late caffeine or a sleep aid), and your questionnaire answers. If you connect a watch, its total sleep for each night.",
  },
  {
    title: "How the AI uses your words",
    body: "A self-hosted AI model turns your story into sleep diary answers. Your words are not sent to OpenAI or Google. The AI only fills in the form; you check and correct it. Every number your provider sees is calculated by our code from the answers you confirmed, not by the AI.",
  },
  {
    title: "Who sees it",
    body: "Only you, until you approve sharing. Your primary care provider sees your Sleep Snapshot only after you tap Approve & share before a visit. Nobody else.",
  },
  {
    title: "Your choices",
    body: "You can correct any entry, skip any day, and (in the final version) download or delete all your data at any time.",
  },
  {
    title: "This prototype",
    body: "This is a course prototype. All data is made up and stored in a test database. Please don't enter real health information.",
  },
];

export default function PrivacyPage() {
  return (
    <main className="mx-auto flex max-w-md flex-col gap-4 px-4 py-6">
      <Button asChild variant="ghost" size="sm" className="self-start">
        <Link href="/patient">
          <ArrowLeft /> Back
        </Link>
      </Button>
      <h1 className="text-2xl font-semibold tracking-tight">Privacy &amp; your data</h1>
      {SECTIONS.map((s) => (
        <Card key={s.title}>
          <CardHeader>
            <CardTitle className="text-base">{s.title}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">{s.body}</CardContent>
        </Card>
      ))}
    </main>
  );
}
