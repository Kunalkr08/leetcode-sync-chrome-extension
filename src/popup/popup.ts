import "./popup.css";
import { getSettings, getSyncHistory } from "../storage/storage-service";
import { verifyGitHubConnection } from "../github/github-client";

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

async function render() {
  const settings = await getSettings();
  const history = await getSyncHistory();
  const synced = history.filter(x => x.status === "synced").length;
  const failed = history.filter(x => x.status === "failed").length;
  $("syncedCount").textContent = String(synced);
  $("failedCount").textContent = String(failed);

  try {
    const repo = await verifyGitHubConnection(settings);
    $("connectionText").textContent = `Connected · ${repo}`;
    $("connectionDot").className = "dot online";
  } catch {
    $("connectionText").textContent = "GitHub not configured";
    $("connectionDot").className = "dot offline";
  }

  const container = $("history");
  container.innerHTML = "";
  if (!history.length) {
    container.innerHTML = '<p class="muted">No submissions synced yet. Solve a problem on LeetCode to get started.</p>';
    return;
  }
  for (const item of history.slice(0, 8)) {
    const row = document.createElement("div");
    row.className = "history-row";
    const left = document.createElement("div");
    const title = document.createElement("strong");
    title.textContent = item.title;
    const detail = document.createElement("small");
    detail.textContent = item.message;
    left.append(title, detail);
    const status = document.createElement("span");
    status.className = `status ${item.status}`;
    status.textContent = item.status;
    row.append(left, status);
    container.append(row);
  }
}

$("settings").addEventListener("click", () => chrome.runtime.openOptionsPage());
$("refresh").addEventListener("click", () => void render());
void render();
