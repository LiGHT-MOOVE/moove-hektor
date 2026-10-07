"use client";

import { useRef, useState } from "react";
import { useStudioStore } from "./store";
import { parseProject, serializeProject } from "./project";
import { downloadText } from "./export";
import { Button, ErrorMessage, Panel } from "./ui";

export default function ProjectPanel() {
  const project = useStudioStore(state => state.project);
  const setProject = useStudioStore(state => state.setProject);
  // null follows the active project; a string is an independent, unapplied draft.
  const [draft, setDraft] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);
  const json = draft ?? serializeProject(project);

  function apply() {
    const result = parseProject(json);
    if (!result.ok) { setError(result.error); return; }
    const issue = setProject(result.project);
    if (issue) { setError(issue); return; }
    setDraft(null); setError(null); setMessage("Project applied.");
  }

  function format() {
    const result = parseProject(json);
    if (!result.ok) { setError(result.error); return; }
    setDraft(serializeProject(result.project)); setError(null); setMessage("");
  }

  return <Panel title="Project">
    <div className="mb-4 grid grid-cols-2 gap-2 text-sm">
      <div className="rounded-md border border-slate-200 bg-white px-3 py-2"><span className="block text-xs text-slate-500">Motifs</span><span className="font-semibold">{project.pattern.motifs.length}</span></div>
      <div className="rounded-md border border-slate-200 bg-white px-3 py-2"><span className="block text-xs text-slate-500">Tile dimensions</span><span className="font-semibold tabular-nums">{project.pattern.tileWidth} × {project.pattern.tileHeight}</span></div>
    </div>
    <label className="grid gap-2 text-sm font-medium text-slate-700">
      <span className="flex flex-wrap justify-between gap-2">Project JSON{draft !== null && <span className="font-normal text-amber-700">Unapplied changes</span>}</span>
      <textarea className="min-h-80 w-full resize-y rounded-md border border-slate-300 bg-slate-900 p-3 font-mono text-xs leading-relaxed text-slate-50 outline-none [tab-size:2] focus:border-teal-700 focus:ring-2 focus:ring-teal-700/15" spellCheck={false} value={json}
        onChange={event => { setDraft(event.target.value); setError(null); setMessage(""); }}
        onKeyDown={event => { if ((event.metaKey || event.ctrlKey) && event.key === "Enter") { event.preventDefault(); apply(); } }} />
    </label>
    <p className="mt-2 text-xs leading-relaxed text-slate-500">Apply JSON to update the preview. Download JSON saves the applied project. ⌘ / Ctrl + Enter to apply.</p>
    {error && <div className="mt-3"><ErrorMessage>{error}</ErrorMessage></div>}
    <div className="mt-3 flex flex-wrap gap-2">
      <Button primary onClick={apply}>Apply JSON</Button>
      <Button onClick={format}>Format</Button>
      <Button onClick={() => fileInput.current?.click()}>Load JSON</Button>
      <Button onClick={() => { downloadText("hektor-project.json", serializeProject(project), "application/json;charset=utf-8"); setMessage("Applied project downloaded."); }}>Download JSON</Button>
      <Button disabled={draft === null} onClick={() => { setDraft(null); setError(null); setMessage("Draft reverted."); }}>Revert edits</Button>
    </div>
    <input ref={fileInput} type="file" accept=".json,application/json" aria-label="Load project JSON file" className="sr-only" onChange={async event => {
      const file = event.target.files?.[0]; event.target.value = "";
      if (!file) return;
      try {
        if (file.size > 1_000_000) throw new Error("Project files must be smaller than 1 MB.");
        const text = await file.text();
        setDraft(text); setError(null); setMessage(`${file.name} loaded. Apply JSON to use it.`);
      } catch (error) { setError(error instanceof Error ? error.message : "Could not read the file."); }
    }} />
    <p role="status" className="mt-3 empty:hidden text-xs text-slate-500">{message}</p>
  </Panel>;
}
