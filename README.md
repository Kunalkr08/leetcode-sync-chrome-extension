# LeetCode Sync

A personal Chrome Manifest V3 extension that detects accepted LeetCode submissions and backs them up to a GitHub repository.

## Features

- Watches LeetCode page network traffic for submission IDs.
- Checks whether a submission was Accepted.
- Fetches the submitted source code and problem metadata.
- Uploads source files to GitHub.
- Creates a `notes.md` template.
- Optionally generates an approach and time/space complexity explanation with OpenAI.
- Maintains a generated section in your GitHub README.
- Stores settings and sync history in `chrome.storage.local`.
- Includes a popup and settings page.

## Requirements

- Node.js 20+
- Google Chrome
- A GitHub repository
- A fine-grained GitHub personal access token scoped to that repository, with **Contents: Read and write** and Metadata read access.

## Install and build

```bash
npm install
npm run build
```

Then:

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Click **Load unpacked**.
4. Select this project's `dist` directory.
5. Open the extension's **Details → Extension options**.
6. Enter your GitHub token, owner, repository and branch.
7. Click **Test GitHub connection**, then **Save settings**.
8. Open a LeetCode problem, submit a solution, and wait for Accepted.

To enable AI explanations, enter an OpenAI API key in Settings and enable **Generate approach and complexity with OpenAI**. When enabled alongside notes, the extension sends the submitted source code and problem details to OpenAI using the `gpt-4o-mini` model. API usage may incur charges. The key is stored in Chrome local storage, which is not an encrypted secret vault. AI errors are recorded in sync history and do not prevent solution uploads.

After changing source code, run `npm run build` again and click Reload on the extension card.

## GitHub token safety

The token is stored in `chrome.storage.local` in your browser profile. This is suitable for a personal local extension, but it is not a secure secret vault. Do not publish the token, commit it, or share your Chrome profile data. Use a fine-grained token with access to only the target repository.

## Important LeetCode integration caveat

LeetCode's internal submission endpoints and GraphQL schema are undocumented and can change. This extension uses a page-world network observer to discover submission IDs, the submission check endpoint to confirm Accepted, and a GraphQL `submissionDetails` query to retrieve submitted code. These endpoints and response shapes are best-effort integrations, not a stable public API.

If LeetCode changes its API, inspect Network requests in Chrome DevTools and update:

- `src/content/page-bridge.ts`
- `src/content/leetcode-client.ts`

The extension intentionally does not upload merely because the word "Accepted" appears in the page DOM. It requires a submission ID, an Accepted status, and retrieved submitted source code.

## Notes and README behavior

- A notes template is created for a new problem.
- Existing notes are preserved and are not overwritten.
- By default, existing solution files are also preserved. Turn off **Preserve existing solution files** only if you explicitly want the extension to replace an existing file.
- The generated README section is bounded by `<!-- LEETCODE-SYNC:START -->` and `<!-- LEETCODE-SYNC:END -->`. Text outside those markers is preserved.
- README statistics are based on submission metadata stored locally by this extension. If you switch browser profiles or clear extension storage, the local index will need to be rebuilt.

## Current limitations

- This is a personal MVP, not a polished public Chrome Web Store release.
- Topic metadata depends on LeetCode returning topic tags in its submission details response.
- Multiple accepted submissions for the same problem can map to the same solution path. Keep preserve-existing enabled to avoid accidental overwrites.
- There is no automatic notes editor in the popup yet; edit `notes.md` in GitHub or use a future notes UI.
- A failed sync can be retried by resubmitting the problem after fixing the underlying issue. A dedicated retry queue is a planned enhancement.

## Development

```bash
npm run typecheck
npm run build
```

## License

Personal use. Add a license before redistributing.
