import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { parseArgs, printReport } from "./lib.mjs";
import { generateReviewerKeyPair, reviewerKeyId } from "./review-signature.mjs";

const args = parseArgs(process.argv.slice(2));
if (!args.private || !args.public) {
  console.error("Usage: generate-reviewer-keypair.mjs --private <external-private.pem> --public <external-public.pem>");
  process.exitCode = 3;
} else {
  const privatePath = path.resolve(args.private);
  const publicPath = path.resolve(args.public);
  if (privatePath === publicPath) throw new Error("Private and public key paths must differ.");
  const pair = generateReviewerKeyPair();
  await mkdir(path.dirname(privatePath), { recursive: true });
  await mkdir(path.dirname(publicPath), { recursive: true });
  await writeFile(privatePath, pair.privateKey, { mode: 0o600, flag: "wx" });
  await writeFile(publicPath, pair.publicKey, { mode: 0o644, flag: "wx" });
  printReport({ title: "LaunchPad reviewer key generation", data: { publicKey: publicPath, keyId: reviewerKeyId(pair.publicKey), privateKeyCreated: true }, json: Boolean(args.json) });
}
