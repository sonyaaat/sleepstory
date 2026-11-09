"use client";

import { useEffect } from "react";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { logClientEvent } from "@/app/actions";

/** Records how long the Snapshot was open (DEMO-11). */
export function ViewTracker({ patientId }: { patientId: string }) {
  useEffect(() => {
    const start = Date.now();
    return () => {
      logClientEvent("snapshot_viewed", { patientId, ms: Date.now() - start }).catch(() => {});
    };
  }, [patientId]);
  return null;
}

export function PrintButton() {
  return (
    <Button variant="outline" size="sm" onClick={() => window.print()} className="print:hidden">
      <Printer /> Download PDF
    </Button>
  );
}
