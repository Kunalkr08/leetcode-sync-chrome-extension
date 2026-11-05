import type { ExtensionSettings } from "../types";

export const DEFAULT_SETTINGS: ExtensionSettings = {
  githubToken: "",
  owner: "",
  repository: "",
  branch: "main",
  autoSync: true,
  includeNotes: true,
  generateAiExplanations: false,
  openAiApiKey: "",
  updateReadme: true,
  preserveExistingSolutions: true
};

export const LANGUAGE_EXTENSIONS: Record<string, string> = {
  java: "java",
  cpp: "cpp",
  "c++": "cpp",
  c: "c",
  python3: "py",
  python: "py",
  javascript: "js",
  typescript: "ts",
  golang: "go",
  go: "go",
  rust: "rs",
  kotlin: "kt",
  swift: "swift",
  csharp: "cs",
  "c#": "cs",
  ruby: "rb",
  php: "php",
  scala: "scala",
  mysql: "sql",
  mssql: "sql",
  oracle: "sql"
};
