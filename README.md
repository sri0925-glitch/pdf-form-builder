# PDF Form Builder (JSON → AcroForm)

Programmatically adds fillable AcroForm fields to an existing PDF using a JSON coordinate map.

## Why

Manually creating/adjusting fillable fields in Adobe Acrobat is slow and hard to reproduce. This repo makes form layouts declarative and versionable.

## Quick start

1) Install dependencies:

   `npm install`

2) Inspect PDF page sizes (useful for coordinate work):

   `npm run inspect -- --input input.pdf`

3) Build a fillable PDF (with debug boxes for alignment):

   `npm run build -- --input input.pdf --fields fields.json --output output_fillable.pdf --debug`

## Coordinates

- Units are **PDF points** (72 points = 1 inch)
- **X** is always from the **left**
- **Y** depends on how you measured it:
  - If you measured from the **bottom** (PDF native / pdf-lib), use the default: `--coords bottom-left`
  - If you measured from the **top** (common in UI tools), use: `--coords top-left`

## `fields.json` format

`fields.json` is a JSON array of field objects.

Required keys:
- `page` (1-based)
- `name` (unique field name)
- `type` (`text` or `checkbox`)
- `x`, `y`, `w`, `h` (numbers; points)

Optional keys:
- `origin` (`bottom-left` or `top-left`) per-field override
- `tooltip`, `value`, `fontSize`, `multiline`, `maxLength`, `required`, `readOnly`, `checked`

## Project files

- `add-fields.mjs` — CLI that injects fields into a PDF
- `fields.json` — your field map
- `fields.schema.json` — optional schema for VS Code JSON validation/completions
