import type { Submission } from "../types";
import type { ExtensionSettings } from "../types";
import { getFileSha, putFile } from "../github/github-client";
import { solutionPath } from "./file-generator";

const START = "<!-- LEETCODE-SYNC:START -->";
const END = "<!-- LEETCODE-SYNC:END -->";

function escapeMarkdown(value: string): string {
  return value.replace(/\|/g, "\\|");
}

function generatedSection(submissions: Submission[]): string {
  const unique = new Map<string, Submission>();
  for (const submission of submissions) unique.set(submission.titleSlug, submission);
  const items = [...unique.values()].sort((a, b) => a.title.localeCompare(b.title));
  const counts = {
    Easy: items.filter(x => x.difficulty === "Easy").length,
    Medium: items.filter(x => x.difficulty === "Medium").length,
    Hard: items.filter(x => x.difficulty === "Hard").length
  };

  const lines = [
    "## Statistics",
    "",
    `- **Total problems:** ${items.length}`,
    `- **Easy:** ${counts.Easy} · **Medium:** ${counts.Medium} · **Hard:** ${counts.Hard}`,
    "",
    "## Solved Problems",
    "",
    "| Problem | Difficulty | Language | Topic | Solution |",
    "|---|---|---|---|---|"
  ];

  for (const item of items) {
    const path = solutionPath(item);
    const topic = item.topics[0] ?? "Uncategorized";
    lines.push(`| ${escapeMarkdown(item.title)} | ${item.difficulty} | ${item.language} | ${escapeMarkdown(topic)} | [View](./${path}) |`);
  }
  return lines.join("\n");
}

export async function updateReadme(
  settings: ExtensionSettings,
  submissions: Submission[]
): Promise<void> {
  const path = "README.md";
  const url = `https://api.github.com/repos/${encodeURIComponent(settings.owner)}/${encodeURIComponent(settings.repository)}/contents/README.md?ref=${encodeURIComponent(settings.branch)}`;
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${settings.githubToken}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28"
    }
  });

  let existing = "# LeetCode Solutions\n\nMy accepted LeetCode solutions, automatically synced from the browser.\n";
  let sha: string | undefined;
  if (response.ok) {
    const data = await response.json() as { content?: string; encoding?: string; sha?: string };
    sha = data.sha;
    if (data.content && data.encoding === "base64") {
      const binary = atob(data.content.replace(/\n/g, ""));
      const bytes = Uint8Array.from(binary, c => c.charCodeAt(0));
      existing = new TextDecoder().decode(bytes);
    }
  } else if (response.status !== 404) {
    throw new Error(`Unable to read README.md: ${response.status}`);
  }

  const startIndex = existing.indexOf(START);
  const endIndex = existing.indexOf(END);
  const section = `${START}\n${generatedSection(submissions)}\n${END}`;
  let updated: string;

  if (startIndex >= 0 && endIndex > startIndex) {
    updated = existing.slice(0, startIndex) + section + existing.slice(endIndex + END.length);
  } else {
    updated = `${existing.trimEnd()}\n\n${section}\n`;
  }

  const content = btoa(String.fromCharCode(...new TextEncoder().encode(updated)));
  await fetch(`https://api.github.com/repos/${encodeURIComponent(settings.owner)}/${encodeURIComponent(settings.repository)}/contents/${path}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${settings.githubToken}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      message: "Update LeetCode solutions README",
      content,
      branch: settings.branch,
      ...(sha ? { sha } : {})
    })
  }).then(async r => {
    if (!r.ok) throw new Error(`README update failed (${r.status}): ${(await r.text()).slice(0, 300)}`);
  });
}
