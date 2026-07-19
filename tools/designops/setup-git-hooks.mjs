#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const current = spawnSync("git", ["config", "--get", "core.hooksPath"], { cwd: root, encoding: "utf8" });
if (current.status === 0 && current.stdout.trim() === ".githooks") {
  console.log("Git hooks already configured: core.hooksPath=.githooks");
} else {
  const result = spawnSync("git", ["config", "core.hooksPath", ".githooks"], { cwd: root, encoding: "utf8" });
  if (result.status !== 0) {
    console.error(result.stderr || "Unable to configure tracked Git hooks.");
    process.exitCode = 3;
  } else {
    const check = spawnSync("git", ["config", "--get", "core.hooksPath"], { cwd: root, encoding: "utf8" });
    if (check.status !== 0 || check.stdout.trim() !== ".githooks") {
      console.error("Tracked Git hook configuration did not persist.");
      process.exitCode = 3;
    } else {
      console.log("Git hooks configured: core.hooksPath=.githooks");
    }
  }
}
