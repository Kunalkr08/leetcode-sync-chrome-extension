import type { ProblemNotes, Submission } from "../types";
import { LANGUAGE_EXTENSIONS } from "../utils/constants";
import { safeFolderName } from "../utils/slugify";

export function solutionPath(submission: Submission): string {
  const topic = safeFolderName(submission.topics[0] ?? "Uncategorized");
  const problem = safeFolderName(submission.titleSlug || submission.title);
  const language = submission.language.toLowerCase();
  const extension = LANGUAGE_EXTENSIONS[language] ?? "txt";
  return `${topic}/${problem}/solution.${extension}`;
}

export function notesPath(submission: Submission): string {
  const topic = safeFolderName(submission.topics[0] ?? "Uncategorized");
  const problem = safeFolderName(submission.titleSlug || submission.title);
  return `${topic}/${problem}/notes.md`;
}

export function createNotesTemplate(submission: Submission): ProblemNotes {
  return {
    submissionId: submission.submissionId,
    titleSlug: submission.titleSlug,
    approach: "",
    timeComplexity: "",
    spaceComplexity: "",
    notes: "",
    updatedAt: Date.now()
  };
}

export function renderNotes(notes: ProblemNotes, submission: Submission): string {
  return `# ${submission.title}

- **Difficulty:** ${submission.difficulty}
- **Language:** ${submission.language}
- **LeetCode:** https://leetcode.com/problems/${submission.titleSlug}/

## Approach

${notes.approach || "Add your approach here."}

## Complexity

- **Time:** ${notes.timeComplexity || "Add time complexity"}
- **Space:** ${notes.spaceComplexity || "Add space complexity"}

## Personal Notes

${notes.notes || "Add edge cases, observations, and lessons learned here."}
`;
}
