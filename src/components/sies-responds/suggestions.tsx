"use client";

export const SIES_RESPONDS_SUGGESTIONS = [
  "¿Cuántos egresados hubo en Farmacia?",
  "¿Qué tecnicaturas se dictan en el sur?",
  "¿Cuántos ingresantes tuvieron los profesorados en 2025?",
  "¿Qué institutos estatales tienen carreras de Enfermería?",
  "¿Qué carreras no registraron egresados?",
];

export function SiesRespondsSuggestions({ onSelect, compact = false }: { onSelect: (question: string) => void; compact?: boolean }) {
  return <div className={compact ? "respondsSuggestions compactSuggestions" : "respondsSuggestions"} aria-label="Preguntas sugeridas">
    {SIES_RESPONDS_SUGGESTIONS.map((question) => <button type="button" key={question} onClick={() => onSelect(question)}>{question}</button>)}
  </div>;
}
