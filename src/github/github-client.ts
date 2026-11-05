import type { ExtensionSettings } from "../types";

const API = "https://api.github.com";

function utf8ToBase64(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function headers(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "Content-Type": "application/json"
  };
}

async function githubRequest<T>(url: string, token: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, headers: { ...headers(token), ...(init?.headers ?? {}) } });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`GitHub API ${response.status}: ${body.slice(0, 500)}`);
  }
  return response.json() as Promise<T>;
}

export async function verifyGitHubConnection(settings: ExtensionSettings): Promise<string> {
  if (!settings.githubToken || !settings.owner || !settings.repository) {
    throw new Error("Add your GitHub token, owner and repository in Settings.");
  }
  const repo = await githubRequest<{ full_name: string; default_branch: string }>(
    `${API}/repos/${encodeURIComponent(settings.owner)}/${encodeURIComponent(settings.repository)}`,
    settings.githubToken
  );
  return `${repo.full_name} (${repo.default_branch})`;
}

export async function getFileSha(settings: ExtensionSettings, path: string): Promise<string | undefined> {
  const url = `${API}/repos/${encodeURIComponent(settings.owner)}/${encodeURIComponent(settings.repository)}/contents/${path.split("/").map(encodeURIComponent).join("/")}?ref=${encodeURIComponent(settings.branch)}`;
  const response = await fetch(url, { headers: headers(settings.githubToken) });
  if (response.status === 404) return undefined;
  if (!response.ok) throw new Error(`Unable to check ${path}: ${response.status}`);
  const data = await response.json() as { sha?: string };
  return data.sha;
}

export async function putFile(
  settings: ExtensionSettings,
  path: string,
  content: string,
  message: string,
  options: { preserveExisting?: boolean } = {}
): Promise<void> {
  const existingSha = await getFileSha(settings, path);
  if (existingSha && options.preserveExisting) {
    // Idempotent retry: leave the existing file untouched and continue the sync.
    return;
  }

  const url = `${API}/repos/${encodeURIComponent(settings.owner)}/${encodeURIComponent(settings.repository)}/contents/${path.split("/").map(encodeURIComponent).join("/")}`;
  await githubRequest(url, settings.githubToken, {
    method: "PUT",
    body: JSON.stringify({
      message,
      content: utf8ToBase64(content),
      branch: settings.branch,
      ...(existingSha ? { sha: existingSha } : {})
    })
  });
}
