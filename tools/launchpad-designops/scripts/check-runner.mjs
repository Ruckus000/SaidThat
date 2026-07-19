import path from "node:path";
import { spawnSync } from "node:child_process";

function parseOutput(stdout) {
  try {
    return JSON.parse(stdout || "{}");
  } catch {
    return null;
  }
}

export function runNodeCheck({ id, scriptRoot, script, args = [], cwd, required = true }) {
  const result = spawnSync(process.execPath, [path.join(scriptRoot, script), ...args, "--json"], {
    cwd,
    encoding: "utf8",
    maxBuffer: 20 * 1024 * 1024,
    timeout: 120_000
  });
  const report = parseOutput(result.stdout);
  if (!report) {
    return {
      check: { id, status: "fail", required, evidence: ["Checker did not produce JSON."] },
      findings: [{ id: `${id}-invalid-output`, severity: "P0", category: id, message: `Check '${id}' did not produce valid JSON.`, evidence: (result.stdout || result.stderr || "empty output").slice(-2000), recommendation: "Repair the checker before continuing." }],
      internal: true
    };
  }
  const findings = Array.isArray(report.findings) ? report.findings.map((finding) => ({
    id: `${id}-${finding.id || "finding"}`,
    severity: finding.severity || "P1",
    category: id,
    message: finding.message || `Check '${id}' reported a finding.`,
    evidence: finding.evidence || "No evidence supplied.",
    recommendation: finding.recommendation || "Repair the reported condition and rerun the gate.",
    ...(finding.exception ? { exception: finding.exception } : {})
  })) : [];
  const hardFailure = findings.some((finding) => finding.severity === "P0");
  const internal = result.error || (result.status !== 0 && !hardFailure);
  if (internal) {
    findings.push({ id: `${id}-runner`, severity: "P0", category: id, message: `Check '${id}' failed internally.`, evidence: String(result.error?.message || result.stderr || `exit ${result.status}`), recommendation: "Repair the checker or its configuration before continuing." });
  }
  return {
    check: { id, status: hardFailure || internal ? "fail" : "pass", required, evidence: findings.map((finding) => `${finding.id}: ${finding.message}`) },
    findings,
    internal: Boolean(internal)
  };
}
