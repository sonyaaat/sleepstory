"use client";

import { usePathname, useRouter } from "next/navigation";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

export function TesterSwitch() {
  const pathname = usePathname();
  const router = useRouter();
  const side = pathname.startsWith("/provider") ? "provider" : "patient";
  return (
    <ToggleGroup
      type="single"
      size="sm"
      variant="outline"
      value={side}
      onValueChange={(v) => v && v !== side && router.push(v === "provider" ? "/provider" : "/patient")}
    >
      <ToggleGroupItem value="patient" className="px-3">
        Patient
      </ToggleGroupItem>
      <ToggleGroupItem value="provider" className="px-3">
        Provider
      </ToggleGroupItem>
    </ToggleGroup>
  );
}
