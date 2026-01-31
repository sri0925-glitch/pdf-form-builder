#!/usr/bin/env node
/**
 * Export NCOER content to Word document
 */

import { Document, Packer, Paragraph, TextRun, HeadingLevel, BorderStyle } from "docx";
import fs from "fs";

const fieldsPath = process.argv[2] || "fields-enriched.json";
const unitConfigPath = process.argv[3] || "unit-config.json";
const outputPath = process.argv[4] || "NCOER_Content.docx";

// Field display names
const FIELD_LABELS = {
  // Part 1
  part1_name: "Name",
  part1_rank: "Rank",
  part1_pmosc: "PMOSC",
  part1_organization: "Organization",
  part1_periodFrom: "Period From",
  part1_periodThru: "Period Thru",
  part1_reasonCode: "Reason Code",
  part1_uic: "UIC",

  // Part 3
  part3_dailyDuties: "Part 3c - Daily Duties and Scope",
  part3_specialEmphasis: "Part 3d - Areas of Special Emphasis",
  part3_appointedDuties: "Part 3e - Appointed Duties",

  // Part 4
  part4_ptComments: "Part 4 - Physical Training/ACFT",
  part4_cComments: "Part 4c - Character",
  part4_dComments: "Part 4d - Presence",
  part4_eComments: "Part 4e - Intellect",
  part4_fComments: "Part 4f - Leads",
  part4_gComments: "Part 4g - Develops",
  part4_hComments: "Part 4h - Achieves",
  part4_jComments: "Part 4j - Overall Performance",

  // Part 5
  part5_bComments: "Part 5c - Senior Rater Comments",
};

// Group fields by section
const SECTIONS = {
  "PART I - ADMINISTRATIVE DATA": [
    "part1_name", "part1_rank", "part1_pmosc", "part1_organization",
    "part1_periodFrom", "part1_periodThru", "part1_reasonCode", "part1_uic"
  ],
  "PART III - DUTY DESCRIPTION": [
    "part3_dailyDuties", "part3_specialEmphasis", "part3_appointedDuties"
  ],
  "PART IV - PERFORMANCE EVALUATION": [
    "part4_ptComments", "part4_cComments", "part4_dComments", "part4_eComments",
    "part4_fComments", "part4_gComments", "part4_hComments", "part4_jComments"
  ],
  "PART V - POTENTIAL": [
    "part5_bComments"
  ]
};

async function main() {
  // Load fields
  const fields = JSON.parse(fs.readFileSync(fieldsPath, "utf8"));
  const fieldMap = {};
  for (const field of fields) {
    if (field.value) {
      fieldMap[field.name] = field.value;
    }
  }

  // Load unit config for header info
  let unitConfig = {};
  try {
    unitConfig = JSON.parse(fs.readFileSync(unitConfigPath, "utf8"));
  } catch (e) {
    // Ignore if not found
  }

  const children = [];

  // Title
  children.push(
    new Paragraph({
      text: "NCO EVALUATION REPORT (NCOER)",
      heading: HeadingLevel.TITLE,
      spacing: { after: 200 },
    })
  );

  // Subtitle with soldier info
  if (unitConfig.ratedNCO) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({ text: `${unitConfig.ratedNCO.rank} ${unitConfig.ratedNCO.name}`, bold: true, size: 28 }),
        ],
        spacing: { after: 100 },
      })
    );
    children.push(
      new Paragraph({
        children: [
          new TextRun({ text: unitConfig.unit?.fullDesignation || "", size: 22 }),
        ],
        spacing: { after: 100 },
      })
    );
    if (unitConfig.ratingPeriod) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `Rating Period: ${unitConfig.ratingPeriod.from} - ${unitConfig.ratingPeriod.thru}`,
              size: 22,
              italics: true
            }),
          ],
          spacing: { after: 300 },
        })
      );
    }
  }

  // Sections
  for (const [sectionTitle, fieldNames] of Object.entries(SECTIONS)) {
    // Section header
    children.push(
      new Paragraph({
        text: sectionTitle,
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 200 },
        border: {
          bottom: { style: BorderStyle.SINGLE, size: 6, color: "000000" },
        },
      })
    );

    // Part 1 fields in a compact format
    if (sectionTitle.includes("PART I")) {
      const part1Fields = fieldNames
        .filter(name => fieldMap[name])
        .map(name => `${FIELD_LABELS[name]}: ${fieldMap[name]}`);

      for (const line of part1Fields) {
        children.push(
          new Paragraph({
            children: [new TextRun({ text: line, size: 22 })],
            spacing: { after: 50 },
          })
        );
      }
    } else {
      // Narrative fields with full content
      for (const fieldName of fieldNames) {
        const value = fieldMap[fieldName];
        if (!value) continue;

        const label = FIELD_LABELS[fieldName] || fieldName;

        // Field label
        children.push(
          new Paragraph({
            children: [
              new TextRun({ text: label, bold: true, size: 24 }),
            ],
            spacing: { before: 200, after: 100 },
          })
        );

        // Field content
        children.push(
          new Paragraph({
            children: [
              new TextRun({ text: value, size: 22 }),
            ],
            spacing: { after: 150 },
          })
        );
      }
    }
  }

  // Footer
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: `Generated: ${new Date().toLocaleDateString()}`,
          size: 18,
          italics: true,
          color: "666666"
        }),
      ],
      spacing: { before: 400 },
    })
  );

  // Create document
  const doc = new Document({
    sections: [{
      properties: {},
      children: children,
    }],
  });

  // Write file
  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync(outputPath, buffer);
  console.log(`Word document written to: ${outputPath}`);
}

main().catch(console.error);
