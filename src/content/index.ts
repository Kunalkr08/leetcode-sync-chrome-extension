import { getAcceptedSubmission } from "./leetcode-client";

const handled = new Set<string>();
let currentSlug = location.pathname.match(/\/problems\/([^/]+)/)?.[1] ?? "";

function notify(message: string) {
  window.postMessage({ source: "leetcode-sync-content", type: "SYNC_NOTICE", message }, location.origin);
}

window.addEventListener("message", async event => {
  if (event.source !== window || event.origin !== location.origin) return;
  const data = event.data;
  if (data?.source !== "leetcode-sync-page" || data?.type !== "SUBMISSION_CANDIDATE") return;

  const submissionId = String(data.detail?.submissionId ?? "");
  if (!/^\d{4,}$/.test(submissionId) || handled.has(submissionId)) return;
  handled.add(submissionId);

  try {
    notify(`Checking submission ${submissionId}…`);
    const submission = await getAcceptedSubmission(submissionId, currentSlug);
    const response = await chrome.runtime.sendMessage({
      type: "SUBMISSION_ACCEPTED",
      payload: submission
    });
    if (!response?.ok) throw new Error(response?.error || "Sync failed");
    notify(`Synced ${submission.title} to GitHub.`);
  } catch (error) {
    handled.delete(submissionId);
    const message = error instanceof Error ? error.message : "Unknown error";
    notify(`Could not sync submission: ${message}`);
    console.warn("[LeetCode Sync]", message);
  }
});

window.addEventListener("popstate", () => {
  currentSlug = location.pathname.match(/\/problems\/([^/]+)/)?.[1] ?? "";
});
