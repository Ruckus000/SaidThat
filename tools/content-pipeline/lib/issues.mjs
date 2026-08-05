/**
 * Shared result contract for every gate in the pipeline.
 *
 * Every gate returns `{ ok, issues }` where each issue carries a stable `code`
 * and a `path` into the record, so `bin/report.mjs` can group by card and by
 * rule without the gates agreeing on anything else.
 *
 * `ok` reflects blocking issues only. Warnings are advisory: they belong in the
 * editor report but must never fail CI, or the warn level stops being usable
 * for the soft heuristics (image-dependence, punchline position) that are
 * genuinely judgement calls.
 */

export const BLOCK = "block";
export const WARN = "warn";

export function issue(level, code, path, message, extra = {}) {
  return { level, code, path, message, ...extra };
}

export function block(code, path, message, extra) {
  return issue(BLOCK, code, path, message, extra);
}

export function warn(code, path, message, extra) {
  return issue(WARN, code, path, message, extra);
}

export function result(issues) {
  const list = issues.filter(Boolean);
  return { ok: list.every((entry) => entry.level !== BLOCK), issues: list };
}

export function mergeResults(...results) {
  return result(results.flatMap((entry) => entry?.issues ?? []));
}

export function blockingIssues(res) {
  return res.issues.filter((entry) => entry.level === BLOCK);
}
