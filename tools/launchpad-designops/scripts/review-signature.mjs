import { createPrivateKey, createPublicKey, generateKeyPairSync, sign, verify } from "node:crypto";
import { sha256 } from "./provenance.mjs";

export function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
  return JSON.stringify(value);
}

export function unsignedReview(review) {
  const { signature, ...payload } = review;
  return payload;
}

export function reviewerKeyId(publicKeyValue) {
  const publicKey = publicKeyValue?.type === "public" ? publicKeyValue : createPublicKey(publicKeyValue);
  const der = publicKey.export({ type: "spki", format: "der" });
  return `sha256:${sha256(der)}`;
}

export function signReview(review, privateKeyValue) {
  const privateKey = createPrivateKey(privateKeyValue);
  if (privateKey.asymmetricKeyType !== "ed25519") throw new Error("Reviewer private key must be Ed25519.");
  const publicKey = createPublicKey(privateKey);
  const payload = Buffer.from(canonicalJson(unsignedReview(review)));
  return {
    ...unsignedReview(review),
    signature: {
      algorithm: "Ed25519",
      keyId: reviewerKeyId(publicKey),
      value: sign(null, payload, privateKey).toString("base64")
    }
  };
}

export function verifyReviewSignature(review, publicKeyValue) {
  const publicKey = createPublicKey(publicKeyValue);
  if (publicKey.asymmetricKeyType !== "ed25519") throw new Error("Trusted reviewer public key must be Ed25519.");
  if (review.signature?.algorithm !== "Ed25519") throw new Error("Review signature algorithm must be Ed25519.");
  const expectedKeyId = reviewerKeyId(publicKey);
  if (review.signature?.keyId !== expectedKeyId) throw new Error(`Review key '${review.signature?.keyId || "missing"}' does not match trusted key '${expectedKeyId}'.`);
  const signature = Buffer.from(review.signature?.value || "", "base64");
  if (!signature.length || !verify(null, Buffer.from(canonicalJson(unsignedReview(review))), publicKey, signature)) throw new Error("Review signature is invalid.");
  return expectedKeyId;
}

export function generateReviewerKeyPair() {
  const { privateKey, publicKey } = generateKeyPairSync("ed25519");
  return {
    privateKey: privateKey.export({ type: "pkcs8", format: "pem" }),
    publicKey: publicKey.export({ type: "spki", format: "pem" })
  };
}
