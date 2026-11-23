import { Suspense } from "react";
import { RealPage } from "@demo/lib/real-page";
import { demoPatientIds } from "@demo/lib/seed";

// One page per demo patient, built ahead of time (a static site can't make pages on request).
export const dynamicParams = false;

export function generateStaticParams() {
  return demoPatientIds().map((id) => ({ id }));
}

/** Sleep Snapshot: src/app/(demo)/provider/snapshot/[id]/page.tsx. */
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <Suspense>
      <RealPage page="snapshot" id={id} />
    </Suspense>
  );
}
