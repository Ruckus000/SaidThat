import { readFile, realpath } from "node:fs/promises";
import path from "node:path";
import { parseArgs, readJson, printReport } from "./lib.mjs";
import { signReview } from "./review-signature.mjs";
import { validateWithSchema, formatSchemaErrors } from "./schema-utils.mjs";
import { writeJsonAtomic } from "./provenance.mjs";

const args = parseArgs(process.argv.slice(2));
if (!args.review || !args["private-key"]) {
  console.error("Usage: sign-review.mjs --review <review.json> --private-key <external-private.pem>");
  process.exitCode = 3;
} else {
  try {
    const reviewPath = path.resolve(args.review);
    const privateKeyPath = path.resolve(args["private-key"]);
    const reviewParts = reviewPath.split(path.sep);
    const designopsIndex = reviewParts.lastIndexOf(".designops");
    if (designopsIndex < 1) throw new Error("Review must live under a .designops directory.");
    const projectRoot = reviewParts.slice(0, designopsIndex).join(path.sep) || path.parse(reviewPath).root;
    const privateReal = await realpath(privateKeyPath);
    const relative = path.relative(await realpath(projectRoot), privateReal);
    if (relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative))) throw new Error("Reviewer private keys must remain outside the project workspace.");
    const review = await readJson(reviewPath);
    const signed = signReview(review, await readFile(privateReal, "utf8"));
    const result = await validateWithSchema(signed, "human-review.schema.json");
    if (!result.valid) throw new Error(formatSchemaErrors(result.errors));
    await writeJsonAtomic(reviewPath, signed);
    printReport({ title: "LaunchPad review signature", data: { review: reviewPath, phase: signed.phase, keyId: signed.signature.keyId }, json: Boolean(args.json) });
  } catch (errorValue) {
    console.error(`Review signing failed: ${String(errorValue.message || errorValue)}`);
    process.exitCode = 3;
  }
}
