# Masar website

Arabic RTL production website for the Future Technology Club project-management committee.

## Included

- Team and committee accounts with database-backed sessions
- Project intake and size classification
- Timeline storage and T1–T7 checks
- Proposal upload gate and private file storage
- Manual rubric review with criterion 6 deliberately disabled
- Lead-only final feedback through an SMTP outbox
- PostgreSQL migrations and Cranl-compatible start commands

No model provider is connected. The website never guesses missing governance values.

## Local setup

Copy `.env.example` to `.env.local`, provide PostgreSQL and bootstrap-admin values, then run:

```bash
npm install
npm run db:setup
npm run dev
```

SMTP is optional for browsing and manual review, but final delivery remains locked until all SMTP variables are configured.

## Verification

From the repository root:

```bash
npm test
npm run build
node phase-2-review/test-harness/run.js
```
