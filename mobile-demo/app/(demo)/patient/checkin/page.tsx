import { Suspense } from "react";
import { RealPage } from "@demo/lib/real-page";

/** Morning check-in: src/app/(demo)/patient/checkin/page.tsx (?mode=voice|type|quick). */
export default function Page() {
  return (
    <Suspense>
      <RealPage page="checkin" />
    </Suspense>
  );
}
