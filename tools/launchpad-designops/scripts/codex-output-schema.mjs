import { readFile } from "node:fs/promises";
import path from "node:path";

export const BENCHMARK_OUTPUT_SCHEMAS = [
  "benchmark-result.schema.json",
  "benchmark-evaluation.schema.json",
  "pressure-result.schema.json"
];

const unsupportedKeywords = new Set(["allOf", "not", "dependentRequired", "dependentSchemas", "if", "then", "else", "uniqueItems"]);

export function validateCodexOutputSchema(schema) {
  const findings = [];
  if (schema?.type !== "object" || schema.anyOf) findings.push("$: root must be an object and cannot use anyOf.");
  visit(schema, "$", findings, new Set());
  return findings;
}

export async function validateBenchmarkOutputSchemas(pluginRoot) {
  const findings = [];
  for (const name of BENCHMARK_OUTPUT_SCHEMAS) {
    const schema = JSON.parse(await readFile(path.join(pluginRoot, "schemas", name), "utf8"));
    findings.push(...validateCodexOutputSchema(schema).map((finding) => `${name}: ${finding}`));
  }
  return findings;
}

function visit(node, location, findings, seen) {
  if (!node || typeof node !== "object" || seen.has(node)) return;
  seen.add(node);
  for (const keyword of unsupportedKeywords) if (Object.hasOwn(node, keyword)) findings.push(`${location}: '${keyword}' is not supported by Codex structured output.`);
  if ((Object.hasOwn(node, "enum") || Object.hasOwn(node, "const")) && !Object.hasOwn(node, "type")) findings.push(`${location}: enum and const schemas require an explicit type.`);
  const types = Array.isArray(node.type) ? node.type : [node.type];
  if (types.includes("object")) {
    const properties = node.properties && typeof node.properties === "object" ? node.properties : {};
    const propertyNames = Object.keys(properties);
    const required = Array.isArray(node.required) ? node.required : [];
    const missing = propertyNames.filter((name) => !required.includes(name));
    if (missing.length) findings.push(`${location}: all properties must be required; missing ${missing.join(", ")}.`);
    if (node.additionalProperties !== false) findings.push(`${location}: object schemas must set additionalProperties to false.`);
  }
  for (const [key, value] of Object.entries(node)) {
    if (["enum", "const", "required", "examples", "default"].includes(key)) continue;
    if (Array.isArray(value)) value.forEach((entry, index) => visit(entry, `${location}.${key}[${index}]`, findings, seen));
    else visit(value, `${location}.${key}`, findings, seen);
  }
}
