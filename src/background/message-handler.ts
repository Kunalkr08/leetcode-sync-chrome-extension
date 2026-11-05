import type { Submission } from "../types";
import { syncSubmission } from "../services/sync-service";
import { getSyncHistory } from "../storage/storage-service";

export async function handleMessage(message: any): Promise<unknown> {
  switch (message?.type) {
    case "SUBMISSION_ACCEPTED": {
      const submission = message.payload as Submission;
      if (!submission?.submissionId || !submission?.code || !submission?.titleSlug) {
        throw new Error("LeetCode submission data was incomplete.");
      }
      await syncSubmission(submission);
      return { ok: true };
    }
    case "GET_STATUS":
      return { history: await getSyncHistory() };
    case "PING":
      return { ok: true, version: chrome.runtime.getManifest().version };
    default:
      throw new Error(`Unknown message type: ${String(message?.type)}`);
  }
}
