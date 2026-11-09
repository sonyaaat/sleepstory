import { NextResponse } from "next/server";
import { z } from "zod";
import { extractNight } from "@/adapters/llm/extract";
import { currentSession } from "@/db/session";

const Body = z.object({ story: z.string().trim().min(1).max(2000) });

/** Story text in, validated diary fields out (CHK-03). Nothing is saved here. */
export async function POST(req: Request) {
  const session = await currentSession();
  if (!session) return NextResponse.json({ error: "No demo session" }, { status: 401 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Please describe your night first." }, { status: 400 });
  const result = await extractNight(parsed.data.story);
  return NextResponse.json(result);
}
