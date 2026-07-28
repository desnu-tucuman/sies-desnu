"use client";

import { useState } from "react";
import { normalizeForMatch } from "@/domain/institutions";

interface MultiSelectFilterProps {
  name: string;
  label: string;
  value: string[];
  options: string[];
}

export function MultiSelectFilter({ name, label, value, options }: MultiSelectFilterProps) {
  const [selected, setSelected] = useState(() => value.flatMap((item) => {
    const option = options.find((candidate) => normalizeForMatch(candidate) === normalizeForMatch(item));
    return option ? [option] : [];
  }));
  const summary = selected.length === 0 ? "Todos" : selected.length === 1 ? selected[0] : `${selected.length} seleccionadas`;

  const toggle = (option: string) => {
    setSelected((current) => current.includes(option)
      ? current.filter((item) => item !== option)
      : [...current, option]);
  };

  return <div className="multiSelectFilter">
    <span className="multiSelectLabel">{label}</span>
    <details>
      <summary><span>{summary}</span><span aria-hidden="true">⌄</span></summary>
      <fieldset>
        <legend className="visuallyHidden">{label}</legend>
        <label>
          <input type="checkbox" checked={selected.length === 0} onChange={() => setSelected([])} />
          <span>Todos</span>
        </label>
        {options.map((option) => <label key={option}>
          <input type="checkbox" name={name} value={option} checked={selected.includes(option)} onChange={() => toggle(option)} />
          <span>{option}</span>
        </label>)}
      </fieldset>
    </details>
  </div>;
}
