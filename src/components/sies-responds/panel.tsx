"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { SiesRespondsNavigationContext } from "@/domain/sies-responds";
import { contextHint } from "@/services/sies-responds-router-service";
import { SiesRespondsPromptInput } from "./prompt-input";

export function SiesRespondsPanel({ context, onClose }: { context: SiesRespondsNavigationContext; onClose: () => void }) {
  const [query, setQuery] = useState("");
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    closeRef.current?.focus();
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    document.addEventListener("keydown", escape);
    return () => document.removeEventListener("keydown", escape);
  }, [onClose]);
  const href = query.trim() ? `/responde?q=${encodeURIComponent(query.trim())}&contextPath=${encodeURIComponent(context.path)}` : "/responde";
  return <aside id="sies-responds-panel" className="respondsPanel" role="dialog" aria-modal="false" aria-labelledby="responds-panel-title">
    <header><div><span>Orientación dentro del SIES</span><h2 id="responds-panel-title">SIES Responde</h2></div><button ref={closeRef} type="button" onClick={onClose} aria-label="Cerrar SIES Responde">×</button></header>
    <p className="panelContext">{contextHint(context.module)}</p>
    <form action="/responde" method="get"><input type="hidden" name="contextPath" value={context.path} /><SiesRespondsPromptInput value={query} onChange={setQuery} compact /></form>
    <Link className="panelPrimaryAction" href={href}>Abrir experiencia completa</Link>
    <p className="panelLimit">En esta fase, SIES Responde orienta hacia los módulos disponibles y no utiliza inteligencia artificial externa.</p>
  </aside>;
}
