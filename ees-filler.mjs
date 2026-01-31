#!/usr/bin/env node
/**
 * EES (Evaluation Entry System) Browser Automation
 *
 * Workflow:
 * 1. Opens browser to EES
 * 2. You login with CAC
 * 3. Navigate to NCOER entry
 * 4. Press Enter in terminal to fill fields
 *
 * Usage:
 *   node ees-filler.mjs --fields fields-enriched.json
 *   node ees-filler.mjs --fields fields-enriched.json --url "https://ees.hrc.army.mil"
 */

import { chromium } from "playwright";
import fs from "fs";
import readline from "readline";

// EES URL - update if different
const DEFAULT_EES_URL = "https://evaluations.hrc.army.mil/";

// Map our field names to EES form selectors (from actual EES inspection)
const FIELD_MAPPING = {
  // Part 1 - Administrative Data (from EES)
  part1_name: { selector: '#ratedOfficer\\.lastNm', type: 'text' },  // Last name only - EES has separate fields
  part1_rank: { selector: '#ratedOfficer\\.rankAb', type: 'text' },
  part1_pmosc: { selector: '#ratedOfficer\\.mosDsgTx', type: 'text' },
  part1_organization: { selector: '#ratedOfficer\\.unitDsgTx, #ratedOfficer\\.currOrgDsgTx', type: 'text' },
  part1_periodFrom: { selector: '#evalPdStDt', type: 'text' },
  part1_periodThru: { selector: '#ratedOfficer\\.milSepDt', type: 'text' },
  part1_uic: { selector: '#ratedOfficer\\.uicCd', type: 'text' },

  // Additional Part 1 fields from EES
  ees_firstName: { selector: '#ratedOfficer\\.firstNm', type: 'text' },
  ees_middleName: { selector: '#ratedOfficer\\.middleNm', type: 'text' },
  ees_dutyTitle: { selector: '#ratedOfficer\\.dutyTitleTx', type: 'text' },
  ees_dutyStation: { selector: '#ratedOfficer\\.dutyStationNm', type: 'text' },
  ees_email: { selector: '#ratedOfficer\\.govtEmailAddrTx', type: 'text' },
  ees_zipCode: { selector: '#ratedOfficer\\.addrZipCd', type: 'text' },

  // Part 3 - Duty Description (need to find on Part 3 page)
  part3_dailyDuties: { selector: 'textarea[name*="dailyDuties"], textarea[name*="dutyDesc"], #dutyDescCmtTx', type: 'textarea' },
  part3_specialEmphasis: { selector: 'textarea[name*="emphasis"], textarea[name*="specEmph"], #specEmphCmtTx', type: 'textarea' },
  part3_appointedDuties: { selector: 'textarea[name*="appointed"], #apptdDutyCmtTx', type: 'textarea' },

  // Part 4 - Performance Evaluation (need to find on Part 4 page)
  part4_ptComments: { selector: 'textarea[name*="physTrng"], textarea[name*="apft"], #physTrngCmtTx', type: 'textarea' },
  part4_cComments: { selector: 'textarea[name*="character"], #charCmtTx', type: 'textarea' },
  part4_dComments: { selector: 'textarea[name*="presence"], #presCmtTx', type: 'textarea' },
  part4_eComments: { selector: 'textarea[name*="intellect"], #intCmtTx', type: 'textarea' },
  part4_fComments: { selector: 'textarea[name*="leads"], #leadsCmtTx', type: 'textarea' },
  part4_gComments: { selector: 'textarea[name*="develops"], #devCmtTx', type: 'textarea' },
  part4_hComments: { selector: 'textarea[name*="achieves"], #achvCmtTx', type: 'textarea' },
  part4_jComments: { selector: 'textarea[name*="overall"], #overallCmtTx, #overallPotential\\.cmtTx', type: 'textarea' },

  // Part 5 - Senior Rater
  part5_bComments: { selector: 'textarea[name*="srPotential"], #srPotentialCmtTx, #overallPotential\\.cmtTx', type: 'textarea' },
};

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    fieldsPath: 'fields-enriched.json',
    url: DEFAULT_EES_URL,
    headless: false,
    debug: false,
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--fields':
      case '-f':
        options.fieldsPath = args[++i];
        break;
      case '--url':
      case '-u':
        options.url = args[++i];
        break;
      case '--headless':
        options.headless = true;
        break;
      case '--debug':
        options.debug = true;
        break;
      case '--help':
      case '-h':
        console.log(`
EES NCOER Form Filler

Usage: node ees-filler.mjs [options]

Options:
  --fields, -f <path>   Path to enriched fields JSON (default: fields-enriched.json)
  --url, -u <url>       EES URL (default: ${DEFAULT_EES_URL})
  --debug               Show debug information
  --help, -h            Show this help
        `);
        process.exit(0);
    }
  }

  return options;
}

function loadFields(path) {
  const data = fs.readFileSync(path, 'utf8');
  const fields = JSON.parse(data);

  // Convert array to map by name
  const fieldMap = {};
  for (const field of fields) {
    if (field.value) {
      fieldMap[field.name] = field.value;
    }
  }
  return fieldMap;
}

function question(prompt) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

async function fillField(page, fieldName, value, mapping, debug) {
  if (!mapping) {
    if (debug) console.log(`  [SKIP] No mapping for: ${fieldName}`);
    return false;
  }

  const selectors = mapping.selector.split(', ');

  for (const selector of selectors) {
    try {
      const element = await page.$(selector.trim());
      if (element) {
        await element.click();
        await element.fill('');
        await element.fill(value);
        console.log(`  [OK] ${fieldName}: filled with ${value.length} chars`);
        return true;
      }
    } catch (e) {
      // Try next selector
    }
  }

  if (debug) {
    console.log(`  [MISS] ${fieldName}: no matching element found`);
  }
  return false;
}

async function inspectPage(page) {
  console.log('\n--- Page Inspection ---');

  // Find all input fields
  const inputs = await page.$$eval('input[type="text"], input:not([type])', els =>
    els.map(el => ({
      tag: 'input',
      name: el.name,
      id: el.id,
      placeholder: el.placeholder,
    })).filter(e => e.name || e.id)
  );

  // Find all textareas
  const textareas = await page.$$eval('textarea', els =>
    els.map(el => ({
      tag: 'textarea',
      name: el.name,
      id: el.id,
    })).filter(e => e.name || e.id)
  );

  // Find all selects
  const selects = await page.$$eval('select', els =>
    els.map(el => ({
      tag: 'select',
      name: el.name,
      id: el.id,
    })).filter(e => e.name || e.id)
  );

  console.log('\nInput fields:');
  inputs.forEach(f => console.log(`  <input name="${f.name}" id="${f.id}">`));

  console.log('\nTextareas:');
  textareas.forEach(f => console.log(`  <textarea name="${f.name}" id="${f.id}">`));

  console.log('\nSelects:');
  selects.forEach(f => console.log(`  <select name="${f.name}" id="${f.id}">`));

  console.log('--- End Inspection ---\n');
}

async function main() {
  const options = parseArgs();

  console.log('EES NCOER Form Filler');
  console.log('=====================\n');

  // Load field data
  let fieldData;
  try {
    fieldData = loadFields(options.fieldsPath);
    console.log(`Loaded ${Object.keys(fieldData).length} fields from ${options.fieldsPath}`);
  } catch (e) {
    console.error(`Error loading fields: ${e.message}`);
    process.exit(1);
  }

  // Launch browser
  console.log('\nLaunching browser...');
  const browser = await chromium.launch({
    headless: options.headless,
    slowMo: 50, // Slow down for visibility
  });

  const context = await browser.newContext({
    viewport: { width: 1400, height: 900 },
  });

  const page = await context.newPage();

  // Navigate to EES
  console.log(`Navigating to: ${options.url}`);
  try {
    await page.goto(options.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
  } catch (e) {
    console.log(`Note: Page load timeout (CAC login may be required)`);
  }

  console.log('\n========================================');
  console.log('BROWSER IS OPEN');
  console.log('========================================');
  console.log('\n1. Complete CAC login in the browser');
  console.log('2. Navigate to the NCOER entry form');
  console.log('3. Come back here and press ENTER to fill fields');
  console.log('\nCommands:');
  console.log('  [Enter]  - Fill form fields');
  console.log('  i        - Inspect page for form elements');
  console.log('  q        - Quit');
  console.log('');

  // Interactive loop
  while (true) {
    const input = await question('\nReady? (Enter=fill, i=inspect, q=quit): ');

    if (input.toLowerCase() === 'q') {
      console.log('Closing browser...');
      break;
    }

    if (input.toLowerCase() === 'i') {
      await inspectPage(page);
      continue;
    }

    // Fill fields
    console.log('\nFilling form fields...');
    let filled = 0;
    let skipped = 0;

    for (const [fieldName, value] of Object.entries(fieldData)) {
      const mapping = FIELD_MAPPING[fieldName];
      const success = await fillField(page, fieldName, value, mapping, options.debug);
      if (success) filled++;
      else skipped++;
    }

    console.log(`\nDone: ${filled} filled, ${skipped} skipped`);
    console.log('Review the form in the browser, then press Enter to fill again or q to quit');
  }

  await browser.close();
  console.log('Done.');
}

main().catch(console.error);
