#!/usr/bin/env node
import fs from "fs";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

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
PDF Form Builder (JSON → AcroForm)

Usage:
  pdf-form-builder inspect --input input_flat.pdf
  pdf-form-builder build --input input_flat.pdf --fields fields.json --output output.pdf [--coords top-left|bottom-left] [--debug] [--flatten]

Defaults:
  --input  input.pdf
  --fields fields.json
  --output output_fillable.pdf
  --coords bottom-left

Notes:
  - Units are PDF points (72 points = 1 inch).
  - pdf-lib uses a bottom-left origin. If you measured Y from the top, use --coords top-left.
  - Use --debug to draw red boxes behind each field for fast iteration.
`;
  if (exitCode === 0) console.log(msg.trim());
  else console.error(msg.trim());
  process.exit(exitCode);
}

function asNumber(value, label) {
  const num = Number(value);
  if (!Number.isFinite(num)) throw new Error(`Invalid number for ${label}: ${value}`);
  return num;
}

function normalizeField(raw, index, globalOrigin) {
  const label = raw?.name ? `field "${raw.name}"` : `field #${index + 1}`;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error(`Invalid ${label}: expected an object`);
  }
  if (!raw.name || typeof raw.name !== "string") throw new Error(`Invalid ${label}: missing string "name"`);
  if (!raw.type || typeof raw.type !== "string") throw new Error(`Invalid ${label}: missing string "type"`);
  const page = asNumber(raw.page, `${label}.page`);
  if (!Number.isInteger(page) || page < 1) throw new Error(`Invalid ${label}.page: must be an integer >= 1`);
  const origin = raw.origin ?? globalOrigin;
  return {
    page,
    name: raw.name,
    type: raw.type,
    x: asNumber(raw.x, `${label}.x`),
    y: asNumber(raw.y, `${label}.y`),
    w: asNumber(raw.w, `${label}.w`),
    h: asNumber(raw.h, `${label}.h`),
    origin,
    tooltip: raw.tooltip,
    value: raw.value,
    fontSize: raw.fontSize,
    maxLength: raw.maxLength,
    multiline: raw.multiline,
    required: raw.required,
    readOnly: raw.readOnly,
    checked: raw.checked,
  };
}

function resolveXY(field, pageHeight) {
  if (field.origin === "top-left") {
    return { x: field.x, y: pageHeight - field.y - field.h };
  }
  return { x: field.x, y: field.y };
}

function drawDebugBox(page, rect) {
  page.drawRectangle({
    x: rect.x,
    y: rect.y,
    width: rect.width,
    height: rect.height,
    borderColor: rgb(1, 0, 0),
    borderWidth: 1,
    color: rgb(1, 0, 0),
    opacity: 0.12,
  });
}

function callIfFunction(obj, methodName, ...args) {
  const fn = obj?.[methodName];
  if (typeof fn === "function") fn.apply(obj, args);
}

const args = parseArgs(process.argv.slice(2));
if (args.help || args.h) usage(0);

const [command = "build"] = args._;
const inputPdfPath = args.input ?? "input_flat.pdf";

if (command === "inspect") {
  const pdfBytes = fs.readFileSync(inputPdfPath);
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const pages = pdfDoc.getPages();
  console.log(`PDF: ${inputPdfPath}`);
  console.log(`Pages: ${pages.length}`);
  pages.forEach((p, idx) => {
    const { width, height } = p.getSize();
    const rotation = p.getRotation().angle;
    console.log(`- Page ${idx + 1}: ${width} x ${height} (rotation ${rotation}°)`);
  });
  process.exit(0);
}

if (command !== "build") {
  console.error(`Unknown command: ${command}`);
  usage(1);
}

const fieldsJsonPath = args.fields ?? "fields.json";
const outputPdfPath = args.output ?? "Fillable_NCOER.pdf";
const coords = args.coords ?? "bottom-left";
const debug = Boolean(args.debug);
const flatten = Boolean(args.flatten);
const globalOrigin = coords === "top-left" ? "top-left" : "bottom-left";

const pdfBytes = fs.readFileSync(inputPdfPath);
const fieldsRaw = JSON.parse(fs.readFileSync(fieldsJsonPath, "utf8"));
if (!Array.isArray(fieldsRaw)) throw new Error(`Invalid ${fieldsJsonPath}: expected a JSON array`);

const pdfDoc = await PDFDocument.load(pdfBytes);
const form = pdfDoc.getForm();
const helv = await pdfDoc.embedFont(StandardFonts.Helvetica);
const pages = pdfDoc.getPages();

const fields = fieldsRaw.map((f, idx) => normalizeField(f, idx, globalOrigin));

for (const f of fields) {
  const page = pages[f.page - 1];
  if (!page) throw new Error(`Field "${f.name}" references missing page ${f.page} (PDF has ${pages.length} pages)`);
  const { height: pageHeight } = page.getSize();
  const { x, y } = resolveXY(f, pageHeight);
  const rect = { x, y, width: f.w, height: f.h };

  if (debug) drawDebugBox(page, rect);

  if (f.type === "text") {
    const tf = form.createTextField(f.name);
    if (typeof f.tooltip === "string") callIfFunction(tf, "setTooltip", f.tooltip);
    if (f.multiline) callIfFunction(tf, "enableMultiline");
    if (f.required) callIfFunction(tf, "enableRequired");
    if (f.readOnly) callIfFunction(tf, "enableReadOnly");
    if (typeof f.maxLength === "number" && Number.isInteger(f.maxLength) && f.maxLength > 0) {
      tf.setMaxLength(f.maxLength);
    }
    tf.addToPage(page, rect);
    if (typeof f.value === "string") tf.setText(f.value);
    tf.updateAppearances(helv);
    const fontSize = typeof f.fontSize === "number" ? f.fontSize : 10;
    tf.setFontSize(fontSize);
    tf.updateAppearances(helv);
  } else if (f.type === "checkbox") {
    const cb = form.createCheckBox(f.name);
    if (typeof f.tooltip === "string") callIfFunction(cb, "setTooltip", f.tooltip);
    if (f.required) callIfFunction(cb, "enableRequired");
    if (f.readOnly) callIfFunction(cb, "enableReadOnly");
    cb.addToPage(page, rect);
    if (f.checked) cb.check();
  } else {
    throw new Error(`Unsupported type: ${f.type} for field ${f.name}`);
  }
}

if (flatten) form.flatten();

const outBytes = await pdfDoc.save();
fs.writeFileSync(outputPdfPath, outBytes);

console.log(`Done. Wrote ${outputPdfPath}`);
