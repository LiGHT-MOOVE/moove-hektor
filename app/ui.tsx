import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react";

export function Button({ primary = false, className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { primary?: boolean }) {
  return <button type="button" {...props} className={`inline-flex min-h-9 items-center justify-center rounded-md border px-3.5 py-2 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 disabled:cursor-default disabled:opacity-40 ${primary ? "border-transparent bg-gray-900 text-white hover:bg-slate-700" : "border-slate-300 bg-white text-slate-950 hover:border-slate-400 hover:bg-slate-50"} ${className}`} />;
}

export function Panel({ title, children, actions }: { title: string; children: ReactNode; actions?: ReactNode }) {
  return <section className="min-w-0 rounded-lg border border-slate-300 bg-white/80 p-4">
    <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
      <h2 className="text-sm font-semibold uppercase text-slate-700">{title}</h2>{actions}
    </div>{children}
  </section>;
}

export function Range({ label, value, onValue, min, max, unit = "", disabled = false }: { label: string; value: number; onValue: (value: number) => void; min: number; max: number; unit?: string; disabled?: boolean }) {
  return <label className={`grid gap-2 text-sm font-medium text-slate-700 ${disabled ? "opacity-40" : ""}`}>
    <span className="flex items-baseline justify-between gap-3">{label}<output className="font-normal text-slate-500 tabular-nums">{Math.round(value)}{unit}</output></span>
    <input aria-label={label} className="w-full accent-slate-950 focus-visible:outline-2 focus-visible:outline-teal-700 disabled:cursor-default" type="range" min={Math.min(min, value)} max={Math.max(max, value)} step="1" value={value} disabled={disabled} onChange={event => onValue(Number(event.target.value))} />
  </label>;
}

export function Toggle({ label, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
    <input {...props} type="checkbox" className="size-4 accent-slate-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700" />{label}
  </label>;
}

export function Select({ label, children, ...props }: SelectHTMLAttributes<HTMLSelectElement> & { label: string }) {
  return <label className="grid gap-2 text-sm font-medium text-slate-700">{label}
    <select {...props} className="h-10 min-w-0 rounded-md border border-slate-300 bg-white px-3 text-slate-950 outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-700/15">{children}</select>
  </label>;
}

export function ErrorMessage({ children }: { children: ReactNode }) {
  return <p role="alert" className="whitespace-pre-wrap rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{children}</p>;
}
