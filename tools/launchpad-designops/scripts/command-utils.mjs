import path from "node:path";

const SHELLS = new Set(["sh", "bash", "zsh", "fish", "dash", "ksh", "cmd", "cmd.exe", "powershell", "powershell.exe", "pwsh", "pwsh.exe"]);
const SAFE_ENVIRONMENT = ["PATH", "HOME", "USERPROFILE", "TMPDIR", "TEMP", "TMP", "LANG", "LC_ALL", "CI", "NODE_ENV", "FORCE_COLOR", "NO_COLOR", "COMSPEC", "SystemRoot", "WINDIR"];
const SENSITIVE_ENVIRONMENT = /(KEY|TOKEN|SECRET|PASSWORD|PASSWD|AUTH|COOKIE|CREDENTIAL|SESSION|PRIVATE)/i;

export function assertCommandArray(commandSpec, label) {
  if (!commandSpec || typeof commandSpec.command !== "string" || !Array.isArray(commandSpec.args)) throw new Error(`${label} must define command plus an argument array.`);
  const executable = path.basename(commandSpec.command).toLowerCase();
  if (SHELLS.has(executable)) throw new Error(`${label} may not invoke a shell interpreter; configure the executable and arguments directly.`);
  if (commandSpec.command.includes("\n") || commandSpec.command.includes("\0")) throw new Error(`${label} command contains invalid control characters.`);
}

export function assertLoopbackUrl(value, label) {
  const url = new URL(value);
  if (!['http:', 'https:'].includes(url.protocol) || !['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname)) throw new Error(`${label} must use an HTTP(S) loopback origin.`);
  return url;
}

export function assertVerificationConfigSemantics(config) {
  const routes = config.routes.map((route) => route.path);
  if (new Set(routes).size !== routes.length) throw new Error("Verification route paths must be unique.");
  const viewports = config.viewports.map((viewport) => `${viewport.width}x${viewport.height}`);
  if (new Set(viewports).size !== viewports.length) throw new Error("Verification viewport dimensions must be unique.");
  for (const browser of ["chromium", "firefox", "webkit"]) if (!config.browsers.includes(browser)) throw new Error(`Release-qualified verification requires browser '${browser}'.`);
  for (const viewport of ["375x812", "768x1024", "1024x768", "1440x1000"]) if (!viewports.includes(viewport)) throw new Error(`Release-qualified verification requires viewport '${viewport}'.`);
  if (!config.routes.some((route) => route.stateSelectors?.["long-content"])) throw new Error("At least one representative route must exercise long-content behavior.");
  for (const name of config.environmentAllowlist || []) if (SENSITIVE_ENVIRONMENT.test(name)) throw new Error(`Sensitive environment variable '${name}' cannot be forwarded to project verification commands.`);
}

export function verificationCommandEnvironment(config, source = process.env) {
  const names = new Set([...SAFE_ENVIRONMENT, ...(config.environmentAllowlist || [])]);
  const environment = {};
  for (const name of names) if (source[name] !== undefined) environment[name] = source[name];
  return environment;
}
