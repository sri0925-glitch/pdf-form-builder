import fs from "fs";
import { PDFDocument } from "pdf-lib";

export async function extractFieldsFromPdf(pdfPath, fieldMapping = null) {
  const bytes = fs.readFileSync(pdfPath);
  const pdfDoc = await PDFDocument.load(bytes);
  const form = pdfDoc.getForm();
  const fields = form.getFields();

  const extracted = {
    metadata: {
      sourceFile: pdfPath,
      extractedAt: new Date().toISOString(),
      fieldCount: fields.length,
    },
    rawFields: {},
    mapped: null,
  };

  for (const field of fields) {
    const name = field.getName();
    const type = field.constructor.name;
    let value = null;

    try {
      if (type === "PDFTextField") {
        value = field.getText() || "";
      } else if (type === "PDFCheckBox") {
        value = field.isChecked();
      } else if (type === "PDFDropdown") {
        const selected = field.getSelected();
        value = selected.length > 0 ? selected[0] : "";
      } else if (type === "PDFRadioGroup") {
        value = field.getSelected() || "";
      }
    } catch (err) {
      value = `[Error extracting: ${err.message}]`;
    }

    extracted.rawFields[name] = {
      type,
      value,
    };
  }

  if (fieldMapping) {
    extracted.mapped = mapFields(extracted.rawFields, fieldMapping);
  }

  return extracted;
}

export function mapFields(rawFields, mapping) {
  const result = {
    part3: {},
    part4: {},
    part5: {},
    other: {},
  };

  for (const [standardName, pdfFieldNames] of Object.entries(mapping)) {
    const names = Array.isArray(pdfFieldNames) ? pdfFieldNames : [pdfFieldNames];

    for (const pdfName of names) {
      if (rawFields[pdfName]) {
        const value = rawFields[pdfName].value;

        if (standardName.startsWith("part3")) {
          result.part3[standardName] = value;
        } else if (standardName.startsWith("part4")) {
          result.part4[standardName] = value;
        } else if (standardName.startsWith("part5")) {
          result.part5[standardName] = value;
        } else {
          result.other[standardName] = value;
        }
        break;
      }
    }
  }

  return result;
}

export function structureForLLM(extracted) {
  const mapped = extracted.mapped || {};

  return {
    metadata: extracted.metadata,
    part3: {
      dailyDuties: mapped.part3?.part3c_daily_duties || "",
      specialEmphasis: mapped.part3?.part3d_special_emphasis || "",
      appointedDuties: mapped.part3?.part3e_appointed_duties || "",
    },
    part4: {
      ptComments: mapped.part4?.part4_pt_comments || "",
      cComments: mapped.part4?.part4c_comments || "",
      dComments: mapped.part4?.part4d_comments || "",
      eComments: mapped.part4?.part4e_comments || "",
      fComments: mapped.part4?.part4f_comments || "",
      gComments: mapped.part4?.part4g_comments || "",
      hComments: mapped.part4?.part4h_comments || "",
      jComments: mapped.part4?.part4j_comments || "",
    },
    part5: {
      a: mapped.part5?.part5a_potential || "",
      b: mapped.part5?.part5b_potential || "",
      c: mapped.part5?.part5c_potential || "",
    },
    supplementalContext: {
      position: mapped.other?.position || "",
      unit: mapped.other?.unit || "",
      ratedSoldier: mapped.other?.rated_name || "",
      rank: mapped.other?.rated_rank || "",
    },
  };
}
