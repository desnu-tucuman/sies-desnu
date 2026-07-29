"use client";

import { useState } from "react";
import { SiesRespondsPromptInput } from "./prompt-input";
import { SiesRespondsSuggestions } from "./suggestions";

export function SiesRespondsHomeEntry() {
  const [query, setQuery] = useState("");
  return <section className="contentWidth respondsHomeEntry" aria-labelledby="responds-home-title">
    <div className="respondsHomeIntro"><p className="eyebrow">Una nueva forma de consultar</p><h2 id="responds-home-title">SIES Responde</h2><p>Consulta en lenguaje cotidiano información sobre instituciones, carreras, autoridades y territorio.</p></div>
    <form action="/responde" method="get">
      <SiesRespondsPromptInput value={query} onChange={setQuery} name="q" />
      <SiesRespondsSuggestions onSelect={setQuery} />
    </form>
  </section>;
}
