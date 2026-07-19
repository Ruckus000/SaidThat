import { readFile, realpath } from "node:fs/promises";
import path from "node:path";
import { parseArgs, readJson, printReport } from "./lib.mjs";
import { signReview } from "./review-signature.mjs";
import { validateWithSchema, formatSchemaErrors } from "./schema-utils.mjs";
import { writeJsonAtomic } from "./provenance.mjs";

const args = parseArgs(process.argv.slice(2));
if (!args.plan || !args["private-key"]) {
  console.error("Usage: sign-validation-plan.mjs --plan <plan.json> --private-key <external-private.pem>");
  process.exitCode = 3;
} else {
  try {
    const planPath = path.resolve(args.plan);
    const privateKeyPath = path.resolve(args["private-key"]);
    const parts = planPath.split(path.sep);
    const designopsIndex = parts.lastIndexOf(".designops");
    if (designopsIndex < 1) throw new Error("Validation plan must live under a .designops directory.");
    const projectRoot = parts.slice(0, designopsIndex).join(path.sep) || path.parse(planPath).root;
    const privateReal = await realpath(privateKeyPath);
    const relative = path.relative(await realpath(projectRoot), privateReal);
    if (relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative))) throw new Error("Reviewer private keys must remain outside the project workspace.");
    const signed = signReview(await readJson(planPath), await readFile(privateReal, "utf8"));
    const result = await validateWithSchema(signed, "direction-validation-plan.schema.json");
    if (!result.valid) throw new Error(formatSchemaErrors(result.errors));
    await writeJsonAtomic(planPath, signed);
    printReport({ title: "LaunchPad direction-validation plan signature", data: { plan: planPath, keyId: signed.signature.keyId }, json: Boolean(args.json) });
  } catch (errorValue) {
    console.error(`Validation-plan signing failed: ${String(errorValue.message || errorValue)}`);
    process.exitCode = 3;
  }
}
