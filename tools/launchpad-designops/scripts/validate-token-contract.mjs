import path from "node:path";
import { parseArgs, readJson, printReport, exitWith } from "./lib.mjs";
import { validateWithSchema, formatSchemaErrors } from "./schema-utils.mjs";

const args = parseArgs(process.argv.slice(2));
const input = path.resolve(args.tokens || ".designops/08-design-system/tokens.json");
const findings = [];
const requiredGroups = ["color", "typography", "spacing", "radius", "motion"];
const tokens = new Map();
let payload;

const aliasPattern = /^\{([A-Za-z0-9_.-]+)\}$/;
const validColor = (value) => (typeof value === "string" && (/^#[0-9a-f]{3,8}$/i.test(value) || /^(rgb|hsl|oklch|lab|color)\(/i.test(value))) || (value && typeof value === "object" && ["srgb", "srgb-linear", "display-p3", "a98-rgb", "prophoto-rgb", "rec2020", "xyz-d50", "xyz-d65", "lab", "lch", "oklab", "oklch"].includes(value.colorSpace) && Array.isArray(value.components) && value.components.length === 3 && value.components.every((item) => item === null || Number.isFinite(item)) && (value.alpha === undefined || Number.isFinite(value.alpha)));
const dimension = (value) => typeof value === "object" && value !== null && typeof value.value === "number" && ["px", "rem", "em", "%", "vw", "vh"].includes(value.unit);
const duration = (value) => typeof value === "object" && value !== null && typeof value.value === "number" && ["ms", "s"].includes(value.unit);
const valueMatches = (type, value) => {
  if (typeof value === "string" && aliasPattern.test(value)) return true;
  if (type === "color") return validColor(value);
  if (type === "dimension") return dimension(value);
  if (type === "duration") return duration(value);
  if (["number", "fontWeight"].includes(type)) return Number.isFinite(value);
  if (["fontFamily", "string"].includes(type)) return typeof value === "string" || (type === "fontFamily" && Array.isArray(value) && value.every((item) => typeof item === "string"));
  return true;
};

try {
  payload = await readJson(input);
  const result = await validateWithSchema(payload, "tokens.schema.json");
  if (!result.valid) findings.push({ id: "token-schema", severity: "P0", message: "Token file does not satisfy its bounded DTCG schema.", evidence: formatSchemaErrors(result.errors) });
} catch (errorValue) {
  findings.push({ id: "tokens-unreadable", severity: "P0", message: "Unable to read the token file.", evidence: String(errorValue.message || errorValue) });
}

function collect(node, tokenPath = [], inheritedType = null) {
  if (!node || typeof node !== "object" || Array.isArray(node)) return;
  const type = node.$type || inheritedType;
  if (Object.hasOwn(node, "$value")) {
    const name = tokenPath.join(".");
    tokens.set(name, { value: node.$value, type });
    if (!type) findings.push({ id: `token-type-${name}`, severity: "P0", message: `Token '${name}' has no explicit or inherited $type.` });
    else if (!valueMatches(type, node.$value)) findings.push({ id: `token-value-${name}`, severity: "P0", message: `Token '${name}' value does not match type '${type}'.`, evidence: JSON.stringify(node.$value) });
    return;
  }
  for (const [key, child] of Object.entries(node)) {
    if (key === "$root") collect(child, tokenPath, type);
    else if (!key.startsWith("$")) collect(child, [...tokenPath, key], type);
  }
}

if (payload) {
  for (const group of requiredGroups) if (!payload[group]) findings.push({ id: `token-group-${group}`, severity: "P1", message: `Token group '${group}' is missing.`, recommendation: "Add it or retain an explicit Design DNA exception." });
  collect(payload);
  const edges = new Map();
  for (const [name, token] of tokens) {
    const match = typeof token.value === "string" ? token.value.match(aliasPattern) : null;
    if (!match) continue;
    const target = tokens.get(match[1]);
    edges.set(name, match[1]);
    if (!target) findings.push({ id: `token-alias-target-${name}`, severity: "P0", message: `Token '${name}' aliases a missing token.`, evidence: match[1] });
    else if (token.type && target.type && token.type !== target.type) findings.push({ id: `token-alias-type-${name}`, severity: "P0", message: `Token '${name}' aliases an incompatible type.`, evidence: `${token.type} -> ${target.type}` });
  }
  for (const start of edges.keys()) {
    const seen = new Set();
    let current = start;
    while (edges.has(current)) {
      if (seen.has(current)) { findings.push({ id: `token-alias-cycle-${start}`, severity: "P0", message: `Token alias cycle detected from '${start}'.`, evidence: [...seen, current].join(" -> ") }); break; }
      seen.add(current);
      current = edges.get(current);
    }
  }
  if (!tokens.size) findings.push({ id: "tokens-empty", severity: "P0", message: "Token contract contains no tokens." });
}

printReport({ title: "Design token contract", findings, data: { input, tokenCount: tokens.size }, json: Boolean(args.json) });
exitWith(findings.filter((finding) => finding.severity === "P0"));
