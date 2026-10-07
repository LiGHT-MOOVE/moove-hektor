"use client";

import { useEffect, useState } from "react";
import { hydrateStudio, useStudioStore } from "./store";
import { CONFIG } from "./defaults";
import { buildSvg, downloadText } from "./export";
import type { HektorConfig, HektorPattern } from "./project";
import Preview, { type PreviewMode } from "./preview";
import ProjectPanel from "./project-panel";
import { Button, ErrorMessage, Panel, Range, Select, Toggle } from "./ui";

export default function Editor({ runtimeSource }: { runtimeSource: string }) {
  const { project, ready, storageError, updateConfig, updatePattern, resetProject } = useStudioStore();
  const { config, pattern } = project;
  const [mode, setMode] = useState<PreviewMode>("desktop");
  const [animate, setAnimate] = useState(true);
  const [selection, setSelection] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [resetCount, setResetCount] = useState(0);
  const [fixedOffset, setFixedOffset] = useState(config.patternOffset ?? { x: 0, y: 0 });
  const selected = Math.min(selection, pattern.motifs.length - 1);
  const motif = pattern.motifs[selected];

  useEffect(() => { if (!ready) void hydrateStudio(); }, [ready]);

  function changeConfig(patch: Partial<HektorConfig>, start = false) {
    setError(updateConfig(patch));
    if (start) setAnimate(true);
  }
  function changePattern(patch: Partial<HektorPattern>) { setError(updatePattern(patch)); }
  function changeMotif(patch: Partial<HektorPattern["motifs"][number]>) {
    changePattern({ motifs: pattern.motifs.map((value, i) => i === selected ? { ...value, ...patch } : value) });
  }
  function exportSvg(open = false) {
    try {
      const svg = buildSvg(project, runtimeSource);
      if (open) {
        const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
        window.open(url, "_blank", "noopener,noreferrer");
        setTimeout(() => URL.revokeObjectURL(url), 60_000);
      } else downloadText("hektor.svg", svg, "image/svg+xml;charset=utf-8");
      setError(null);
    } catch (error) { setError(error instanceof Error ? error.message : "SVG export failed."); }
  }

  return <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
    <header className="mb-5 flex flex-col gap-3 border-b border-slate-300 pb-4 sm:flex-row sm:items-end sm:justify-between">
      <div><h1 className="text-2xl font-semibold tracking-normal">moove-hektor</h1><p className="mt-1 text-sm text-slate-500">Hero banner generator for Moove</p></div>
      <div className="flex flex-wrap gap-2">
        <Button disabled={!ready} onClick={() => { resetProject(); setSelection(0); setMode("desktop"); setAnimate(true); setError(null); setResetCount(value => value + 1); }}>Restore defaults</Button>
        <Button primary disabled={!ready} onClick={() => exportSvg()}>Download SVG</Button>
      </div>
    </header>
    <fieldset disabled={!ready} className="min-w-0">
      <div className="sticky top-0 z-10 mb-5 bg-[#f5f4ef]/95 pb-3 pt-2 backdrop-blur-sm">
        <Preview project={project} mode={mode} animate={animate} />
        <div role="group" aria-label="Preview controls" className="mt-3 flex flex-wrap items-center justify-center gap-x-5 gap-y-3">
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700">Preview mode
            <select className="h-9 min-w-0 rounded-md border border-slate-300 bg-white px-2 outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-700/15" value={mode} onChange={event => setMode(event.target.value as PreviewMode)}>
              <option value="desktop">Desktop (1440 × 900)</option><option value="mobile">Mobile (390 × 844)</option><option value="intersect">Intersect viewport</option>
            </select>
          </label>
          <Toggle label="Animate trails" checked={animate} onChange={event => setAnimate(event.target.checked)} />
          <Button onClick={() => exportSvg(true)}>Open SVG</Button>
        </div>
      </div>
      <div className="mb-4 grid gap-3">
        <p role="status" className="text-xs text-slate-500">{!ready ? "Restoring project…" : storageError ? "Download JSON to keep a portable copy of your project." : "Changes are saved in this browser. Download JSON to keep or share a project."}</p>
        {storageError && <ErrorMessage>{storageError}</ErrorMessage>}
        {error && <ErrorMessage>{error}</ErrorMessage>}
      </div>
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <div className="grid min-w-0 gap-4">
          <Panel title="Pattern">
            <div className="grid gap-5 sm:grid-cols-3">
              <Range label="Motif width" value={config.motifWidth} min={100} max={1000} unit=" px" onValue={motifWidth => changeConfig({ motifWidth })} />
              <Range label="Tile width" value={pattern.tileWidth} min={200} max={5000} onValue={tileWidth => changePattern({ tileWidth })} />
              <Range label="Tile height" value={pattern.tileHeight} min={100} max={2000} onValue={tileHeight => changePattern({ tileHeight })} />
            </div>
          </Panel>
          <Panel title="Pattern position">
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="sm:col-span-2"><Toggle label="Random placement" checked={config.patternOffset === null} onChange={event => {
                if (event.target.checked) { setFixedOffset(config.patternOffset ?? fixedOffset); changeConfig({ patternOffset: null }); }
                else changeConfig({ patternOffset: fixedOffset });
              }} /></div>
              <Range label="Horizontal offset" value={(config.patternOffset ?? fixedOffset).x * 100} min={-100} max={100} unit="%" disabled={config.patternOffset === null} onValue={x => changeConfig({ patternOffset: { x: x / 100, y: config.patternOffset?.y ?? 0 } })} />
              <Range label="Vertical offset" value={(config.patternOffset ?? fixedOffset).y * 100} min={-100} max={100} unit="%" disabled={config.patternOffset === null} onValue={y => changeConfig({ patternOffset: { x: config.patternOffset?.x ?? 0, y: y / 100 } })} />
            </div>
          </Panel>
          <Panel title="Motifs" actions={<div className="flex gap-2">
            <Button disabled={pattern.motifs.length >= 256} onClick={() => { const issue = updatePattern({ motifs: [...pattern.motifs, { x: 0.5, y: 0.5, rotation: 0 }] }); setError(issue); if (!issue) setSelection(pattern.motifs.length); }}>Add motif</Button>
            <Button disabled={pattern.motifs.length === 1} onClick={() => { changePattern({ motifs: pattern.motifs.filter((_, i) => i !== selected) }); setSelection(0); }}>Remove motif</Button>
          </div>}>
            <div className="grid gap-5 sm:grid-cols-2">
              <Select label="Selected motif" value={selected} onChange={event => setSelection(Number(event.target.value))}>{pattern.motifs.map((_, i) => <option key={i} value={i}>Motif {i + 1}</option>)}</Select>
              <Toggle label="Invert motif" checked={motif.rotation === 180} onChange={event => changeMotif({ rotation: event.target.checked ? 180 : 0 })} />
              <Range label="Horizontal position" value={motif.x * 100} min={-100} max={200} unit="%" onValue={x => changeMotif({ x: x / 100 })} />
              <Range label="Vertical position" value={motif.y * 100} min={-100} max={200} unit="%" onValue={y => changeMotif({ y: y / 100 })} />
            </div>
          </Panel>
          <Panel title="Appearance">
            <div className="grid gap-5 sm:grid-cols-2">
              <label className="grid gap-2 text-sm font-medium text-slate-700">Trail color<input aria-label="Trail color" type="color" list="default-colors" className="h-9 w-full cursor-pointer rounded-md border border-slate-300 bg-white p-1" value={config.color} onChange={event => changeConfig({ color: event.target.value })} />
                <datalist id="default-colors">
                  <option value={CONFIG.color} /><option value="#43bfb5" /><option value="#000000" /><option value="#ffffff" />
                  <option value={CONFIG.backgroundTop} /><option value={CONFIG.backgroundMiddle} /><option value={CONFIG.backgroundBottom} />
                </datalist>
              </label>
              <Range label="Stroke width" value={config.strokeWidth} min={1} max={150} onValue={strokeWidth => changeConfig({ strokeWidth })} />
              <Range label="Blur" value={config.blurEnabled ? config.blurRatio * 100 : 0} min={0} max={100} unit="%" onValue={value => changeConfig({ blurEnabled: value > 0, blurRatio: value / 100 })} />
              <div className="flex flex-wrap items-center gap-4">{([['shadowEnabled', 'Shadow'], ['gradientEnabled', 'Background gradient']] as const).map(([key, label]) => <Toggle key={key} label={label} checked={config[key]} onChange={event => changeConfig({ [key]: event.target.checked })} />)}</div>
              <div className="grid gap-5 sm:col-span-2 sm:grid-cols-3">
                {([['backgroundTop', 'Background top'], ['backgroundMiddle', 'Background middle'], ['backgroundBottom', 'Background bottom']] as const).map(([key, label]) => {
                  const disabled = key !== 'backgroundTop' && !config.gradientEnabled;
                  return <label key={key} className={`grid gap-2 text-sm font-medium text-slate-700 ${disabled ? 'opacity-40' : ''}`}>{label}
                    <input aria-label={label} type="color" list="default-colors" className="h-9 w-full cursor-pointer rounded-md border border-slate-300 bg-white p-1 disabled:cursor-default" value={config[key]} disabled={disabled} onChange={event => changeConfig({ [key]: event.target.value })} />
                  </label>;
                })}
              </div>
            </div>
          </Panel>
          <Panel title="Animation">
            <div className="grid gap-5 sm:grid-cols-2">
              <Select label="Staggering" value={config.staggerMode} onChange={event => changeConfig({ staggerMode: event.target.value as HektorConfig["staggerMode"] }, true)}><option value="random">Random</option><option value="x">Scan X (columns)</option><option value="y">Scan Y (rows)</option></Select>
              <Toggle label="Random starting positions" checked={config.randomStartingPositions} onChange={event => changeConfig({ randomStartingPositions: event.target.checked }, true)} />
              <Range label="Circuit duration" value={config.loopDuration} min={1} max={60} unit=" s" onValue={loopDuration => changeConfig({ loopDuration }, true)} />
              <Range label="Drawing duration" value={config.drawDuration} min={1} max={120} unit=" s" disabled={config.pauseDuration === 0} onValue={drawDuration => changeConfig({ drawDuration }, true)} />
              <Range label="Trail length" value={config.trailFraction * 100} min={1} max={99} unit="%" onValue={value => changeConfig({ trailFraction: value / 100 }, true)} />
              <Range label="Pause between trails" value={config.pauseDuration} min={0} max={30} unit=" s" onValue={pauseDuration => changeConfig({ pauseDuration }, true)} />
              <Range label="Head fade length" value={config.headFadeLength} min={0} max={500} onValue={headFadeLength => changeConfig({ headFadeLength }, true)} />
              <Range label="Tail fade length" value={config.tailFadeLength} min={0} max={500} onValue={tailFadeLength => changeConfig({ tailFadeLength }, true)} />
              <p className="text-xs text-slate-500 sm:col-span-2">Set a fade length to 0 for a solid, rounded end.</p>
            </div>
          </Panel>
        </div>
        <ProjectPanel key={resetCount} />
      </div>
    </fieldset>
  </main>;
}
