import { spawn, spawnSync } from "node:child_process";
import { mkdir, readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { parseArgs, readJson, printReport } from "./lib.mjs";
import { getGateProfile, GATE_VERSION, QUALIFIED_BROWSER_LANES } from "./gate-policy.mjs";
import {
  computeImplementationDigest, computeVerificationInputDigest, digest, digestArtifacts,
  hashArtifacts, resolveContainedPath, sha256, writeJsonAtomic
} from "./provenance.mjs";
import { validateWithSchema, formatSchemaErrors } from "./schema-utils.mjs";
import { assertCommandArray, assertLoopbackUrl, assertVerificationConfigSemantics, verificationCommandEnvironment } from "./command-utils.mjs";

const require = createRequire(import.meta.url);
const { chromium, firefox, webkit } = await import("playwright");
const axeSource = require("axe-core").source;
const toolVersions = { node: process.version, playwright: require("playwright/package.json").version, axe: require("axe-core/package.json").version };
const args = parseArgs(process.argv.slice(2));
const root = path.resolve(args.root || ".designops");
const projectRoot = path.resolve(args["project-root"] || path.dirname(root));
const findings = [];
const browsers = { chromium, firefox, webkit };
let server;

const add = (id, severity, message, evidence) => findings.push({ id, severity, message, evidence: evidence || "No evidence supplied." });
const containedProjectPath = (value = ".") => {
  if (path.isAbsolute(value) || path.win32.isAbsolute(value) || value.includes("\\")) throw new Error(`Command cwd must be a project-relative POSIX path: ${value}`);
  const resolved = path.resolve(projectRoot, value);
  const relative = path.relative(projectRoot, resolved);
  if (relative.startsWith("..") || path.isAbsolute(relative)) throw new Error(`Command cwd escapes the project: ${value}`);
  return resolved;
};

try {
  const project = await readJson(path.join(root, "project.json"));
  const configPath = await resolveContainedPath(root, project.artifacts.verificationConfig);
  const config = await readJson(configPath);
  const configResult = await validateWithSchema(config, "verification-config.schema.json");
  if (!configResult.valid) throw new Error(formatSchemaErrors(configResult.errors));
  assertCommandArray(config.server, "Project server");
  assertCommandArray(config.taskTest, "Primary-task test");
  assertLoopbackUrl(config.baseUrl, "baseUrl");
  assertVerificationConfigSemantics(config);
  const commandEnvironment = verificationCommandEnvironment(config);
  if (!QUALIFIED_BROWSER_LANES.includes(config.lane)) {
    const report = notConfigured(config, "The lane is not release-qualified in LaunchPad 0.2.");
    await writeJsonAtomic(await outputPath(project), report);
    printReport({ title: "Project verification", findings: [], data: report, json: Boolean(args.json) });
    process.exitCode = 3;
  } else {
    const profile = getGateProfile({ mode: project.project.mode, phase: "release", verificationMode: "browser" });
    const designArtifacts = await hashArtifacts(root, project.artifacts, profile.designArtifactKeys);
    const designDigest = digestArtifacts(designArtifacts);
    const implementationDigest = await computeImplementationDigest(projectRoot, [...new Set([...config.sourceRoots, ...config.taskTest.sourceFiles])]);
    const configArtifact = await hashArtifacts(root, project.artifacts, ["verificationConfig"]);
    const commandDigest = digest({ server: config.server, taskTest: config.taskTest || null });
    const verifierDigest = digest({ runnerVersion: GATE_VERSION, tools: toolVersions, commandDigest });
    const verificationInputDigest = computeVerificationInputDigest({ designDigest, implementationDigest, verificationConfigHash: configArtifact.verificationConfig.sha256, verifierDigest });
    server = spawn(config.server.command, config.server.args, { cwd: containedProjectPath(config.server.cwd), stdio: ["ignore", "pipe", "pipe"], env: commandEnvironment, detached: process.platform !== "win32" });
    const serverErrors = [];
    const serverLogs = [];
    server.stdout.on("data", (chunk) => { serverLogs.push(String(chunk)); if (serverLogs.length > 50) serverLogs.shift(); });
    server.stderr.on("data", (chunk) => serverErrors.push(String(chunk)));
    await waitForHealth(new URL(config.healthPath, config.baseUrl).href, config.timeoutMs, server, serverErrors);

    const routeResults = [];
    for (const browserName of config.browsers) {
      const browser = await browsers[browserName].launch({ headless: true });
      try {
        for (const viewport of config.viewports) for (const route of config.routes) routeResults.push(await inspectRoute({ browser, browserName, viewport, route, config }));
      } finally {
        await browser.close();
      }
    }

    let taskTest;
    if (config.taskTest) {
      const commandDigest = digest(config.taskTest);
      const startedAt = Date.now();
      const taskResult = spawnSync(config.taskTest.command, config.taskTest.args, { cwd: containedProjectPath(config.taskTest.cwd), encoding: "utf8", timeout: config.timeoutMs, env: commandEnvironment });
      let protocol = null;
      try { protocol = JSON.parse(taskResult.stdout || "{}"); } catch { /* reported below */ }
      const configuredTaskIds = new Set(config.routes.flatMap((route) => route.taskIds));
      const protocolValid = taskResult.status === 0 && protocol?.status === "pass" && Array.isArray(protocol.taskIds) && [...configuredTaskIds].every((taskId) => protocol.taskIds.includes(taskId)) && ["keyboard", "touch"].every((mode) => protocol.modalities?.includes(mode)) && Array.isArray(protocol.evidence) && protocol.evidence.length > 0;
      taskTest = { status: protocolValid ? "pass" : "fail", commandDigest, outputDigest: digest({ stdout: taskResult.stdout || "", stderr: taskResult.stderr || "", exitCode: taskResult.status, durationMs: Date.now() - startedAt }), taskIds: protocol?.taskIds || [], modalities: protocol?.modalities || [], evidence: protocol?.evidence || [] };
      if (!protocolValid) add("primary-task-test", "P0", "Project-owned task test did not provide passing keyboard and touch evidence for every configured task.", (taskResult.stderr || taskResult.stdout || `exit ${taskResult.status}`).slice(-2000));
    }
    if (serverErrors.length) add("server-diagnostics", "P2", "The project server wrote diagnostic output to stderr.", serverErrors.join("").slice(-2000));
    for (const route of routeResults) for (const finding of route.findings) findings.push(finding);
    const report = {
      schemaVersion: "0.2", status: findings.some((finding) => finding.severity === "P0") ? "fail" : "pass", scope: "project", lane: config.lane,
      verificationInputDigest, implementationDigest,
      runner: { name: "launchpad-browser-verifier", version: GATE_VERSION, runId: `verify-${Date.now().toString(36)}-${process.pid}`, generatedAt: new Date().toISOString(), commandDigest, tools: toolVersions },
      routes: routeResults, ...(taskTest ? { taskTest } : {}),
      findings,
      summary: { p0: findings.filter((finding) => finding.severity === "P0").length, p1: findings.filter((finding) => finding.severity === "P1").length, routesChecked: routeResults.length }
    };
    const reportResult = await validateWithSchema(report, "verification-report.schema.json");
    if (!reportResult.valid) throw new Error(`Generated verification report is invalid: ${formatSchemaErrors(reportResult.errors)}`);
    await writeJsonAtomic(await outputPath(project), report);
    printReport({ title: "Project verification", findings, data: { status: report.status, routesChecked: routeResults.length, verificationInputDigest }, json: Boolean(args.json) });
    process.exitCode = report.status === "pass" ? 0 : 1;
  }
} catch (errorValue) {
  add("verification-runner", "P0", "Project verification could not run.", String(errorValue.message || errorValue));
  printReport({ title: "Project verification", findings, json: Boolean(args.json) });
  process.exitCode = 3;
} finally {
  if (server && !server.killed) {
    try { if (process.platform !== "win32" && server.pid) process.kill(-server.pid, "SIGTERM"); else server.kill("SIGTERM"); } catch { /* Process already exited. */ }
  }
}

async function outputPath(project) {
  const relative = project.artifacts.verificationReport;
  if (!relative) throw new Error("verificationReport artifact path is missing.");
  const output = await resolveContainedPath(root, relative, { mustExist: false });
  await mkdir(path.dirname(output), { recursive: true });
  return output;
}

function notConfigured(config, reason) {
  const unavailable = { id: "lane-not-configured", severity: "P0", message: reason, evidence: config.lane };
  return { schemaVersion: "0.2", status: "not-configured", scope: "project", lane: config.lane, verificationInputDigest: digest(reason), implementationDigest: digest(reason), runner: { name: "launchpad-browser-verifier", version: GATE_VERSION, runId: `verify-${Date.now().toString(36)}`, generatedAt: new Date().toISOString(), commandDigest: digest(config.server), tools: toolVersions }, routes: [], findings: [unavailable], summary: { p0: 1, p1: 0, routesChecked: 0 } };
}

async function waitForHealth(url, timeoutMs, child, serverErrors = []) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`Project server exited before health check (exit ${child.exitCode}): ${serverErrors.join("").slice(-2000)}`);
    try { const response = await fetch(url, { redirect: "manual" }); if (response.ok) return; } catch { /* retry */ }
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  throw new Error(`Health check timed out: ${url}`);
}

async function inspectRoute({ browser, browserName, viewport, route, config }) {
  const context = await browser.newContext({ viewport, reducedMotion: "reduce", hasTouch: viewport.width <= 768 });
  const page = await context.newPage();
  const errors = [];
  page.on("console", (message) => { if (message.type() === "error") errors.push(`console: ${message.text()}`); });
  page.on("pageerror", (error) => errors.push(`runtime: ${error.message}`));
  const checks = {};
  const local = [];
  const fail = (id, message, evidence) => { checks[id] = "fail"; local.push({ id: `${id}-${browserName}-${viewport.width}-${route.path}`, severity: "P0", message, evidence }); };
  const pass = (id) => { if (!checks[id]) checks[id] = "pass"; };
  try {
    const expectedUrl = new URL(route.path, config.baseUrl);
    const response = await page.goto(expectedUrl.href, { waitUntil: "networkidle", timeout: config.timeoutMs });
    response?.ok() ? pass("route-load") : fail("route-load", "Route did not return a successful response.", `${route.path}: ${response?.status() || "no response"}`);
    if (new URL(page.url()).origin !== expectedUrl.origin) fail("route-load", "Route redirected outside the configured project origin.", page.url());
    errors.length ? fail("console", "Route produced console or runtime errors.", errors.join("; ")) : pass("console");
    errors.some((entry) => entry.startsWith("runtime")) ? fail("runtime", "Route produced a runtime error.", errors.join("; ")) : pass("runtime");
    await page.addScriptTag({ content: axeSource });
    const axe = await page.evaluate(async () => globalThis.axe.run(document, { resultTypes: ["violations"] }));
    axe.violations.length ? fail("axe", "Automated accessibility violations were found.", axe.violations.map((item) => item.id).join(", ")) : pass("axe");
    await page.keyboard.press("Tab");
    const focus = await page.evaluate((expectedSelector) => { const el = document.activeElement; if (!el || el === document.body) return { active: false }; const style = getComputedStyle(el); const outlined = style.outlineStyle !== "none" && parseFloat(style.outlineWidth) > 0; const shadowed = style.boxShadow !== "none"; return { active: el.matches(expectedSelector), visible: el.matches(":focus-visible") && (outlined || shadowed) }; }, route.focusSelector);
    focus.active ? pass("keyboard") : fail("keyboard", "Keyboard traversal did not reach an interactive element.", route.path);
    focus.visible ? pass("focus-visible") : fail("focus-visible", "Keyboard focus was not visibly indicated.", JSON.stringify(focus));
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
    overflow ? fail("overflow", "Page has horizontal responsive overflow.", `${viewport.width}x${viewport.height}`) : pass("overflow");
    const images = await page.evaluate(() => [...document.images].filter((image) => !image.hasAttribute("alt")).length);
    images ? fail("image-alternatives", "Rendered images lack alt attributes.", `${images} image(s)`) : pass("image-alternatives");
    const unlabeled = await page.evaluate(() => [...document.querySelectorAll("input, select, textarea")].filter((control) => !control.labels?.length && !control.getAttribute("aria-label") && !control.getAttribute("aria-labelledby")).length);
    unlabeled ? fail("form-labels", "Rendered form controls lack accessible labels.", `${unlabeled} control(s)`) : pass("form-labels");
    const smallTargets = await page.evaluate(() => [...document.querySelectorAll("a[href], button, input:not([type=hidden]), select, textarea")].filter((element) => { const box = element.getBoundingClientRect(); return box.width > 0 && box.height > 0 && (box.width < 24 || box.height < 24); }).length);
    smallTargets ? fail("target-sizes", "Interactive targets below 24 CSS pixels were found.", `${smallTargets} target(s)`) : pass("target-sizes");
    const animations = await page.evaluate(() => document.getAnimations().filter((animation) => {
      const timing = animation.effect?.getTiming?.() || {};
      const keyframes = animation.effect?.getKeyframes?.() || [];
      const moves = keyframes.some((frame) => ["transform", "translate", "rotate", "scale", "offsetPath", "offsetDistance"].some((property) => frame[property] !== undefined));
      return moves && (Number(timing.duration || 0) > 100 || timing.iterations === Infinity);
    }).length);
    animations ? fail("reduced-motion", "Spatial animations remain active under reduced-motion preferences.", `${animations} animation(s)`) : pass("reduced-motion");
    let stateFailure = false;
    for (const [state, selector] of Object.entries(route.stateSelectors || {})) {
      const target = page.locator(selector).first();
      if (await target.count() === 0) { stateFailure = true; local.push({ id: `state-${state}-${browserName}-${viewport.width}`, severity: "P0", message: `Configured state selector '${state}' was not found.`, evidence: selector }); continue; }
      if (state !== "normal") await target.click();
      const renderedState = page.locator(`[data-state="${state}"], [data-designops-state="${state}"]`).first();
      const rendered = await renderedState.count() > 0 && await renderedState.isVisible();
      if (!rendered) { stateFailure = true; local.push({ id: `state-${state}-${browserName}-${viewport.width}`, severity: "P0", message: `Configured state '${state}' did not render visibly after its trigger.`, evidence: selector }); }
      if (state !== "normal" && state !== "long-content") {
        const recoverySelector = route.recoverySelectors?.[state];
        if (!recoverySelector || await page.locator(recoverySelector).count() === 0) { stateFailure = true; local.push({ id: `recovery-${state}-${browserName}-${viewport.width}`, severity: "P0", message: `Configured state '${state}' has no executable recovery selector.`, evidence: recoverySelector || "missing" }); }
        else { await page.locator(recoverySelector).first().click(); const normalState = page.locator('[data-state="normal"], [data-designops-state="normal"]').first(); if (await normalState.count() === 0 || !await normalState.isVisible()) { stateFailure = true; local.push({ id: `recovery-${state}-${browserName}-${viewport.width}`, severity: "P0", message: `Recovery for state '${state}' did not restore a visible usable normal state.`, evidence: recoverySelector }); } }
      }
    }
    checks.states = stateFailure ? "fail" : "pass";
    checks["long-content"] = route.stateSelectors?.["long-content"] ? checks.states : "not-applicable";
    if (viewport.width <= 768) {
      const button = page.locator("button").first();
      if (await button.count()) { await button.tap(); pass("touch"); } else checks.touch = "not-applicable";
    } else checks.touch = "not-applicable";
    if (errors.length) {
      checks.console = "fail";
      if (errors.some((entry) => entry.startsWith("runtime"))) checks.runtime = "fail";
      local.push({ id: `late-errors-${browserName}-${viewport.width}-${route.path}`, severity: "P0", message: "Route interactions produced console or runtime errors.", evidence: errors.join("; ") });
    }
    const screenshotDirectory = path.join(root, "verification-screenshots");
    await mkdir(screenshotDirectory, { recursive: true });
    const screenshotName = `${browserName}-${viewport.width}x${viewport.height}-${route.path.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "") || "root"}-${sha256(route.path).slice(0, 10)}.png`;
    const screenshotPath = path.join(screenshotDirectory, screenshotName);
    await page.screenshot({ path: screenshotPath, fullPage: true, animations: "disabled" });
    const screenshot = { path: path.posix.join("verification-screenshots", screenshotName), sha256: sha256(await readFile(screenshotPath)) };
    return { path: route.path, browser: browserName, viewport, checks, findings: local, screenshot };
  } catch (errorValue) {
    fail("route-load", "Route verification threw an exception.", String(errorValue.message || errorValue));
    for (const id of ["console", "runtime", "axe", "keyboard", "focus-visible", "overflow", "image-alternatives", "form-labels", "target-sizes", "reduced-motion", "states", "long-content", "touch"]) if (!checks[id]) checks[id] = "fail";
  } finally {
    await context.close();
  }
  return { path: route.path, browser: browserName, viewport, checks, findings: local, screenshot: { path: "verification-screenshots/missing.png", sha256: "0".repeat(64) } };
}
