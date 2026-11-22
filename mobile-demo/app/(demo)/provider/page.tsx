import { Suspense } from "react";
import { RealPage } from "@demo/lib/real-page";

/** Provider's patient list: src/app/(demo)/provider/page.tsx. */
export default function Page() {
  return (
    <Suspense>
      <RealPage page="provider" />
    </Suspense>
  );
}
