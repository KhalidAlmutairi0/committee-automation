# Live calibration for Step 6

The normal 116-fixture suite makes **no real Anthropic requests**. The dedicated
calibration command below makes exactly three live requests using the production
prompt, tool schema, response validation, and rubric logic.

It does not write to Sheets, change proposal state, send email, or decide whether
a disagreement is a defect. Criterion 6 is always shown as skipped until the
central figures sheet is approved.

## Run

Keep the API key outside the repository, then run:

```bash
node phase-2-review/test-harness/run-live-calibration.js \
  --fintech /path/to/fintech.pdf \
  --qiwam /path/to/qiwam.pdf \
  --startup-fair /path/to/startup-fair.pdf
```

The process requires `ANTHROPIC_API_KEY` in its environment. Inputs may be PDF,
DOC/DOCX/RTF, Markdown, or plain text. PDF extraction uses `pdftotext`; Office
document extraction uses macOS `textutil`.

For every criterion the output prints expected and model scores. Every mismatch
also prints the model's evidence quote. A mismatch is deliberately not marked as
a test failure: the committee decides whether the prompt or calibration table
needs correction.

The same core can run inside Apps Script by calling:

```javascript
runScoringCalibration({
  fintech: { name: 'فنتك', text: fintechText },
  qiwam: { name: 'قِوام', text: qiwamText },
  startupFair: { name: 'StartUp Fair', text: startupFairText }
});
```

Without a second argument, that function uses the real `callAnthropic_` path and
prints the report through `Logger.log`.
