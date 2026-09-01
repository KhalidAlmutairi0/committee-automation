# Masar web preview

Arabic RTL web application for the Future Technology Club project-management
committee. This branch replaces the Google Sheets/Forms user experience with a
self-hosted Next.js website.

## Run locally

```bash
cd web
npm install
npm run dev
```

Open <http://localhost:3000>. If that port is occupied, Next.js prints the
available port it selected.

## Current preview scope

- Team project intake and size classification
- Timeline entry, unlimited preparatory activities, and T1–T7 results
- Proposal upload gate and receipt wording
- Committee dashboard and editable lead-review screen
- Explicit model-off state; no Anthropic or other model endpoint is contacted

All named projects, counts, excerpts, and scores shown in the interface are
clearly marked demonstration data. They are not governance values or committee
decisions.

The preview currently keeps interactive changes in browser state. Persistent
storage, authentication, email delivery, file storage, and the future
self-hosted scoring adapter belong to the deployment phase and are not implied
by this visual preview.
