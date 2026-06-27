# COA Database + AI Extractor — Portable Module

Drag this whole `coa-ai-module` folder into any project. Two files:

- **`coa-ai-module.js`** — drop into your page with a `<script src="coa-ai-module.js"></script>` tag (after loading the Supabase or Firebase SDK). Handles the database read/write, Google Drive link helpers, and the trust-but-verify merge logic for AI suggestions.
- **`extract-coa-function.js`** — deploy this separately as a serverless function (Supabase Edge Function by default). This is the only piece that touches your AI API key, and it never runs in the browser.

## Is this free?

Yes, fully free for a small/medium project:
- **Supabase**: free tier, no credit card. Postgres DB + Edge Functions included.
- **Google Gemini API** (used inside the edge function): generous free tier, no cost for moderate volume.
- **Google Drive**: free storage for the actual COA files — you just need a folder shared "Anyone with the link."

You don't need Firebase at all, but if you'd rather reuse a Firebase project you already have, `coa-ai-module.js` has a commented-out Firebase version of the load/save functions — just uncomment and fill in your config, same free-tier deal.

## Setup checklist

1. **Database**
   - Create a free Supabase project at supabase.com
   - Run the SQL in the comment block at the top of `coa-ai-module.js` (Section 1) to create the `reports` table
   - Copy your Project URL + anon/publishable key into `SUPA_URL` / `SUPA_KEY`

2. **AI extractor**
   - Get a free Gemini API key at aistudio.google.com/apikey
   - Install the Supabase CLI, then deploy `extract-coa-function.js` as an Edge Function (steps are in the comment header of that file)
   - Set the key as a secret: `supabase secrets set GEMINI_API_KEY=...` — never hardcode it
   - Copy the deployed function URL into `AI_EXTRACT_ENDPOINT` in `coa-ai-module.js`

3. **Google Drive storage**
   - Create a folder in Google Drive, share it as "Anyone with the link can view"
   - Upload your COA files there manually (or build an upload flow — not included here, this module assumes you paste/store the share link)
   - Use `normalizeDriveLink()` to convert any share link into an embeddable preview URL before storing it

4. **Wire it into your form**
   - Read a file as a data URL (`FileReader.readAsDataURL`), call `extractFieldsFromFile(dataUrl)`
   - Call `autoFillEmptyFields(result, yourFieldMap)` to prefill empty inputs only
   - For conflicting fields (user already typed something different), show a manual "Use AI" button that calls `acceptSuggestion(formId, value)`

## Why it's built this way

- **No base64 in the database** — only a Drive link is stored, keeping every row tiny and queries fast.
- **AI key never reaches the browser** — only the serverless function holds it, as an environment secret.
- **Confidence + source_text per field** — lets you auto-fill safely (high confidence + empty field only) while always giving a human a way to verify or override before anything is saved permanently.
- **Composite key lookup** (`vendorId||peptide||testType`) — instant grouped retrieval without per-category queries, useful any time you have a many-to-many "entity has many typed documents" structure (not just COAs — works for any document-per-category system).
