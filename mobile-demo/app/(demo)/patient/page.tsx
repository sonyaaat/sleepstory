import { Suspense } from "react";
import { RealPage } from "@demo/lib/real-page";

/** Patient home: src/app/(demo)/patient/page.tsx. */
export default function Page() {
  return (
    <Suspense>
      <RealPage page="patient" />
    </Suspense>
  );
}
