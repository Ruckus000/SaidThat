import path from "node:path";
import { fileURLToPath } from "node:url";
import { readFile } from "node:fs/promises";
import Ajv2020 from "ajv/dist/2020.js";
import { parseArgs, readJson, printReport, exitWith } from "./lib.mjs";

const args = parseArgs(process.argv.slice(2));
const pluginRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const schemaPath = path.join(pluginRoot, "schemas", "reddit-evidence.schema.json");
const inputPath = path.resolve(args.input || path.join(pluginRoot, "references/reddit-design-skill-evidence.json"));
const findings = [];
const expectedIds = Array.from({ length: 20 }, (_, index) => `R${String(index + 1).padStart(2, "0")}`);
const expectedUrls = new Set([
  "https://www.reddit.com/r/ClaudeAI/comments/1s96sae/i_cannot_figure_out_frontend_design_skill/",
  "https://www.reddit.com/r/ClaudeAI/comments/1ulgm5l/frontend_design_trying_to_move_away_from_the_ai/",
  "https://www.reddit.com/r/codex/comments/1upt5ha/how_do_you_handle_frontendui_work_with_codex/",
  "https://www.reddit.com/r/ClaudeAI/comments/1oxn1gj/frontenddesign_skill_is_so_amazing/",
  "https://www.reddit.com/r/ClaudeAI/comments/1u9sgj3/unslopui_a_claude_skill_that_flags_and_removes/",
  "https://www.reddit.com/r/ClaudeAI/comments/1rafmpg/im_rating_every_claude_code_skill_i_can_find/",
  "https://www.reddit.com/r/ClaudeAI/comments/1t3ht2g/claude_code_frontenddesign_skill_always_outputs/",
  "https://www.reddit.com/r/claudeskills/comments/1tqwn42/claude_with_a_frontend_design_skill_vs_without/",
  "https://www.reddit.com/r/ClaudeAI/comments/1p9srou/finally_figured_out_why_claudes_ui_generations/",
  "https://www.reddit.com/r/codex/comments/1t3iihr/can_codex_make_good_uis_with_the_proper_skills/",
  "https://www.reddit.com/r/codex/comments/1rrjzhv/what_codex_skills_are_actually_improving_your_workflow/",
  "https://www.reddit.com/r/codex/comments/1szupli/codex_uiux_design_and_skill/",
  "https://www.reddit.com/r/ClaudeAI/comments/1t24gan/few_months_of_frontenddesign_uiuxpromaxskill/",
  "https://www.reddit.com/r/claudeskills/comments/1tu4v6s/made_a_skill_to_stop_claude_code_from_building/",
  "https://www.reddit.com/r/codex/comments/1rx5wy7/has_anyone_learned_ways_to_make_codex_better_at/",
  "https://www.reddit.com/r/ClaudeAI/comments/1txvaef/if_you_used_claude_to_build_your_website_which/",
  "https://www.reddit.com/r/codex/comments/1swbf35/how_to_make_a_nice_uifrontend/",
  "https://www.reddit.com/r/vibecoding/comments/1t33i0h/best_current_frontend_design_tactic/",
  "https://www.reddit.com/r/ClaudeAI/comments/1rwu3q/how_can_i_get_claude_to_design_better_mobile_ui/",
  "https://www.reddit.com/r/codex/comments/1tbnfhn/whats_your_favorite_uiux_codex_skill_and_why/"
].map((url) => canonical(url)));

function add(id, message, evidence = "") {
  findings.push({ id, severity: "P0", message, ...(evidence ? { evidence } : {}) });
}

function canonical(url) {
  return String(url).replace(/\/$/, "").split("#")[0];
}

let payload;
try {
  payload = await readJson(inputPath);
} catch (errorValue) {
  add("input-unreadable", "Unable to read Reddit evidence input.", String(errorValue.message || errorValue));
}

if (payload) {
  try {
    const schema = JSON.parse(await readFile(schemaPath, "utf8"));
    const ajv = new Ajv2020({ allErrors: true, strict: false });
    const validate = ajv.compile(schema);
    if (!validate(payload)) {
      for (const [index, errorValue] of (validate.errors || []).entries()) add(`schema-${index}`, "Reddit evidence does not satisfy its schema.", `${errorValue.instancePath || "$"} ${errorValue.message}`);
    }
  } catch (errorValue) {
    add("schema-compile", "Reddit evidence schema could not be compiled.", String(errorValue.message || errorValue));
  }

  const sources = payload.sources || [];
  const proofReferences = payload.proofReferences || [];
  const proofIds = new Set(proofReferences.map((reference) => reference.id));
  const ids = sources.map((source) => source.id);
  const urls = sources.map((source) => canonical(source.url));
  if (sources.length !== 20) add("source-count", "Exactly 20 Reddit source records are required.", `count=${sources.length}`);
  if (new Set(ids).size !== ids.length) add("duplicate-id", "Reddit source IDs must be unique.", ids.join(", "));
  if (new Set(urls).size !== urls.length) add("duplicate-url", "Reddit source URLs must be unique.");
  if (ids.some((id) => !expectedIds.includes(id)) || expectedIds.some((id) => !ids.includes(id))) add("source-id-set", "The corpus must contain R01 through R20 exactly.", ids.join(", "));
  if (urls.some((url) => !expectedUrls.has(url)) || [...expectedUrls].some((url) => !urls.includes(url))) add("source-url-set", "The corpus URL set does not match the approved 20-post research corpus.");
  if (new Set(proofIds).size !== proofReferences.length) add("duplicate-proof-id", "Proof-reference IDs must be unique.");
  for (const reference of proofReferences) {
    if (!/^P[0-9]{2}$/.test(reference.id)) add(`proof-id-${reference.id || "missing"}`, "Proof-reference IDs must use the P## format.");
  }

  for (const source of sources) {
    for (const proofRef of [...(source.proofRefs || []), ...(source.authorClaim?.proofRefs || []), ...((source.commentThemes || []).flatMap((theme) => theme.proofRefs || []))]) {
      if (!proofIds.has(proofRef)) add(`missing-proof-${source.id}`, "A Reddit record references an undefined proof reference.", proofRef);
    }
    if (source.disposition === "implementable") {
      if (source.authorClaim?.evidenceStatus !== "independently-supported" || !(source.authorClaim?.proofRefs || []).length || !(source.proofRefs || []).length) {
        add(`reddit-only-${source.id}`, "Reddit commentary cannot directly authorize an implementable change.", "Implementable records require independent evidence and proof references.");
      }
    }
    if (source.disposition === "research-only" && source.implementationDecision?.toLowerCase().includes("implement")) {
      // A research-only record may discuss a future implementation, but must not claim it is approved.
      if (!/do not|must not|not implement|pending|research-only|before/i.test(source.implementationDecision)) add(`decision-ambiguous-${source.id}`, "Research-only decisions must explicitly withhold implementation approval.");
    }
  }
  for (const synthesis of payload.synthesis || []) {
    for (const proofRef of synthesis.independentEvidenceRefs || []) {
      if (/^P[0-9]{2}$/.test(proofRef) && !proofIds.has(proofRef)) add(`missing-synthesis-proof-${synthesis.id}`, "A synthesis references an undefined proof reference.", proofRef);
    }
    if (synthesis.decision === "implementable" && (synthesis.status !== "independently-supported" || !(synthesis.independentEvidenceRefs || []).length)) add(`synthesis-${synthesis.id}`, "A synthesis cannot be implementable without independent evidence references.");
  }
}

if (args["check-links"] && payload) {
  for (const source of payload.sources || []) {
    try {
      const response = await fetch(source.url, { headers: { "User-Agent": "LaunchPad-DesignOps-research-validator/0.2" }, signal: AbortSignal.timeout(15000) });
      if (!response.ok) add(`link-${source.id}`, "Reddit source URL was not reachable.", `${response.status} ${source.url}`);
    } catch (errorValue) {
      add(`link-${source.id}`, "Reddit source URL could not be checked.", `${source.url}: ${errorValue.message || errorValue}`);
    }
  }
}

printReport({ title: "Reddit evidence validation", findings, data: { input: inputPath, sourceCount: payload?.sources?.length || 0, linksChecked: Boolean(args["check-links"]) }, json: Boolean(args.json) });
exitWith(findings);
