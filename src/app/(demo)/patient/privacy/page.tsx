import Link from "next/link";
import { ArrowLeft, ExternalLink, FlaskConical, ShieldCheck } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Plain-language privacy page (MY-02, PRIV-03, PRIV-09).
// Rule: never claim more than is true. Each section separates what this prototype does
// today from what the real product commits to. Legal references were checked on 2026-11-08.

const LAST_REVIEWED = "November 8, 2026";

const SHORT_VERSION = [
  "Nothing reaches your primary care provider until you tap Approve & share.",
  "The AI that reads your story runs on a self-hosted model, not a public AI service. Your typed words are not sent to OpenAI or Google.",
  "You can see, correct or skip any entry, and you can ask for everything to be deleted.",
  "We never sell your information, use it for ads, or share it with your school or employer.",
  "We follow Ontario's health privacy law (PHIPA) and Canada's private-sector privacy law (PIPEDA).",
];

type Section = { id: string; title: string; today: string[]; product: string[] };

const SECTIONS: Section[] = [
  {
    id: "collect",
    title: "What we collect, and what we don't",
    today: [
      "Your morning answers: bed and wake times, time to fall asleep, time awake, sleep quality.",
      "The words you type or say about your night and your day, kept word for word.",
      "Habits you tap (like late caffeine) and whether you took a sleep aid.",
      "Questionnaire answers: the Insomnia Severity Index and short safety questions.",
      "Watch sleep totals, if you connect a watch. In this prototype the watch is simulated.",
      "How long a check-in takes and how many AI answers you corrected, so the team can evaluate the design. This is not linked to your name.",
    ],
    product: [
      "We collect only what is needed to build your Sleep Snapshot (limiting collection, a PIPEDA principle).",
      "We don't collect your location, contacts or photos, and we don't record you while you sleep.",
      "Each piece of information has a stated purpose. We won't use it for a new purpose without asking you first.",
    ],
  },
  {
    id: "ai",
    title: "How the AI uses your words",
    today: [
      "A self-hosted language model turns your story into the standard sleep diary questions (the Consensus Sleep Diary). It runs on a private server, not on OpenAI, Google or another public AI service.",
      "The AI only fills in the form. You check every answer before saving, and unsure answers are highlighted.",
      "Every number your provider sees is calculated by tested code from the answers you confirmed. The AI never calculates, scores or diagnoses.",
      "If the AI is unavailable, a simple rule-based method fills in the form instead, and the app tells you.",
      "Your words are not used to train AI models.",
    ],
    product: [
      "The model will run on servers in Canada under a written agreement, and we will publish where it runs.",
      "We follow the principles for responsible generative AI set by Canada's federal, provincial and territorial privacy commissioners: be open about the AI's role, keep people in control, and keep only what's needed.",
      "SleepStory is designed so that it doesn't diagnose or recommend treatment. Health Canada regulates software that does, as a medical device.",
    ],
  },
  {
    id: "voice",
    title: "Voice input",
    today: [
      "The microphone button uses your browser's built-in speech recognition. In Google Chrome, your browser sends the audio to Google to turn it into text. That is Chrome's own feature, covered by Google's privacy policy, not ours.",
      "If you'd rather not, just type. Typing works exactly the same.",
      "We never store audio. Only the text you see in the box is saved.",
    ],
    product: [
      "Speech recognition will run on our own server (an open-source model), so your voice stays within SleepStory.",
    ],
  },
  {
    id: "who",
    title: "Who can see your information",
    today: [
      "Only you, inside this demo session. Your demo data is separate from every other tester's.",
      "The provider side of this prototype is a simulation, so testers can see what a provider would see.",
    ],
    product: [
      "Only you, until you approve sharing before a visit. Then only the primary care provider you chose sees your one-page Snapshot.",
      "Your provider is a health information custodian under Ontario's PHIPA and must protect your information under that law.",
      "SleepStory staff can't browse your entries. Technical access is limited to what is needed to run the service, and every access is logged.",
      "We never sell your information, use it for advertising, or share it with your school, employer or insurer.",
      "Research use happens only with your separate, optional consent, and you can say no without losing anything.",
    ],
  },
  {
    id: "protect",
    title: "How we protect it",
    today: [
      "This is a course prototype on a test computer. All data is made up, and you should not enter real health information.",
      "API keys and passwords are kept out of the code.",
    ],
    product: [
      "Encryption in transit (HTTPS) and at rest.",
      "Hosting in Canada.",
      "An electronic audit log of every access to your information, as PHIPA requires of health information custodians.",
      "Snapshots sent by secure, expiring links, never as health details inside an email. This follows the Ontario privacy commissioner's guidance on emailing health information.",
      "A written agreement with each clinic that sets out how SleepStory handles information on the clinic's behalf.",
      "A named privacy officer who is accountable for following this policy.",
    ],
  },
  {
    id: "rights",
    title: "Your rights and choices",
    today: [
      "You can correct any answer before saving and edit last night's entry.",
      "Missing a day is fine. Nothing is filled in for you without being labelled.",
    ],
    product: [
      "Access: ask for a copy of everything we hold about you.",
      "Correction: ask us to fix anything that's wrong.",
      "Withdraw consent: stop sharing or stop using SleepStory at any time. Information already shared with your provider stays in their records, as with any health record.",
      "Delete: delete your account and data from the app.",
      "Complain: contact our privacy officer first. You can also complain to the Information and Privacy Commissioner of Ontario (about health information held by your provider) or the Office of the Privacy Commissioner of Canada (about how SleepStory as a company handles your information).",
    ],
  },
  {
    id: "breach",
    title: "If something goes wrong",
    today: ["The prototype holds only made-up data, so no real person can be affected."],
    product: [
      "If health information is stolen, lost, or used or disclosed without authority, you will be told at the first reasonable opportunity, as PHIPA requires, along with your right to complain to Ontario's privacy commissioner.",
      "If a breach creates a real risk of significant harm, it is reported to the Privacy Commissioner of Canada and you are notified as soon as possible, as PIPEDA requires. Every breach is recorded, even small ones.",
    ],
  },
];

const SOURCES = [
  {
    label: "Personal Health Information Protection Act, 2004 (PHIPA)",
    who: "Ontario's health privacy law",
    href: "https://www.ontario.ca/laws/statute/04p03",
  },
  {
    label: "Personal Information Protection and Electronic Documents Act (PIPEDA)",
    who: "Canada's private-sector privacy law",
    href: "https://laws-lois.justice.gc.ca/eng/acts/P-8.6/",
  },
  {
    label: "PIPEDA fair information principles",
    who: "Office of the Privacy Commissioner of Canada",
    href: "https://www.priv.gc.ca/en/privacy-topics/privacy-laws-in-canada/the-personal-information-protection-and-electronic-documents-act-pipeda/p_principle/",
  },
  {
    label: "Communicating personal health information by email",
    who: "Information and Privacy Commissioner of Ontario",
    href: "https://www.ipc.on.ca/en/resources-and-decisions/fact-sheet-communicating-personal-health-information-email",
  },
  {
    label: "Mandatory reporting of breaches of security safeguards",
    who: "Office of the Privacy Commissioner of Canada",
    href: "https://www.priv.gc.ca/en/privacy-topics/privacy-for-businesses/privacy-breaches-at-your-business/gd_pb_201810/",
  },
  {
    label: "Principles for responsible, trustworthy and privacy-protective generative AI",
    who: "Federal, provincial and territorial privacy commissioners (2023)",
    href: "https://www.priv.gc.ca/en/opc-news/news-and-announcements/2023/nr-c_231207/",
  },
  {
    label: "Responsible use of AI in health and health research",
    who: "Joint resolution of Canada's privacy commissioners (2026)",
    href: "https://www.priv.gc.ca/en/about-the-opc/what-we-do/provincial-and-territorial-collaboration/joint-resolutions-with-provinces-and-territories/res_20260915_aihealth/",
  },
  {
    label: "Software as a Medical Device: Definition and Classification",
    who: "Health Canada",
    href: "https://www.canada.ca/en/health-canada/services/drugs-health-products/medical-devices/application-information/guidance-documents/software-medical-device-guidance-document.html",
  },
  {
    label: "Make a complaint about health privacy in Ontario",
    who: "Information and Privacy Commissioner of Ontario",
    href: "https://www.ipc.on.ca/en",
  },
  {
    label: "Report a privacy concern",
    who: "Office of the Privacy Commissioner of Canada",
    href: "https://www.priv.gc.ca/en/report-a-concern/",
  },
  {
    label: "Google Chrome privacy whitepaper (speech input)",
    who: "Google",
    href: "https://www.google.com/chrome/privacy/whitepaper.html",
  },
];

export default function PrivacyPage() {
  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-4 px-4 py-6">
      <Button asChild variant="ghost" size="sm" className="self-start">
        <Link href="/patient">
          <ArrowLeft /> Back
        </Link>
      </Button>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Privacy &amp; your data</h1>
        <p className="text-sm text-muted-foreground">Last reviewed {LAST_REVIEWED}</p>
      </div>

      <Card className="border-primary/30 bg-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="size-5 text-primary" /> The short version
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="list-disc space-y-1.5 pl-5 text-sm">
            {SHORT_VERSION.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Alert>
        <FlaskConical />
        <AlertTitle>This is a course prototype</AlertTitle>
        <AlertDescription>
          SleepStory is a student project (CS497 / HLTH480, University of Waterloo), not a medical device and not a
          live service. Each section below says what this prototype does <strong>today</strong> and what the real
          product will do. Please don&apos;t enter real health information.
        </AlertDescription>
      </Alert>

      <Accordion type="multiple" defaultValue={["collect", "ai"]} className="rounded-xl border px-4">
        {SECTIONS.map((s) => (
          <AccordionItem key={s.id} value={s.id}>
            <AccordionTrigger className="text-base">{s.title}</AccordionTrigger>
            <AccordionContent className="space-y-4">
              <div className="space-y-1.5">
                <Badge variant="secondary">In this prototype</Badge>
                <ul className="list-disc space-y-1 pl-5 text-sm">
                  {s.today.map((t) => (
                    <li key={t}>{t}</li>
                  ))}
                </ul>
              </div>
              <div className="space-y-1.5">
                <Badge variant="outline">In the real product</Badge>
                <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                  {s.product.map((t) => (
                    <li key={t}>{t}</li>
                  ))}
                </ul>
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
        <AccordionItem value="law">
          <AccordionTrigger className="text-base">Which laws apply</AccordionTrigger>
          <AccordionContent className="space-y-2 text-sm">
            <p>
              <strong>PHIPA</strong> (Ontario) protects personal health information held by health care providers such
              as your primary care provider. When SleepStory works on a clinic&apos;s behalf, it must follow the
              clinic&apos;s duties under PHIPA through a written agreement.
            </p>
            <p>
              <strong>PIPEDA</strong> (Canada) applies to how SleepStory, as a company, handles your personal
              information. It is built on ten fair information principles, including consent, limiting collection,
              safeguards, openness and your right to access your information.
            </p>
            <p>
              Exactly which law covers a given piece of information depends on who holds it and why. When in doubt, we
              apply the stricter protection.
            </p>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Official sources</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2.5 text-sm">
            {SOURCES.map((s) => (
              <li key={s.href}>
                <a
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-start gap-1 font-medium text-primary underline-offset-4 hover:underline"
                >
                  {s.label} <ExternalLink className="mt-0.5 size-3.5 shrink-0" />
                </a>
                <span className="block text-xs text-muted-foreground">{s.who}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <p className="text-center text-xs text-muted-foreground">
        This page explains our approach in plain language. It is not legal advice.
      </p>
    </main>
  );
}
