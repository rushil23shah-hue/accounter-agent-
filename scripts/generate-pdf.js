import { execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const edge = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const chrome = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const browser = fs.existsSync(chrome) ? chrome : edge;

const cwd = process.cwd();
const html = path.join(cwd, 'steward-specification.html');
const pdf = path.join(cwd, 'STEWARD_2.0_MASTER_SPECIFICATION.pdf');

console.log(`Generating PDF using: ${browser}`);
console.log(`Input HTML: ${html}`);
console.log(`Output PDF: ${pdf}`);

try {
  execFileSync(browser, [
    '--headless',
    '--disable-gpu',
    '--no-pdf-header-footer',
    `--print-to-pdf=${pdf}`,
    `file:///${html.replace(/\\/g, '/')}`
  ]);

  if (fs.existsSync(pdf)) {
    const stats = fs.statSync(pdf);
    console.log(`✅ SUCCESS! PDF created: ${pdf} (${stats.size} bytes)`);
  } else {
    console.error('❌ PDF file was not created.');
  }
} catch (err) {
  console.error('Error generating PDF:', err);
}
