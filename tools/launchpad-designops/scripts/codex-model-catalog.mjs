import { spawn } from "node:child_process";

export async function readCodexModelCatalog({ codex = "codex", codexHome, env = {}, timeoutMs = 15_000 }) {
  return await new Promise((resolve, reject) => {
    const childEnv = { ...env, ...(codexHome ? { CODEX_HOME: codexHome } : {}) };
    delete childEnv.CODEX_API_KEY;
    const child = spawn(codex, ["app-server", "--listen", "stdio://"], {
      env: childEnv,
      stdio: ["pipe", "pipe", "pipe"]
    });
    let stdout = "";
    let stderr = "";
    let settled = false;
    const timer = setTimeout(() => finish(new Error(`Codex model catalog timed out after ${timeoutMs}ms.${diagnostics()}`)), timeoutMs);

    function diagnostics() {
      const detail = `${stderr}\n${stdout}`.trim();
      return detail ? ` ${detail.slice(-2_000)}` : "";
    }

    function send(message) {
      if (!child.stdin.destroyed) child.stdin.write(`${JSON.stringify(message)}\n`);
    }

    function finish(error, models) {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      child.stdin.end();
      child.kill();
      if (error) reject(error);
      else resolve(models);
    }

    function consume(line) {
      if (!line.trim()) return;
      let message;
      try { message = JSON.parse(line); } catch { return; }
      if (message.id === 0) {
        if (message.error) return finish(new Error(`Codex model catalog initialization failed: ${message.error.message || JSON.stringify(message.error)}`));
        send({ method: "initialized", params: {} });
        send({ method: "model/list", id: 1, params: { includeHidden: true, limit: 250 } });
      } else if (message.id === 1) {
        if (message.error) return finish(new Error(`Codex model catalog request failed: ${message.error.message || JSON.stringify(message.error)}`));
        const models = message.result?.data;
        if (!Array.isArray(models)) return finish(new Error("Codex model catalog returned an invalid response."));
        finish(null, models);
      }
    }

    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
      const lines = stdout.split(/\r?\n/);
      stdout = lines.pop() || "";
      for (const line of lines) consume(line);
    });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("error", (errorValue) => finish(new Error(`Could not start Codex model catalog: ${errorValue.message}`)));
    child.on("close", (code) => {
      if (stdout.trim()) consume(stdout);
      if (!settled) finish(new Error(`Codex model catalog exited ${code} before returning models.${diagnostics()}`));
    });

    send({ method: "initialize", id: 0, params: { clientInfo: { name: "launchpad-benchmark", title: "LaunchPad Benchmark", version: "0.2.0" } } });
  });
}

export function modelIsAvailable(catalog, requestedModel) {
  return catalog.some((entry) => entry?.id === requestedModel || entry?.model === requestedModel);
}

export function assertModelsAvailable(catalog, requestedModels) {
  const unavailable = [...new Set(requestedModels.filter(Boolean))].filter((model) => !modelIsAvailable(catalog, model));
  if (unavailable.length) throw new Error(`Configured Codex model${unavailable.length === 1 ? " is" : "s are"} not available to this authenticated client: ${unavailable.join(", ")}. Update Codex or select models listed by the current client.`);
}
