import type { ExtensionSettings, ProblemNotes, SyncRecord } from "../types";
import { DEFAULT_SETTINGS } from "../utils/constants";

const SETTINGS_KEY = "settings";
const NOTES_KEY = "problemNotes";
const HISTORY_KEY = "syncHistory";

export async function getSettings(): Promise<ExtensionSettings> {
  const result = await chrome.storage.local.get(SETTINGS_KEY);
  return { ...DEFAULT_SETTINGS, ...(result[SETTINGS_KEY] ?? {}) };
}

export async function saveSettings(settings: ExtensionSettings): Promise<void> {
  await chrome.storage.local.set({ [SETTINGS_KEY]: settings });
}

export async function getNotes(): Promise<Record<string, ProblemNotes>> {
  const result = await chrome.storage.local.get(NOTES_KEY);
  return result[NOTES_KEY] ?? {};
}

export async function saveNotes(notes: ProblemNotes): Promise<void> {
  const all = await getNotes();
  all[notes.titleSlug] = notes;
  await chrome.storage.local.set({ [NOTES_KEY]: all });
}

export async function getSyncHistory(): Promise<SyncRecord[]> {
  const result = await chrome.storage.local.get(HISTORY_KEY);
  return (result[HISTORY_KEY] ?? []) as SyncRecord[];
}

export async function upsertSyncRecord(record: SyncRecord): Promise<void> {
  const history = await getSyncHistory();
  const next = [record, ...history.filter(x => x.submissionId !== record.submissionId)].slice(0, 100);
  await chrome.storage.local.set({ [HISTORY_KEY]: next });
}

export async function getSyncRecord(submissionId: string): Promise<SyncRecord | undefined> {
  return (await getSyncHistory()).find(x => x.submissionId === submissionId);
}
