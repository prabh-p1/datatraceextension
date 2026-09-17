# DataTrace Browser Extension

A lightweight Chrome/Edge extension (Manifest V3) that traces any claim to its
primary sources without leaving the page. It reuses the same `analyzeTrace`
backend function and Trace Runner workflow as the website — no separate backend.

## What it does

- **Select-to-trace**: highlight any text on any page, right-click, and choose
  "Trace this claim with DataTrace". The side panel opens and runs the trace.
- **Toolbar entry**: click the DataTrace icon to open the side panel, paste or
  type a claim, and run it.
- **Compact result**: TraceScore, verdict, stability, top findings, and a link
  to the full report on the website for the deep-dive (proof graph, coverage
  certificate, evidence lab).

## Architecture

```
extension/
├── manifest.json     # MV3 manifest — permissions, side panel, context menu
├── background.js      # service worker — context menu, opens side panel
├── api.js             # calls the published analyzeTrace endpoint + polling
├── sidepanel.html     # the single result surface
├── sidepanel.js       # runs a trace, polls, renders the compact result
└── sidepanel.css      # dark "forensic terminal" styling matching the site
```

The extension is a second front door to the same engine:

1. It POSTs `{ action: "create", claim_text }` to the published
   `analyzeTrace` function.
2. The **Trace Runner** workflow (already in the app) picks up the new record
   and runs the full evidence pipeline in the background.
3. The extension polls `{ action: "get", id }` until `status === "complete"`.
4. It renders the compact result and links to
   `https://festive-trace-truth-lab.base44.app/trace/<public_id>` for the
   full report.

Guest access works out of the box — `create` and `get` do not require auth.
Logged-in users see their extension traces in Workspace on the website because
both surfaces write to the same `TraceAnalysis` entity.

## Load it locally (Chrome / Edge)

1. Open `chrome://extensions`.
2. Enable **Developer mode** (top-right).
3. Click **Load unpacked** and select this `extension/` folder.
4. Pin the DataTrace icon if you want it visible.
5. Highlight any claim on any page, right-click → "Trace this claim with
   DataTrace". Or click the icon and paste a claim.

## Notes

- The host permission is scoped to the published app origin only.
- No content script is injected; the context-menu selection API reads the
  highlighted text directly, so the extension never sees page content beyond
  what the user explicitly selects.
- A future "auto-detect claims on this page" mode would add a content script
  with an explicit per-site opt-in — not enabled in this MVP.