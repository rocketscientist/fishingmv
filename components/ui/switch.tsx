
"use client";
import * as React from "react";
export function Switch({ id, checked, onCheckedChange }: { id?: string; checked: boolean; onCheckedChange: (v: boolean)=>void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      id={id}
      onClick={() => onCheckedChange(!checked)}
      className={`h-5 w-9 rounded-full p-0.5 transition-colors ${checked ? "bg-emerald-500" : "bg-zinc-400/60"}`}
    >
      <span className={`block h-4 w-4 rounded-full bg-white shadow transform transition-transform ${checked ? "translate-x-4" : ""}`} />
    </button>
  );
}
