import { invoke } from "@tauri-apps/api/core";

export interface TriggerAction {
  /** Highlight matched text with this color */
  highlight?: string;
  /** Show tooltip on hover */
  tooltip?: string;
  /** Send this command when matched text is clicked */
  clickCommand?: string;
  /** Automatically send this command when pattern matches */
  autoCommand?: string;
}

export interface Trigger {
  id: string;
  name: string;
  /** Regex pattern string */
  pattern: string;
  /** Whether trigger is active */
  enabled: boolean;
  actions: TriggerAction;
}

const CONFIG_KEY = "triggers";

export async function loadTriggers(): Promise<Trigger[]> {
  try {
    const data = await invoke<Trigger[] | null>("config_read", { key: CONFIG_KEY });
    if (data) return data;
  } catch {}
  return [];
}

export async function saveTriggers(triggers: Trigger[]) {
  await invoke("config_write", { key: CONFIG_KEY, value: triggers });
}
