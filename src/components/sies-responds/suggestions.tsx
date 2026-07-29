"use client";

export const SIES_RESPONDS_SUGGESTIONS = [
  "¿Dónde se dicta el Profesorado de Inglés?",
  "Institutos con formación docente en Capital.",
  "Tecnicaturas en informática en el sur de Tucumán.",
  "¿Quién dirige el IES Aguilares?",
  "¿Qué carreras se dictan en Monteros?",
];

export function SiesRespondsSuggestions({ onSelect, compact = false }: { onSelect: (question: string) => void; compact?: boolean }) {
  return <div className={compact ? "respondsSuggestions compactSuggestions" : "respondsSuggestions"} aria-label="Preguntas sugeridas">
    {SIES_RESPONDS_SUGGESTIONS.map((question) => <button type="button" key={question} onClick={() => onSelect(question)}>{question}</button>)}
  </div>;
}
