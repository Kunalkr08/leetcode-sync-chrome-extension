/**
 * Runs in the page's MAIN world so it can observe same-page fetch/XHR traffic.
 * It does not access chrome.* APIs or read/store credentials.
 *
 * LeetCode's private API is undocumented and may change. This bridge looks for
 * submission IDs in GraphQL responses and polls the public-facing submission
 * check endpoint. The content script performs normalization and messaging.
 */
(() => {
  const EVENT_NAME = "__LEETCODE_SYNC_EVENT__";
  const seen = new Set<string>();
  const originalFetch = window.fetch.bind(window);

  function findSubmissionIds(value: unknown, output: string[] = []): string[] {
    if (!value || typeof value !== "object") return output;
    if (Array.isArray(value)) {
      for (const item of value) findSubmissionIds(item, output);
      return output;
    }
    const obj = value as Record<string, unknown>;
    for (const [key, child] of Object.entries(obj)) {
      if (/submission.?id/i.test(key) && (typeof child === "string" || typeof child === "number")) {
        output.push(String(child));
      } else if (child && typeof child === "object") {
        findSubmissionIds(child, output);
      }
    }
    return output;
  }

  function post(type: string, detail: unknown) {
    window.postMessage({ source: "leetcode-sync-page", type, detail }, location.origin);
  }

  async function inspectResponse(response: Response, requestUrl: string) {
    try {
      if (!requestUrl.includes("graphql") && !requestUrl.includes("/submissions/")) return;
      const clone = response.clone();
      const text = await clone.text();
      if (text.length > 2_000_000) return;
      let parsed: any;
      try { parsed = JSON.parse(text); } catch { return; }
      const ids = [...new Set(findSubmissionIds(parsed))];
      const operationName = /submit|submission/i.test(requestUrl + text.slice(0, 1000));
      if (!operationName) return;
      for (const id of ids) {
        if (!/^\d{4,}$/.test(id) || seen.has(id)) continue;
        seen.add(id);
        post("SUBMISSION_CANDIDATE", { submissionId: id });
      }
    } catch {
      // Do not interfere with the LeetCode page.
    }
  }

  window.fetch = async (...args: Parameters<typeof fetch>) => {
    const response = await originalFetch(...args);
    const input = args[0];
    const requestUrl = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    void inspectResponse(response, requestUrl);
    return response;
  };

  const XHR = XMLHttpRequest.prototype;
  const originalOpen = XHR.open;
  const originalSend = XHR.send;
  XHR.open = function(
    this: XMLHttpRequest,
    method: string,
    url: string | URL,
    ...rest: [async?: boolean, username?: string | null, password?: string | null]
  ) {
    (this as any).__leetcodeSyncUrl = String(url);
    return originalOpen.call(this, method, url, rest[0] ?? true, rest[1], rest[2]);
  } as typeof XHR.open;
  XHR.send = function(...args: any[]) {
    this.addEventListener("load", () => {
      const url = (this as any).__leetcodeSyncUrl ?? "";
      if (!url.includes("graphql") && !url.includes("/submissions/")) return;
      try {
        const parsed = JSON.parse(this.responseText);
        const ids = [...new Set(findSubmissionIds(parsed))];
        for (const id of ids) {
          if (!/^\d{4,}$/.test(id) || seen.has(id)) continue;
          seen.add(id);
          post("SUBMISSION_CANDIDATE", { submissionId: id });
        }
      } catch { /* Ignore non-JSON responses. */ }
    });
    return originalSend.apply(this, args as any);
  };

  // A simple health event helps confirm that the bridge loaded.
  post("BRIDGE_READY", { href: location.href });
})();
