import { createTrace, pollTrace, traceUrl, stageLabel } from "./api.js";

const $ = (id) => document.getElementById(id);
const claimInput = $("claim-input");
const traceBtn = $("trace-btn");
const statusBox = $("status");
const resultBox = $("result");

function setStatus(text, sub) {
  $("status-text").textContent = text || "";
  $("status-sub").textContent = sub || "";
  statusBox.hidden = false;
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .split('"')
    .join("&quot;");
}

function stabilityTone(stab) {
  if (!stab) return { tone: "low", text: "LOW" };
  if (stab.stable && stab.verdictAgreementRate >= 0.9) return { tone: "high", text: "HIGH" };
  if (stab.verdictAgreementRate >= 0.6) return { tone: "moderate", text: "MODERATE" };
  return { tone: "low", text: "LOW" };
}

function render(analysis) {
  const r = analysis.result;
  if (!r) return;
  resultBox.hidden = false;
  $("score").textContent = r.score ?? "—";
  $("verdict").textContent = r.label || r.disposition || "";
  const stab = stabilityTone(analysis.stability);
  const stabEl = $("stability");
  stabEl.textContent = stab.text;
  stabEl.dataset.tone = stab.tone;
  const findings = Array.isArray(r.findings) ? r.findings.slice(0, 3) : [];
  $("findings").innerHTML = findings.map((f) => `<li>${escapeHtml(f)}</li>`).join("");
  $("summary").textContent = r.summary || "";
  $("sources").textContent = `${analysis.source_count ?? 0} sources · ${analysis.independent_groups ?? 0} independent`;
  $("open-full").href = traceUrl(analysis.public_id);
}

async function runTrace(claimText) {
  const claim = (claimText || "").trim();
  if (!claim) return;
  claimInput.value = claim;
  traceBtn.disabled = true;
  resultBox.hidden = true;
  setStatus("Submitting claim…", "");
  try {
    const { id } = await createTrace(claim);
    setStatus("Tracing evidence…", "Runs on DataTrace's server — usually 20–60 seconds. Keep browsing.");
    const analysis = await pollTrace(id, {
      onUpdate: (a) => {
        setStatus(stageLabel(a.status), a.stage || "");
        if (a.result) render(a);
      },
    });
    if (analysis.status === "error") {
      setStatus("Could not complete this trace", analysis.error || "");
    } else {
      render(analysis);
      statusBox.hidden = true;
    }
  } catch (e) {
    setStatus("Error", e.message || "Something went wrong.");
  } finally {
    traceBtn.disabled = false;
  }
}

traceBtn.addEventListener("click", () => runTrace(claimInput.value));
claimInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
    e.preventDefault();
    runTrace(claimInput.value);
  }
});

// If the context menu staged a claim, auto-run it.
chrome.storage.session.get("pendingClaim", (data) => {
  if (data && data.pendingClaim) {
    chrome.storage.session.remove("pendingClaim");
    runTrace(data.pendingClaim);
  }
});