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
        className="h-14 w-44 rounded-2xl text-xl font-semibold"
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
        className="grid w-full grid-cols-5 gap-2"
        value={value != null ? String(value) : ""}
        onValueChange={(v) => onChange(v ? Number(v) : undefined)}
        aria-label="Sleep quality"
      >
        {QUALITY_LABELS.map((label, i) => (
          <ToggleGroupItem key={label} value={String(i + 1)} className="h-14 rounded-2xl! border-2! px-1 text-xs font-semibold whitespace-normal">
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
        className="h-14 w-28 rounded-2xl text-xl font-semibold"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value === "" ? undefined : Math.max(0, Math.round(Number(e.target.value))))}
      />
      <span className="text-base text-muted-foreground">{kind === "minutes" ? "min" : "times"}</span>
    </div>
  );
}
