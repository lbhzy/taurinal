import { invoke } from "@tauri-apps/api/core";
import type { ConnectionConfig } from "@/components/Terminal";

export interface SavedSession {
  id: string;
  name: string;
  config: ConnectionConfig;
}

const CONFIG_KEY = "saved-sessions";

export async function loadSavedSessions(): Promise<SavedSession[]> {
  try {
    const data = await invoke<SavedSession[] | null>("config_read", { key: CONFIG_KEY });
    if (data) return data;
  } catch {}
  return [];
}

export async function saveSessions(sessions: SavedSession[]) {
  await invoke("config_write", { key: CONFIG_KEY, value: sessions });
}
