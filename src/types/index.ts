export type Difficulty = "Easy" | "Medium" | "Hard" | "Unknown";

export interface Submission {
  submissionId: string;
  problemId?: number;
  title: string;
  titleSlug: string;
  difficulty: Difficulty;
  language: string;
  code: string;
  topics: string[];
  runtime?: string;
  memory?: string;
  submittedAt: number;
}

export interface ProblemNotes {
  submissionId: string;
  titleSlug: string;
  approach: string;
  timeComplexity: string;
  spaceComplexity: string;
  notes: string;
  updatedAt: number;
}

export interface ExtensionSettings {
  githubToken: string;
  owner: string;
  repository: string;
  branch: string;
  autoSync: boolean;
  includeNotes: boolean;
  generateAiExplanations: boolean;
  openAiApiKey: string;
  updateReadme: boolean;
  preserveExistingSolutions: boolean;
}

export type SyncStatus = "pending" | "synced" | "failed";

export interface SyncRecord {
  submissionId: string;
  title: string;
  titleSlug: string;
  status: SyncStatus;
  message: string;
  updatedAt: number;
  solutionPath?: string;
}

export interface AcceptedSubmissionMessage {
  type: "SUBMISSION_ACCEPTED";
  payload: Submission;
}
