#!/usr/bin/env node
import fs from "fs";
import { enrichFields, validateLLMConfig } from "./lib/field-enricher.mjs";
import { getAvailablePromptKeys } from "./lib/prompt-templates.mjs";

function parseArgs(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg.startsWith("--")) {
      out._.push(arg);
      continue;
    }
    const eq = arg.indexOf("=");
    if (eq !== -1) {
      const key = arg.slice(2, eq);
      out[key] = arg.slice(eq + 1);
      continue;
    }
    const key = arg.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith("--")) {
      out[key] = true;
      continue;
    }
    out[key] = next;
    i++;
  }
  return out;
}

function usage(exitCode = 0) {
  const msg = `
Generate Content - Uses LLM to generate NCOER field content

Usage:
  generate-content --fields ncoer-fields.json [options]

Options:
  --fields <path>     Field definitions with LLM markers (required)
  --previous <path>   Previous NCOER JSON for context (from extract-previous)
  --output <path>     Output enriched fields JSON (default: fields-enriched.json)
  --api-key <key>     Anthropic API key (or set ANTHROPIC_API_KEY env var)
  --model <model>     Claude model to use (default: claude-sonnet-4-20250514)
                      For production: --model claude-opus-4-5-20250514
  --dry-run           Preview prompts without calling API
  --verbose           Show detailed progress
  --list-prompts      List available prompt keys
  --help              Show this help message

Examples:
  npm run generate -- --fields ncoer-fields.json --previous previous-ncoer.json
  npm run generate -- --fields ncoer-fields.json --dry-run --verbose
  npm run generate -- --list-prompts

Environment:
  ANTHROPIC_API_KEY   API key for Claude (required unless --api-key provided)
`;
  if (exitCode === 0) console.log(msg.trim());
  else console.error(msg.trim());
  process.exit(exitCode);
}

const args = parseArgs(process.argv.slice(2));

if (args.help || args.h) usage(0);

if (args["list-prompts"]) {
  console.log("Available prompt keys:\n");
  for (const { key, description } of getAvailablePromptKeys()) {
    console.log(`  ${key.padEnd(25)} ${description}`);
  }
  process.exit(0);
}

const fieldsPath = args.fields;
const previousPath = args.previous;
const outputPath = args.output ?? "fields-enriched.json";
const apiKey = args["api-key"];
const model = args.model;
const dryRun = Boolean(args["dry-run"]);
const verbose = Boolean(args.verbose);

if (!fieldsPath) {
  console.error("Error: --fields is required\n");
  usage(1);
}

if (!fs.existsSync(fieldsPath)) {
  console.error(`Error: Fields file not found: ${fieldsPath}`);
  process.exit(1);
}

let fields;
try {
  fields = JSON.parse(fs.readFileSync(fieldsPath, "utf8"));
  if (!Array.isArray(fields)) {
    throw new Error("Fields must be a JSON array");
  }
} catch (err) {
  console.error(`Error reading fields: ${err.message}`);
  process.exit(1);
}

const validation = validateLLMConfig(fields);
if (!validation.valid) {
  console.error("Field configuration errors:");
  validation.errors.forEach((e) => console.error(`  - ${e}`));
  process.exit(1);
}
if (validation.warnings.length > 0 && verbose) {
  console.log("Warnings:");
  validation.warnings.forEach((w) => console.log(`  - ${w}`));
}

let previousNcoer = null;
if (previousPath) {
  if (!fs.existsSync(previousPath)) {
    console.error(`Error: Previous NCOER file not found: ${previousPath}`);
    process.exit(1);
  }
  try {
    previousNcoer = JSON.parse(fs.readFileSync(previousPath, "utf8"));
    if (verbose) console.log(`Loaded previous NCOER context from ${previousPath}`);
  } catch (err) {
    console.error(`Error reading previous NCOER: ${err.message}`);
    process.exit(1);
  }
}

if (verbose) {
  console.log(`\nConfiguration:`);
  console.log(`  Fields: ${fieldsPath}`);
  console.log(`  Previous NCOER: ${previousPath || "(none)"}`);
  console.log(`  Output: ${outputPath}`);
  console.log(`  Model: ${model || "claude-sonnet-4-20250514"}`);
  console.log(`  Dry run: ${dryRun}`);
  console.log("");
}

try {
  const enrichedFields = await enrichFields(fields, previousNcoer, {
    apiKey,
    model,
    verbose,
    dryRun,
  });

  if (!dryRun) {
    fs.writeFileSync(outputPath, JSON.stringify(enrichedFields, null, 2));
    console.log(`\nEnriched fields written to ${outputPath}`);

    const generatedCount = enrichedFields.filter(
      (f) => f.llm?.generatedAt
    ).length;
    console.log(`Generated content for ${generatedCount} fields`);
  }
} catch (err) {
  console.error(`\nError: ${err.message}`);
  if (verbose && err.stack) {
    console.error(err.stack);
  }
  process.exit(1);
}
