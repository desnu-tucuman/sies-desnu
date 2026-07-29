"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { SiesRespondsMessage, SiesRespondsNavigationContext } from "@/domain/sies-responds";
import { routeSiesRespondsQuery } from "@/services/sies-responds-router-service";
import { SiesRespondsPromptInput } from "./prompt-input";
import { SiesRespondsSuggestions } from "./suggestions";

function initialMessages(query: string, context: SiesRespondsNavigationContext): SiesRespondsMessage[] {
  if (!query.trim()) return [];
  const response = routeSiesRespondsQuery({ text: query, context });
  return [
    { id: "initial-user", role: "user", text: query.trim() },
    { id: "initial-assistant", role: "assistant", text: response.text, response },
  ];
}

export function SiesRespondsConversation({ initialQuery, context }: { initialQuery: string; context: SiesRespondsNavigationContext }) {
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState(() => initialMessages(initialQuery, context));
  const [processing, setProcessing] = useState(false);
  const sequence = useRef(0);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }); }, [messages, processing]);

  const submit = () => {
    const text = query.trim();
    if (!text || processing) return;
    sequence.current += 1;
    const id = sequence.current;
    setMessages((current) => [...current, { id: `user-${id}`, role: "user", text }]);
    setQuery("");
    setProcessing(true);
    window.history.replaceState(null, "", `/responde?q=${encodeURIComponent(text)}`);
    window.setTimeout(() => {
      const response = routeSiesRespondsQuery({ text, context });
      setMessages((current) => [...current, { id: `assistant-${id}`, role: "assistant", text: response.text, response }]);
      setProcessing(false);
    }, 350);
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
        {message.response?.actions.length ? <div className="respondsActions">{message.response.actions.map((item) => <Link href={item.href} key={item.href}>{item.label}</Link>)}</div> : null}
      </article>)}
      {processing ? <div className="processingMessage"><span className="spinner" aria-hidden="true" /> Analizando el tema de la consulta…</div> : null}
      <div ref={endRef} />
    </div>
    <SiesRespondsPromptInput value={query} onChange={setQuery} onSubmit={submit} disabled={processing} />
    <p className="promptHelp">Enter para enviar · Shift + Enter para una nueva línea</p>
  </section>;
}
