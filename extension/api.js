// Shared API helper for the DataTrace extension.
// Talks to the same published analyzeTrace backend function the website uses.
// The Trace Runner workflow picks up the created record and runs the pipeline
// in the background; we just poll until it completes.

export const APP_ORIGIN = "https://festive-trace-truth-lab.base44.app";
const ENDPOINT = `${APP_ORIGIN}/functions/analyzeTrace`;

async function call(action, payload = {}) {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, ...payload }),
  });
  if (!res.ok) throw new Error(`DataTrace request failed (${res.status})`);
  return res.json();
}

export async function createTrace(claimText, { researchMode = "standard" } = {}) {
  const data = await call("create", { claim_text: claimText, research_mode: researchMode });
  if (!data || !data.id) throw new Error("No trace id returned.");
  return data; // { id, public_id, stage }
}

export async function getTrace(id) {
  const data = await call("get", { id });
  return data.analysis;
}

export async function pollTrace(id, { onUpdate, intervalMs = 2000, timeoutMs = 180000 } = {}) {
  const start = Date.now();
  let analysis;
  while (Date.now() - start < timeoutMs) {
    analysis = await getTrace(id);
    if (onUpdate) onUpdate(analysis);
    if (analysis.status === "complete" || analysis.status === "error") return analysis;
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  throw new Error("Timed out waiting for the trace to complete.");
}

export function traceUrl(publicId) {
  return `${APP_ORIGIN}/trace/${publicId}`;
}

export function stageLabel(s) {
  return ({
    reading: "Reading the claim",
    identifying: "Building the verification contract",
    searching: "Searching the evidence universe",
    screening: "Screening evidence",
    checking: "Warrant-checking evidence",
    auditing: "Searching for evidence against the result",
    comparing: "Resolving conflicts",
    calculating: "Calculating the TraceScore",
    writing: "Writing the coverage certificate",
    complete: "Complete",
    error: "Error",
  })[s] || s;
}