#!/usr/bin/env node
/**
 * Live Step 6 calibration runner.
 *
 * Makes exactly three Anthropic calls and prints comparisons. It does not load
 * the Apps Script sheet/mail persistence path and does not write results.
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const P2 = path.join(__dirname, '..');
const REQUIRED = [
  ['fintech', '--fintech'],
  ['qiwam', '--qiwam'],
  ['startupFair', '--startup-fair']
];

function usage() {
  return [
    'Usage:',
    '  ANTHROPIC_API_KEY=... node phase-2-review/test-harness/run-live-calibration.js \\',
    '    --fintech /path/to/fintech.pdf \\',
    '    --qiwam /path/to/qiwam.pdf \\',
    '    --startup-fair /path/to/startup-fair.pdf',
    '',
    'Accepted inputs: PDF, DOC/DOCX/RTF, Markdown, and plain text.'
  ].join('\n');
}

function parseArgs(argv) {
  if (argv.indexOf('--help') !== -1 || argv.indexOf('-h') !== -1) return { help: true };
  const out = {};
  for (let i = 0; i < argv.length; i += 2) {
    const flag = argv[i], value = argv[i + 1];
    const entry = REQUIRED.filter(pair => pair[1] === flag)[0];
    if (!entry || !value) throw new Error('Unknown or incomplete argument: ' + (flag || '(empty)'));
    out[entry[0]] = value;
  }
  REQUIRED.forEach(([key, flag]) => {
    if (!out[key]) throw new Error('Missing required argument: ' + flag);
  });
  return out;
}

function proposalText(file) {
  const absolute = path.resolve(file);
  if (!fs.existsSync(absolute)) throw new Error('Proposal file not found: ' + absolute);
  const extension = path.extname(absolute).toLowerCase();
  if (extension === '.pdf') {
    return execFileSync('pdftotext', [absolute, '-'], { encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 });
  }
  if (extension === '.doc' || extension === '.docx' || extension === '.rtf') {
    return execFileSync('textutil', ['-convert', 'txt', '-stdout', absolute],
                        { encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 });
  }
  return fs.readFileSync(absolute, 'utf8');
}

function calibrationRuntime() {
  const files = ['config.gs', 'rubric.gs', 'figures.gs', 'scoring.gs', 'calibration.gs'];
  const source = files.map(file => fs.readFileSync(path.join(P2, file), 'utf8')).join('\n');
  return new Function('Logger', source + '\nreturn {' +
    'order: SCORING_CALIBRATION_ORDER,' +
    'request: calibrationRequest_,' +
    'result: calibrationCaseResult_,' +
    'format: formatScoringCalibration_' +
    '};')({ log() {} });
}

async function callAnthropic(payload, apiKey) {
  let lastError = '';
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt) await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'server-side-fallback-2026-07-01'
      },
      body: JSON.stringify(payload)
    });
    const body = await response.text();
    if (response.status === 200) return JSON.parse(body);
    lastError = 'HTTP ' + response.status + ': ' + body.slice(0, 400);
    if (response.status !== 429 && response.status < 500) break;
  }
  throw new Error('Anthropic request failed after retries. ' + lastError);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) { console.log(usage()); return; }
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not set in the environment.');

  const proposals = {
    fintech: { name: 'فنتك', text: proposalText(args.fintech) },
    qiwam: { name: 'قِوام', text: proposalText(args.qiwam) },
    startupFair: { name: 'StartUp Fair', text: proposalText(args.startupFair) }
  };
  const runtime = calibrationRuntime();
  const cases = [];
  for (const key of runtime.order) {
    const request = runtime.request(key, proposals);
    const response = await callAnthropic(request.payload, apiKey);
    cases.push(runtime.result(key, request, response));
  }
  console.log(runtime.format(cases));
}

if (require.main === module) {
  main().catch(error => {
    console.error('Calibration aborted: ' + error.message);
    process.exit(1);
  });
}

module.exports = { parseArgs, proposalText, calibrationRuntime, callAnthropic };
