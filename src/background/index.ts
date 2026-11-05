import { handleMessage } from "./message-handler";

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  handleMessage(message)
    .then(result => sendResponse({ ok: true, result }))
    .catch(error => sendResponse({
      ok: false,
      error: error instanceof Error ? error.message : "Unexpected error"
    }));
  return true;
});

chrome.runtime.onInstalled.addListener(() => {
  console.info("LeetCode Sync installed.");
});
