"use client";

import type { KeyboardEvent } from "react";

interface PromptInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit?: () => void;
  disabled?: boolean;
  compact?: boolean;
  name?: string;
}

export function SiesRespondsPromptInput({ value, onChange, onSubmit, disabled = false, compact = false, name = "q" }: PromptInputProps) {
  const keyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey && onSubmit) {
      event.preventDefault();
      onSubmit();
    }
  };
  return <div className={compact ? "respondsPrompt compactPrompt" : "respondsPrompt"}>
    <label className="visuallyHidden" htmlFor={`${name}-${compact ? "compact" : "full"}`}>Escriba su consulta</label>
    <textarea id={`${name}-${compact ? "compact" : "full"}`} name={name} rows={compact ? 2 : 3} value={value} onChange={(event) => onChange(event.target.value)} onKeyDown={keyDown} placeholder="Escriba una consulta sobre el SIES…" disabled={disabled} />
    <button type={onSubmit ? "button" : "submit"} onClick={onSubmit} disabled={disabled || !value.trim()}>{disabled ? "Procesando…" : compact ? "Continuar" : "Enviar"}</button>
  </div>;
}
