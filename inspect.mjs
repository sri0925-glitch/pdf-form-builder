import fs from "fs";
import { PDFDocument } from "pdf-lib";

const INPUT = "output_fillable.pdf";
const bytes = fs.readFileSync(INPUT);
const pdfDoc = await PDFDocument.load(bytes);
const form = pdfDoc.getForm();

const fields = form.getFields();
console.log("FIELD_COUNT:", fields.length);

for (const f of fields) {
  console.log(`${f.constructor?.name ?? "Unknown"} => ${f.getName()}`);
}
