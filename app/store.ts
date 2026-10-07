"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { DEFAULT_PROJECT } from "./defaults";
import { validateProject, type HektorConfig, type HektorPattern, type HektorProject } from "./project";

type StudioStore = {
  project: HektorProject;
  ready: boolean;
  storageError: string | null;
  setProject: (value: unknown) => string | null;
  updateConfig: (patch: Partial<HektorConfig>) => string | null;
  updatePattern: (patch: Partial<HektorPattern>) => string | null;
  resetProject: () => void;
};

let writesEnabled = false;
let writing = false;
const storage = createJSONStorage<{ project: HektorProject }>(() => ({
  getItem: name => localStorage.getItem(name),
  setItem: (name, value) => {
    if (!writesEnabled || writing) return;
    writing = true;
    try {
      localStorage.setItem(name, value);
      if (useStudioStore.getState().storageError) useStudioStore.setState({ storageError: null });
    } catch {
      useStudioStore.setState({ storageError: "Browser storage is unavailable. Download JSON to keep your project." });
    } finally { writing = false; }
  },
  removeItem: name => localStorage.removeItem(name),
}));

export const useStudioStore = create<StudioStore>()(persist((set, get) => ({
  project: structuredClone(DEFAULT_PROJECT),
  ready: false,
  storageError: null,
  setProject: value => {
    const result = validateProject(value);
    if (!result.ok) return result.error;
    set({ project: result.project });
    return null;
  },
  updateConfig: patch => get().setProject({ ...get().project, config: { ...get().project.config, ...patch } }),
  updatePattern: patch => get().setProject({ ...get().project, pattern: { ...get().project.pattern, ...patch } }),
  resetProject: () => { get().setProject(structuredClone(DEFAULT_PROJECT)); },
}), {
  name: "hektor-project-v1",
  version: 1,
  storage,
  skipHydration: true,
  partialize: state => ({ project: state.project }),
  migrate: () => { throw new Error("This saved project uses an unsupported storage version."); },
  merge: (persisted, current) => {
    if (persisted == null) return current;
    const result = validateProject((persisted as { project?: unknown } | undefined)?.project);
    if (!result.ok) throw new Error("The saved project could not be restored. Defaults are shown; your next edit will replace the browser copy.");
    return { ...current, project: result.project };
  },
  onRehydrateStorage: () => (_state, error) => {
    // Status changes must not overwrite a corrupt or unreadable saved project.
    useStudioStore.setState({ ready: true, storageError: error ?
      (error instanceof Error ? error.message : "Browser storage could not be restored.") : null });
    writesEnabled = true;
  },
}));

let hydration: Promise<void> | undefined;
export function hydrateStudio(): Promise<void> {
  hydration ??= Promise.resolve(useStudioStore.persist.rehydrate());
  return hydration;
}
