import "./options.css";
import { getSettings, saveSettings } from "../storage/storage-service";
import { verifyGitHubConnection } from "../github/github-client";
import type { ExtensionSettings, ProblemNotes, Submission } from "../types";
import { getNotes, saveNotes as persistNotes } from "../storage/storage-service";
import { notesPath, renderNotes } from "../services/file-generator";
import { putFile } from "../github/github-client";

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const form = $("settingsForm") as HTMLFormElement;

let savedNotes: Record<string, ProblemNotes> = {};

async function loadNotes() {
  savedNotes = await getNotes();
  const select = $("notesProblem") as HTMLSelectElement;
  select.innerHTML = "";
  const entries = Object.entries(savedNotes);
  if (!entries.length) {
    select.add(new Option("No saved notes yet", ""));
    return;
  }
  for (const [slug, note] of entries) {
    select.add(new Option(slug, slug));
  }
  select.value = entries[0][0];
  showSelectedNotes();
}

function showSelectedNotes() {
  const slug = ($("notesProblem") as HTMLSelectElement).value;
  const note = savedNotes[slug];
  ($("approach") as HTMLTextAreaElement).value = note?.approach ?? "";
  ($("timeComplexity") as HTMLInputElement).value = note?.timeComplexity ?? "";
  ($("spaceComplexity") as HTMLInputElement).value = note?.spaceComplexity ?? "";
  ($("personalNotes") as HTMLTextAreaElement).value = note?.notes ?? "";
}

async function load() {
  const s = await getSettings();
  ($("githubToken") as HTMLInputElement).value = s.githubToken;
  ($("openAiApiKey") as HTMLInputElement).value = s.openAiApiKey;
  ($("owner") as HTMLInputElement).value = s.owner;
  ($("repository") as HTMLInputElement).value = s.repository;
  ($("branch") as HTMLInputElement).value = s.branch;
  ($("autoSync") as HTMLInputElement).checked = s.autoSync;
  ($("includeNotes") as HTMLInputElement).checked = s.includeNotes;
  ($("generateAiExplanations") as HTMLInputElement).checked = s.generateAiExplanations;
  ($("updateReadme") as HTMLInputElement).checked = s.updateReadme;
  ($("preserveExistingSolutions") as HTMLInputElement).checked = s.preserveExistingSolutions;
  await loadNotes();
}

function readForm(): ExtensionSettings {
  return {
    githubToken: ($("githubToken") as HTMLInputElement).value.trim(),
    openAiApiKey: ($("openAiApiKey") as HTMLInputElement).value.trim(),
    owner: ($("owner") as HTMLInputElement).value.trim(),
    repository: ($("repository") as HTMLInputElement).value.trim(),
    branch: ($("branch") as HTMLInputElement).value.trim() || "main",
    autoSync: ($("autoSync") as HTMLInputElement).checked,
    includeNotes: ($("includeNotes") as HTMLInputElement).checked,
    generateAiExplanations: ($("generateAiExplanations") as HTMLInputElement).checked,
    updateReadme: ($("updateReadme") as HTMLInputElement).checked,
    preserveExistingSolutions: ($("preserveExistingSolutions") as HTMLInputElement).checked
  };
}

form.addEventListener("submit", async event => {
  event.preventDefault();
  const result = $("saveResult");
  try {
    await saveSettings(readForm());
    result.textContent = "Settings saved.";
    result.className = "result success";
  } catch (error) {
    result.textContent = error instanceof Error ? error.message : "Unable to save settings.";
    result.className = "result failure";
  }
});

$("notesProblem").addEventListener("change", showSelectedNotes);

$("saveNotes").addEventListener("click", async () => {
  const result = $("notesResult");
  const slug = ($("notesProblem") as HTMLSelectElement).value;
  const note = savedNotes[slug];
  if (!note) {
    result.textContent = "No notes template exists yet. Submit an accepted solution first.";
    result.className = "result failure";
    return;
  }
  try {
    const updated: ProblemNotes = {
      ...note,
      approach: ($("approach") as HTMLTextAreaElement).value,
      timeComplexity: ($("timeComplexity") as HTMLInputElement).value,
      spaceComplexity: ($("spaceComplexity") as HTMLInputElement).value,
      notes: ($("personalNotes") as HTMLTextAreaElement).value,
      updatedAt: Date.now()
    };
    await persistNotes(updated);
    const data = await chrome.storage.local.get("submissionMetadata");
    const metadata = (data.submissionMetadata ?? {}) as Record<string, Submission>;
    const submission = Object.values(metadata).find(item => item.titleSlug === slug);
    if (!submission) throw new Error("Submission metadata not found locally. Re-sync this problem first.");
    const settings = await getSettings();
    await putFile(settings, notesPath(submission), renderNotes(updated, submission), `Update notes for ${submission.title}`);
    savedNotes[slug] = updated;
    result.textContent = "Notes saved to GitHub.";
    result.className = "result success";
  } catch (error) {
    result.textContent = error instanceof Error ? error.message : "Unable to save notes.";
    result.className = "result failure";
  }
});

$("testConnection").addEventListener("click", async () => {
  const result = $("connectionResult");
  result.textContent = "Testing…";
  try {
    const repo = await verifyGitHubConnection(readForm());
    result.textContent = `Connected to ${repo}`;
    result.className = "result success";
  } catch (error) {
    result.textContent = error instanceof Error ? error.message : "Connection failed.";
    result.className = "result failure";
  }
});

void load();
