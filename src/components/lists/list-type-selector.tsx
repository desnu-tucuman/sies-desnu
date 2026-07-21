"use client";

import { useRouter } from "next/navigation";
import { LIST_REPORT_LABELS, LIST_REPORT_TYPES, type ListReportType } from "@/domain/list-reports";

export function ListTypeSelector({ value }: { value: ListReportType }) {
  const router = useRouter();
  return <label className="listTypeSelector"><span>Tipo de listado</span><select value={value} onChange={(event) => router.push(`/listados?type=${event.target.value}`)}>{LIST_REPORT_TYPES.map((type) => <option key={type} value={type}>{LIST_REPORT_LABELS[type]}</option>)}</select></label>;
}
