"use client";

import { usePathname } from "next/navigation";
import { useCallback, useState } from "react";
import { navigationContextFromPath } from "@/services/sies-responds-router-service";
import { SiesRespondsPanel } from "./panel";

export function SiesRespondsFloatingButton() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const context = navigationContextFromPath(pathname);
  return <div className="respondsFloating">
    {open ? <SiesRespondsPanel context={context} onClose={close} /> : null}
    <button className="respondsFloatingButton" type="button" onClick={() => setOpen((current) => !current)} aria-expanded={open} aria-controls="sies-responds-panel">
      <span aria-hidden="true">◌</span> SIES Responde
    </button>
  </div>;
}
