"use client";

import { useState, type FormEvent } from "react";
import { Save } from "lucide-react";
import type { CropStage, CropType, Field } from "@/types";
import { useReadyState } from "@/components/providers/UrvaraProvider";
import { Button, FieldError, Label, Select, TextInput } from "@/components/ui/primitives";
import { CROP_ORDER, CROPS, STAGE_LABEL } from "@/data/crops";
import { istDate } from "@/lib/time";
import { saveField, validateFieldDraft, type FieldDraft } from "@/services/farms";

/** Add a field to a farm, or edit crop, stage and size of an existing one. */
export function FieldForm({ farmId, field, onDone }: { farmId: string; field?: Field; onDone: () => void }) {
  const { state, user, run } = useReadyState();
  const [draft, setDraft] = useState<FieldDraft>(
    field
      ? { farmId: field.farmId, name: field.name, crop: field.crop, stage: field.stage, areaAcres: field.areaAcres, plantedOn: field.plantedOn, soilType: field.soilType }
      : { farmId, name: "", crop: "tomato", stage: "sowing", areaAcres: 0, plantedOn: istDate(state.now), soilType: "Medium black" },
  );
  const [area, setArea] = useState(field ? String(field.areaAcres) : "");
  const [touched, setTouched] = useState(false);
  const errors = validateFieldDraft(state, { ...draft, areaAcres: Number(area) }, field?.id);
  const id = field?.id ?? "new";

  async function submit(e: FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (Object.keys(errors).length) return;
    const ok = await run((s) => saveField(s, { ...draft, areaAcres: Number(area) }, user.id, field?.id).state, {
      success: field ? `${draft.name} updated` : `${draft.name} added`,
      undoable: true,
    });
    if (ok) onDone();
  }

  const err = (k: keyof FieldDraft) => (touched ? errors[k] : undefined);

  return (
    <form onSubmit={submit} noValidate className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <div className="sm:col-span-2 lg:col-span-1">
        <Label htmlFor={`ff-name-${id}`}>Field name</Label>
        <TextInput id={`ff-name-${id}`} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} aria-invalid={!!err("name")} aria-describedby={`ff-name-err-${id}`} placeholder="Field 4 – Well side" />
        <FieldError id={`ff-name-err-${id}`}>{err("name")}</FieldError>
      </div>
      <div>
        <Label htmlFor={`ff-crop-${id}`}>Crop</Label>
        <Select id={`ff-crop-${id}`} value={draft.crop} onChange={(e) => setDraft({ ...draft, crop: e.target.value as CropType })}>
          {CROP_ORDER.map((c) => (
            <option key={c} value={c}>
              {CROPS[c].label}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <Label htmlFor={`ff-stage-${id}`}>Crop stage</Label>
        <Select id={`ff-stage-${id}`} value={draft.stage} onChange={(e) => setDraft({ ...draft, stage: e.target.value as CropStage })}>
          {(Object.keys(STAGE_LABEL) as CropStage[]).map((s) => (
            <option key={s} value={s}>
              {STAGE_LABEL[s].en}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <Label htmlFor={`ff-area-${id}`} hint="acres">
          Area
        </Label>
        <TextInput id={`ff-area-${id}`} inputMode="decimal" value={area} onChange={(e) => setArea(e.target.value.replace(/[^\d.]/g, ""))} aria-invalid={!!err("areaAcres")} aria-describedby={`ff-area-err-${id}`} placeholder="4.5" />
        <FieldError id={`ff-area-err-${id}`}>{err("areaAcres")}</FieldError>
      </div>
      <div>
        <Label htmlFor={`ff-planted-${id}`}>Planted / sown on</Label>
        <TextInput id={`ff-planted-${id}`} type="date" value={draft.plantedOn} onChange={(e) => setDraft({ ...draft, plantedOn: e.target.value })} aria-invalid={!!err("plantedOn")} />
        <FieldError id={`ff-planted-err-${id}`}>{err("plantedOn")}</FieldError>
      </div>
      <div>
        <Label htmlFor={`ff-soil-${id}`}>Soil type</Label>
        <TextInput id={`ff-soil-${id}`} value={draft.soilType} onChange={(e) => setDraft({ ...draft, soilType: e.target.value })} />
      </div>
      <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-3">
        <Button type="submit" icon={Save}>
          {field ? "Save field" : "Add field"}
        </Button>
        <Button variant="secondary" onClick={onDone}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
