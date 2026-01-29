# PDF Form Builder (JSON → AcroForm)

This project programmatically adds fillable AcroForm fields to an existing PDF
using a JSON-based coordinate mapping.

The goal is to separate **layout definition** from **execution logic**, allowing
PDF forms to be generated, updated, or versioned without manual editing.

---

## Problem

Manually creating or adjusting fillable PDF forms in Adobe Acrobat is:
- Time-consuming
- Error-prone
- Difficult to reproduce across versions

This tool automates that process by defining all field placement in JSON and
applying it programmatically.

---

## Approach

1. Measure field coordinates in Adobe Acrobat
2. Store field metadata (page, type, position, size) in `fields.json`
3. Run a Node.js script to inject AcroForm fields into the PDF

This keeps layout changes declarative and repeatable.

---

## Project Structure

pdf-form-builder/
├── add-fields.mjs      # Node script that applies fields to the PDF
├── fields.json         # JSON mapping of field coordinates and metadata
├── package.json        # Runtime configuration and dependencies
├── README.md
