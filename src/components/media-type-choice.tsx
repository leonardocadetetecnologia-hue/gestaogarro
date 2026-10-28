"use client";

import { demandMediaTypeLabels, type DemandMediaType } from "@/lib/demand-media-type";

const choiceOrder = ["FOTO", "VIDEO", "FOTO_E_VIDEO"] as const satisfies readonly DemandMediaType[];

export function MediaTypeChoice({
  value,
  onChange,
  disabled,
  required,
}: {
  value: string;
  onChange: (value: DemandMediaType) => void;
  disabled?: boolean;
  required?: boolean;
}) {
  return (
    <fieldset className="media-type-choice" disabled={disabled}>
      <legend>Tipo{required ? " *" : ""}</legend>
      <div>
        {choiceOrder.map((type) => (
          <label key={type}>
            <input
              type="radio"
              name="demandMediaType"
              value={type}
              required={required}
              checked={value === type}
              onChange={() => onChange(type)}
            />
            {demandMediaTypeLabels[type]}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
