import { NextResponse } from "next/server";
import type { SiesRespondsQuery } from "@/domain/sies-responds";
import { answerSiesRespondsQuery } from "@/server/services/sies-responds-service";

export async function POST(request: Request) {
  try {
    const payload = await request.json() as Partial<SiesRespondsQuery>;
    const text = typeof payload.text === "string" ? payload.text.trim() : "";
    if (!text) return NextResponse.json({ error: "La consulta está vacía." }, { status: 400 });
    if (text.length > 500) return NextResponse.json({ error: "La consulta supera el máximo de 500 caracteres." }, { status: 400 });
    return NextResponse.json(await answerSiesRespondsQuery({ text, context: payload.context }));
  } catch (error) {
    console.error("[SIES Responde] Error en endpoint", { error: error instanceof Error ? error.name : "UnknownError" });
    return NextResponse.json({ error: "No se pudo procesar la consulta." }, { status: 500 });
  }
}
