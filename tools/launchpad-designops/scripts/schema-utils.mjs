import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Ajv2020 from "ajv/dist/2020.js";

export const SCHEMA_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../schemas");

export async function compileSchema(schemaFile) {
  const ajv = new Ajv2020({
    allErrors: true,
    strict: false,
    formats: {
      "date-time": {
        type: "string",
        validate: (value) => /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(value) && !Number.isNaN(Date.parse(value))
      }
    }
  });
  const schema = JSON.parse(await readFile(path.join(SCHEMA_ROOT, schemaFile), "utf8"));
  return ajv.compile(schema);
}

export function formatSchemaErrors(errors = []) {
  return errors.map((error) => `${error.instancePath || "$"} ${error.message}`).join("; ");
}

export async function validateWithSchema(payload, schemaFile) {
  const validate = await compileSchema(schemaFile);
  const valid = Boolean(validate(payload));
  return { valid, errors: validate.errors || [] };
}
