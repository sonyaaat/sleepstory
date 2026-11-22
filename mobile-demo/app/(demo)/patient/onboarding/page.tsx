import { Suspense } from "react";
import { RealPage } from "@demo/lib/real-page";

/** Sign-up for demo Maya: src/app/(demo)/patient/onboarding/page.tsx. */
export default function Page() {
  return (
    <Suspense>
      <RealPage page="onboarding" />
    </Suspense>
  );
}
