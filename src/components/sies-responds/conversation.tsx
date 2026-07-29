"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { SiesConversationalResult, SiesRespondsMessage, SiesRespondsNavigationContext, SiesRespondsResponse } from "@/domain/sies-responds";
import { SiesRespondsPromptInput } from "./prompt-input";
import { SiesRespondsSuggestions } from "./suggestions";

function initialMessages(query: string, response?: SiesRespondsResponse): SiesRespondsMessage[] {
  if (!query.trim() || !response) return [];
  return [
    { id: "initial-user", role: "user", text: query.trim() },
    { id: "initial-assistant", role: "assistant", text: response.text, response },
  ];
}

function ConversationResult({ result }: { result: SiesConversationalResult }) {
  return <div className="conversationalResult">
    <div className="conversationalMetrics">{result.metrics.map((metric) => <div key={metric.label}><strong>{metric.value}</strong><span>{metric.label}</span></div>)}</div>
    {result.referenceYear ? <p className="conversationalYear">Año de referencia: {result.referenceYear}</p> : null}
    {result.appliedFilters?.length ? <p className="conversationalYear">Filtros aplicados: {result.appliedFilters.join(" · ")}</p> : null}
    {result.includedTitles?.length ? <details className="conversationalDetails"><summary>Títulos incluidos ({result.includedTitles.length})</summary><ul>{result.includedTitles.map((title) => <li key={title}>{title}</li>)}</ul></details> : null}
    {result.series?.length ? <div className="tableScroll"><table><thead><tr><th>Año</th><th>Ingresantes</th><th>Matrícula</th><th>Egresados</th></tr></thead><tbody>{result.series.map((row) => <tr key={row.year}><td>{row.year}</td><td>{row.entrants}</td><td>{row.enrollment}</td><td>{row.graduates}</td></tr>)}</tbody></table></div> : null}
    {result.source ? <p className="conversationalYear">Fuente: {result.source}</p> : null}
    {result.groups.length ? <div className="conversationalGroups">{result.groups.slice(0, 20).map((group) => <details key={group.label} open={result.groups.length <= 5}>
      <summary><span>{group.label}</span><strong>{group.count}</strong></summary>
      <ul>{group.items.map((item, index) => <li key={`${item.label}-${index}`}><div>{item.href ? <Link href={item.href}>{item.label}</Link> : <strong>{item.label}</strong>}{item.detail ? <span>{item.detail}</span> : null}</div></li>)}</ul>
    </details>)}</div> : <p className="noConversationalResults">No hay resultados para agrupar con los criterios interpretados.</p>}
    {result.truncated ? <p className="conversationalLimit">Se muestra una selección del resultado. Usa los accesos siguientes para consultar el listado completo.</p> : null}
  </div>;
}

export function SiesRespondsConversation({ initialQuery, initialResponse, context }: { initialQuery: string; initialResponse?: SiesRespondsResponse; context: SiesRespondsNavigationContext }) {
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState(() => initialMessages(initialQuery, initialResponse));
  const [processing, setProcessing] = useState(false);
  const sequence = useRef(0);
  const endRef = useRef<HTMLDivElement>(null);
  const initialRender = useRef(true);

  useEffect(() => {
    if (initialRender.current) { initialRender.current = false; return; }
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages, processing]);

  const submit = async () => {
    const text = query.trim();
    if (!text || processing) return;
    sequence.current += 1;
    const id = sequence.current;
    setMessages((current) => [...current, { id: `user-${id}`, role: "user", text }]);
    setQuery("");
    setProcessing(true);
    window.history.replaceState(null, "", `/responde?q=${encodeURIComponent(text)}`);
    try {
      const request = await fetch("/api/responde", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text, context }) });
      if (!request.ok) throw new Error(`SIES Responde respondió ${request.status}`);
      const response = await request.json() as SiesRespondsResponse;
      setMessages((current) => [...current, { id: `assistant-${id}`, role: "assistant", text: response.text, response }]);
    } catch {
      setMessages((current) => [...current, { id: `assistant-${id}`, role: "assistant", text: "No pude consultar los datos del SIES en este momento. Intenta nuevamente en unos instantes." }]);
    } finally {
      setProcessing(false);
    }
  };

  const reset = () => {
    setMessages([]); setQuery(""); setProcessing(false);
    window.history.replaceState(null, "", "/responde");
  };

  return <section className="respondsConversation" aria-label="Conversación con SIES Responde">
    <div className="conversationToolbar"><span>{messages.length ? "Consulta en curso" : "Nueva consulta"}</span><button type="button" onClick={reset} disabled={!messages.length && !query}>Iniciar nueva consulta</button></div>
    <div className="messageHistory" aria-live="polite" aria-busy={processing}>
      {!messages.length ? <div className="respondsInitialState"><h2>¿Qué información necesitas?</h2><p>Puedo orientarte hacia instituciones, oferta académica, autoridades, mapa o listados.</p><SiesRespondsSuggestions onSelect={setQuery} /></div> : messages.map((message) => <article className={`respondsMessage ${message.role === "user" ? "userMessage" : "assistantMessage"}`} key={message.id}>
        <span>{message.role === "user" ? "Tú" : "SIES Responde"}</span><p>{message.text}</p>
        {message.response?.result ? <ConversationResult result={message.response.result} /> : null}
        {message.response?.actions.length ? <div className="respondsActions">{message.response.actions.map((item) => <Link href={item.href} key={item.href}>{item.label}</Link>)}</div> : null}
      </article>)}
      {processing ? <div className="processingMessage"><span className="spinner" aria-hidden="true" /> Analizando el tema de la consulta…</div> : null}
      <div ref={endRef} />
    </div>
    <SiesRespondsPromptInput value={query} onChange={setQuery} onSubmit={submit} disabled={processing} />
    <p className="promptHelp">Enter para enviar · Shift + Enter para una nueva línea</p>
  </section>;
}
