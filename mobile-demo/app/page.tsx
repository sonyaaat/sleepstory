import { Suspense } from "react";
import { RealPage } from "@demo/lib/real-page";

/** Start screen: src/app/page.tsx. */
export default function Page() {
  return (
    <Suspense>
      <RealPage page="start" />
    </Suspense>
  );
}
