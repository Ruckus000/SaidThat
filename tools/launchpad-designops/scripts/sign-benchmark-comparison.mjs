import { access, readFile, realpath } from "node:fs/promises";
import path from "node:path";
import { parseArgs, readJson, printReport } from "./lib.mjs";
import { signReview } from "./review-signature.mjs";
import { validateWithSchema, formatSchemaErrors } from "./schema-utils.mjs";
import { writeJsonAtomic } from "./provenance.mjs";

const args = parseArgs(process.argv.slice(2));
if (!args.comparison || !args["private-key"] || !args["benchmark-root"]) {
  console.error("Usage: sign-benchmark-comparison.mjs --comparison <comparison.json> --benchmark-root <runs> --private-key <external-private.pem>");
  process.exitCode = 3;
} else {
  try {
    const comparisonPath = await realpath(path.resolve(args.comparison));
    const benchmarkRoot = await realpath(path.resolve(args["benchmark-root"]));
    const privateKeyPath = await realpath(path.resolve(args["private-key"]));
    const outputPath = path.resolve(args.output || comparisonPath);
    if (!inside(benchmarkRoot, comparisonPath)) throw new Error("Comparison must live under the declared benchmark root.");
    const outputParent = await realpath(path.dirname(outputPath));
    if (!inside(benchmarkRoot, outputParent)) throw new Error("Signed comparison output parent resolves outside the benchmark root.");
    if (inside(benchmarkRoot, privateKeyPath)) throw new Error("Reviewer private keys must remain outside the benchmark root.");
    if (outputPath !== comparisonPath) try { await access(outputPath); throw new Error("Signed comparison output already exists and will not be overwritten."); } catch (errorValue) { if (errorValue?.code !== "ENOENT") throw errorValue; }
    const signed = signReview(await readJson(comparisonPath), await readFile(privateKeyPath, "utf8"));
    const result = await validateWithSchema(signed, "benchmark-comparison.schema.json");
    if (!result.valid) throw new Error(formatSchemaErrors(result.errors));
    await writeJsonAtomic(outputPath, signed);
    printReport({ title: "LaunchPad benchmark comparison signature", data: { comparison: outputPath, caseId: signed.caseId, runId: signed.runId, keyId: signed.signature.keyId }, json: Boolean(args.json) });
  } catch (errorValue) {
    console.error(`Benchmark comparison signing failed: ${String(errorValue.message || errorValue)}`);
    process.exitCode = 3;
  }
}

function inside(root, candidate) {
  const relative = path.relative(root, candidate);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}
