import fs from "fs";
import { PDFDocument, StandardFonts } from "pdf-lib";

const inputPdfPath = "input.pdf";
const fieldsJsonPath = "fields.json";
const outputPdfPath = "output_fillable.pdf";

const pdfBytes = fs.readFileSync(inputPdfPath);
const fields = JSON.parse(fs.readFileSync(fieldsJsonPath, "utf8"));

const pdfDoc = await PDFDocument.load(pdfBytes);
const form = pdfDoc.getForm();
const helv = await pdfDoc.embedFont(StandardFonts.Helvetica);

// pdf-lib uses 0-based page index
function getPage(pageNum1Based) {
  return pdfDoc.getPages()[pageNum1Based - 1];
}

for (const f of fields) {
  const page = getPage(f.page);

  if (f.type === "text") {
    const tf = form.createTextField(f.name);
    tf.setFontSize(10);
    tf.updateAppearances(helv);
    tf.addToPage(page, { x: f.x, y: f.y, width: f.w, height: f.h });
  } else if (f.type === "checkbox") {
    const cb = form.createCheckBox(f.name);
    cb.addToPage(page, { x: f.x, y: f.y, width: f.w, height: f.h });
  } else {
    throw new Error(`Unsupported type: ${f.type} for field ${f.name}`);
  }
}

// Optional: make fields visible but not editable? (usually you want editable)
// form.flatten(); // <-- DON’T do this if you want people to fill it.

const outBytes = await pdfDoc.save();
fs.writeFileSync(outputPdfPath, outBytes);

console.log(`Done. Wrote ${outputPdfPath}`);
