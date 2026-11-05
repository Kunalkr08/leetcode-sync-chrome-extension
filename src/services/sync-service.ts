import type { Submission } from "../types";
import { getSettings, getNotes, saveNotes, upsertSyncRecord, getSyncHistory } from "../storage/storage-service";
import { putFile } from "../github/github-client";
import { createNotesTemplate, notesPath, renderNotes, solutionPath } from "./file-generator";
import { fillMissingExplanation, generateExplanation } from "./openai-service";
import { updateReadme } from "./readme-service";

export async function syncSubmission(submission: Submission): Promise<void> {
  const settings = await getSettings();
  if (!settings.autoSync) return;
  if (!settings.githubToken || !settings.owner || !settings.repository) {
    throw new Error("GitHub is not configured. Open extension Settings.");
  }

  const previous = (await getSyncHistory()).find(x => x.submissionId === submission.submissionId);
  if (previous?.status === "synced") return;

  const targetPath = solutionPath(submission);
  await upsertSyncRecord({
    submissionId: submission.submissionId,
    title: submission.title,
    titleSlug: submission.titleSlug,
    status: "pending",
    message: "Uploading solution…",
    updatedAt: Date.now(),
    solutionPath: targetPath
  });

  try {
    let syncMessage = "Uploaded successfully";
    await putFile(
      settings,
      targetPath,
      submission.code,
      `Add ${submission.title} solution (${submission.language})`,
      { preserveExisting: settings.preserveExistingSolutions }
    );

    if (settings.includeNotes) {
      let notes = (await getNotes())[submission.titleSlug];
      if (!notes) {
        notes = createNotesTemplate(submission);
      }

      if (settings.generateAiExplanations) {
        try {
          const explanation = await generateExplanation(submission, settings.openAiApiKey);
          notes = fillMissingExplanation(notes, explanation);
        } catch (error) {
          const reason = error instanceof Error ? error.message : "Unknown OpenAI error";
          syncMessage += ` AI explanation unavailable: ${reason}`;
        }
      }

      await saveNotes(notes);
      await putFile(
        settings,
        notesPath(submission),
        renderNotes(notes, submission),
        `Add notes template for ${submission.title}`,
        { preserveExisting: true }
      ).catch(error => {
        // An existing notes file is expected on a retry; don't overwrite personal notes.
        if (!(error instanceof Error) || !error.message.includes("File already exists")) throw error;
      });
    }

    if (settings.updateReadme) {
      const history = await getSyncHistory();
      const submissions = history
        .filter(x => x.status === "synced" || x.submissionId === submission.submissionId)
        .map(x => x.submissionId === submission.submissionId ? submission : undefined)
        .filter((x): x is Submission => Boolean(x));

      // Include the current submission. A full history index is maintained separately in storage
      // as submission metadata by the background worker.
      const all = await chrome.storage.local.get("submissionMetadata");
      const metadata = (all.submissionMetadata ?? {}) as Record<string, Submission>;
      metadata[submission.submissionId] = submission;
      await chrome.storage.local.set({ submissionMetadata: metadata });
      await updateReadme(settings, Object.values(metadata));
    }

    await upsertSyncRecord({
      submissionId: submission.submissionId,
      title: submission.title,
      titleSlug: submission.titleSlug,
      status: "synced",
      message: syncMessage,
      updatedAt: Date.now(),
      solutionPath: targetPath
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown sync error";
    await upsertSyncRecord({
      submissionId: submission.submissionId,
      title: submission.title,
      titleSlug: submission.titleSlug,
      status: "failed",
      message,
      updatedAt: Date.now(),
      solutionPath: targetPath
    });
    throw error;
  }
}
