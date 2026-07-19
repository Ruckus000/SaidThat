const COLLECTION_PREFIXES = Object.freeze({
  sources: "source",
  users: "user",
  tasks: "task",
  claims: "claim",
  assumptions: "assumption",
  unknowns: "unknown",
  deliverables: "deliverable",
  directionCriteria: "criterion"
});

export const CORE_DECISIONS = Object.freeze(new Set(["primary-task", "safety", "trust", "content-structure", "interaction-model"]));

export function evidenceRef(prefix, id) { return `${prefix}:${id}`; }

export function buildEvidenceIndex(requirements) {
  const index = new Map();
  for (const [collection, prefix] of Object.entries(COLLECTION_PREFIXES)) {
    for (const record of requirements?.[collection] || []) index.set(evidenceRef(prefix, record.id), { collection, record });
  }
  return index;
}

export function resolveEvidenceRef(requirements, ref) {
  return buildEvidenceIndex(requirements).get(String(ref || "")) || null;
}

export function requiresDirectionValidation(requirements) {
  return (requirements?.assumptions || []).some((assumption) =>
    ["high", "critical"].includes(assumption.risk)
    && assumption.validation?.requiredAt === "direction"
    && (assumption.affectedDecisions || []).some((decision) => CORE_DECISIONS.has(decision))
  );
}

export function directionValidationAssumptions(requirements) {
  return (requirements?.assumptions || []).filter((assumption) =>
    ["high", "critical"].includes(assumption.risk)
    && assumption.validation?.requiredAt === "direction"
    && (assumption.affectedDecisions || []).some((decision) => CORE_DECISIONS.has(decision))
  );
}
