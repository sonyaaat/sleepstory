"use client";

import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { FIELD_META, QUALITY_LABELS, type DiaryFieldKey } from "@/core/schema";

export type FieldValue = string | number | undefined;

/** One editable diary field, using the right input for its kind. */
export function FieldInput({
  name,
  value,
  onChange,
}: {
  name: DiaryFieldKey;
  value: FieldValue;
  onChange: (v: FieldValue) => void;
}) {
  const kind = FIELD_META[name].kind;
  const id = `field-${name}`;

  if (kind === "clock") {
    return (
      <Input
        id={id}
        type="time"
        className="h-11 w-36 text-base"
        value={typeof value === "string" ? value : ""}
        onChange={(e) => onChange(e.target.value || undefined)}
      />
    );
  }

  if (kind === "quality") {
    return (
      <ToggleGroup
        type="single"
        variant="outline"
        className="flex-wrap justify-start"
        value={value != null ? String(value) : ""}
        onValueChange={(v) => onChange(v ? Number(v) : undefined)}
        aria-label="Sleep quality"
      >
        {QUALITY_LABELS.map((label, i) => (
          <ToggleGroupItem key={label} value={String(i + 1)} className="h-10 px-3 text-xs">
            {label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Input
        id={id}
        type="number"
        inputMode="numeric"
        min={0}
        max={kind === "count" ? 30 : 720}
        className="h-11 w-24 text-base"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value === "" ? undefined : Math.max(0, Math.round(Number(e.target.value))))}
      />
      <span className="text-sm text-muted-foreground">{kind === "minutes" ? "min" : "times"}</span>
    </div>
  );
}
