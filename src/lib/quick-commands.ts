import { invoke } from "@tauri-apps/api/core";

export interface QuickCommand {
  id: string;
  label: string;
  command: string;
}

const CONFIG_KEY = "quick-commands";

const DEFAULT_COMMANDS: QuickCommand[] = [
  { id: "1", label: "ls", command: "ls -la\n" },
  { id: "2", label: "clear", command: "clear\n" },
  { id: "3", label: "top", command: "top\n" },
];

export async function loadQuickCommands(): Promise<QuickCommand[]> {
  try {
    const data = await invoke<QuickCommand[] | null>("config_read", { key: CONFIG_KEY });
    if (data) return data;
  } catch {}
  return DEFAULT_COMMANDS;
}

export async function saveQuickCommands(commands: QuickCommand[]) {
  await invoke("config_write", { key: CONFIG_KEY, value: commands });
}
