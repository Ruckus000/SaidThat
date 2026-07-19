export const GATE_VERSION = "0.2.0";
export const PHASES = Object.freeze(["strategy", "direction", "handoff", "release"]);
export const QUALIFIED_BROWSER_LANES = Object.freeze(["nextjs", "vite", "wordpress", "laravel"]);

const STRATEGY = ["project", "evidenceBrief", "experienceStrategy", "requirementsMap"];
const DIRECTION = [...STRATEGY, "territories", "selectedDirection"];
const HANDOFF = [...DIRECTION, "contentStateMap", "designDNA", "tokens"];

const REVIEW_DIMENSIONS = Object.freeze({
  strategy: ["problemFraming", "evidenceQuality", "assumptionRisk"],
  direction: ["taskFit", "subjectSpecificity", "distinctiveness"],
  handoff: ["informationHierarchy", "systemConsistency", "implementationFeasibility"],
  release: {
    proposal: ["contentQuality", "visualCraft", "evaluatorComprehension", "traceability"],
    demo: ["contentQuality", "visualCraft", "responsiveBehavior", "taskFit"],
    "proposal-demo": ["contentQuality", "visualCraft", "responsiveBehavior", "taskFit", "evaluatorComprehension", "traceability"]
  }
});

function modeArtifacts(mode) {
  if (mode === "proposal") return ["proposalSpec"];
  if (mode === "demo") return ["demoSpec"];
  if (mode === "proposal-demo") return ["proposalSpec", "demoSpec"];
  return [];
}

function reviewPathFor(phase) {
  return `${phase}Review`;
}

export function getGateProfile({ mode, phase, verificationMode, strategyReviewRequired = false, directionValidationRequired = false }) {
  if (!PHASES.includes(phase)) throw new Error(`Unknown gate phase '${phase}'.`);
  if (!['audit', 'proposal', 'demo', 'proposal-demo'].includes(mode)) throw new Error(`Unknown project mode '${mode}'.`);
  if (mode === "audit" && !["strategy", "release"].includes(phase)) throw new Error(`Audit mode does not use the '${phase}' gate.`);

  let artifactKeys;
  let checks;
  if (phase === "strategy") {
    artifactKeys = STRATEGY;
    checks = ["schemas", "requirements", "provenance"];
  } else if (phase === "direction") {
    artifactKeys = DIRECTION;
    checks = ["schemas", "requirements", "territories", "selected-direction", "provenance"];
    if (directionValidationRequired) {
      artifactKeys = [...artifactKeys, "directionValidationPlan", "directionValidationResults"];
      checks = [...checks, "direction-validation"];
    }
  } else if (phase === "handoff") {
    artifactKeys = [...HANDOFF, ...modeArtifacts(mode)];
    checks = ["schemas", "requirements", "territories", "selected-direction", "tokens", "content-states", "slop", "provenance"];
  } else if (mode === "audit") {
    artifactKeys = [...STRATEGY, "projectFingerprint"];
    checks = ["schemas", "requirements", "slop", "provenance"];
  } else {
    artifactKeys = [...HANDOFF, ...modeArtifacts(mode), "projectFingerprint"];
    checks = ["schemas", "requirements", "territories", "selected-direction", "tokens", "content-states", "slop", "provenance"];
  }

  const browserRequired = phase === "release" && (verificationMode === "browser" || ["demo", "proposal-demo"].includes(mode));
  if (browserRequired) {
    artifactKeys = [...artifactKeys, "verificationConfig", "verificationReport"];
    checks = [...checks, "verification"];
  }

  const reviewRequired = mode !== "audit" && (phase !== "strategy" || strategyReviewRequired);
  const reviewArtifact = reviewRequired ? reviewPathFor(phase) : null;
  const upstreamReviews = mode === "audit" ? []
    : phase === "direction" && strategyReviewRequired ? ["strategy"]
      : phase === "handoff" ? [...(strategyReviewRequired ? ["strategy"] : []), "direction"]
        : phase === "release" ? [...(strategyReviewRequired ? ["strategy"] : []), "direction", "handoff"] : [];
  const dimensions = phase === "release" ? (REVIEW_DIMENSIONS.release[mode] || []) : (REVIEW_DIMENSIONS[phase] || []);

  return {
    mode,
    phase,
    artifactKeys: [...new Set(artifactKeys)],
    designArtifactKeys: [...new Set(artifactKeys.filter((key) => !["verificationConfig", "verificationReport"].includes(key)))],
    checks: [...new Set(checks)],
    browserRequired,
    reviewRequired,
    reviewArtifact,
    upstreamReviews,
    dimensions
  };
}

export function expectedReviewArtifact(phase) {
  return reviewPathFor(phase);
}
