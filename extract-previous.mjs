#!/usr/bin/env node
import fs from "fs";
import {
  extractFieldsFromPdf,
  structureForLLM,
} from "./lib/pdf-extractor.mjs";

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
Extract Previous NCOER - Extracts field data from a fillable NCOER PDF

Usage:
  extract-previous --input previous_ncoer.pdf [options]

Options:
  --input <path>    Input PDF file (required)
  --output <path>   Output JSON file (default: previous-ncoer.json)
  --mapping <path>  Field mapping JSON (default: field-mapping.json)
  --raw             Output raw fields only (no mapping)
  --verbose         Show detailed progress
  --help            Show this help message

Examples:
  npm run extract -- --input my_previous_ncoer.pdf
  npm run extract -- --input ncoer.pdf --output context.json --verbose
`;
  if (exitCode === 0) console.log(msg.trim());
  else console.error(msg.trim());
  process.exit(exitCode);
}

const args = parseArgs(process.argv.slice(2));

if (args.help || args.h) usage(0);

const inputPath = args.input;
const outputPath = args.output ?? "previous-ncoer.json";
const mappingPath = args.mapping ?? "field-mapping.json";
const rawOnly = Boolean(args.raw);
const verbose = Boolean(args.verbose);

if (!inputPath) {
  console.error("Error: --input is required\n");
  usage(1);
}

if (!fs.existsSync(inputPath)) {
  console.error(`Error: Input file not found: ${inputPath}`);
  process.exit(1);
}

let fieldMapping = null;
if (!rawOnly && fs.existsSync(mappingPath)) {
  try {
    fieldMapping = JSON.parse(fs.readFileSync(mappingPath, "utf8"));
    if (verbose) console.log(`Loaded field mapping from ${mappingPath}`);
  } catch (err) {
    console.warn(`Warning: Could not load field mapping: ${err.message}`);
  }
}

if (verbose) console.log(`Extracting fields from ${inputPath}...`);

try {
  const extracted = await extractFieldsFromPdf(inputPath, fieldMapping);

  if (verbose) {
    console.log(`Found ${extracted.metadata.fieldCount} fields`);
  }

  let output;
  if (rawOnly) {
    output = extracted;
  } else {
    output = structureForLLM(extracted);
    output.rawFields = extracted.rawFields;
  }

  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
  console.log(`Extracted NCOER data written to ${outputPath}`);

  if (verbose && !rawOnly) {
    console.log("\nExtracted content summary:");
    if (output.part3?.dailyDuties) {
      console.log(`  Part 3c (Daily Duties): ${output.part3.dailyDuties.slice(0, 50)}...`);
    }
    if (output.part4?.ptComments) {
      console.log(`  Part 4 PT: ${output.part4.ptComments.slice(0, 50)}...`);
    }
  }
} catch (err) {
  console.error(`Error extracting PDF: ${err.message}`);
  process.exit(1);
}
