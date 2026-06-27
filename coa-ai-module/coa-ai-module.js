/* ============================================================================
   COA DATABASE + AI EXTRACTOR — portable module
   Drop this file into any project. Works with EITHER Supabase OR Firebase —
   pick one in the CONFIG section below and delete/ignore the other.

   WHAT THIS GIVES YOU:
   1. A "reports" database where each row = one Certificate of Analysis (COA),
      identified by vendor + peptide/product + test type.
   2. Files are NEVER stored as base64 blobs in the database — only a
      Google Drive share link is stored. Keeps the DB tiny and fast.
   3. An AI extractor: send a COA image/PDF (as base64) to a serverless
      function, which calls an LLM server-side (key never touches the
      browser) and returns structured fields with confidence scores.
   4. Trust-but-verify merge logic: only auto-fill empty form fields with
      high-confidence AI values; flag conflicts instead of overwriting.

   REQUIRES (pick ONE):
   - Supabase:  <script src="https://unpkg.com/@supabase/supabase-js@2"></script>
   - Firebase:  <script type="module"> import the v10 modular SDK </script>
   ========================================================================== */


/* ============================================================================
   SECTION 1 — BACKEND CONFIG (pick Supabase OR Firebase)
   ========================================================================== */

// ---- OPTION A: SUPABASE (free tier, no credit card required) -----------
// Sign up at supabase.com -> New Project -> Settings -> API
// Copy the "Project URL" and the "anon / publishable" key (NOT the secret key)
const SUPA_URL = '';   // e.g. 'https://xxxxxxxx.supabase.co'
const SUPA_KEY = '';   // the PUBLISHABLE/anon key — safe to expose in browser

let supaClient = null;
function getSupaClient() {
  if (!supaClient && window.supabase && SUPA_URL && SUPA_KEY) {
    supaClient = window.supabase.createClient(SUPA_URL, SUPA_KEY);
  }
  return supaClient;
}

/* SQL to create the table in Supabase (run once in the SQL editor):

create table reports (
  id uuid default gen_random_uuid() primary key,
  vendor_id text not null,
  peptide text not null,
  test_type text not null,
  file_name text,
  drive_url text,
  lab text,
  batch text,
  notes text,
  cap_color text,
  metadata_source text default 'manual',
  ai_extraction jsonb,
  created_at timestamptz default now()
);

-- Allow public read + insert (tighten this later if you add auth):
alter table reports enable row level security;
create policy "public read" on reports for select using (true);
create policy "public insert" on reports for insert with check (true);
*/


// ---- OPTION B: FIREBASE (free Spark plan) -------------------------------
// Uncomment and fill in if using Firebase Firestore instead of Supabase.
// You already have a Firebase project if you copied this from the VPN site.
/*
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, query, orderBy } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "",
  authDomain: "",
  projectId: "",
  storageBucket: "",
  messagingSenderId: "",
  appId: ""
};
const fbApp = initializeApp(firebaseConfig);
const db = getFirestore(fbApp);
*/


/* ============================================================================
   SECTION 2 — GOOGLE DRIVE SHARE-LINK HELPERS
   The actual COA file (image/PDF) lives in a Google Drive folder shared as
   "Anyone with the link can view." Only the link is stored in the database.
   ========================================================================== */

// Convert any Drive share URL into an embeddable /preview URL
function normalizeDriveLink(url) {
  if (url.includes('/preview')) return url;
  const m = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (m) return 'https://drive.google.com/file/d/' + m[1] + '/preview';
  const m2 = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (m2) return 'https://drive.google.com/file/d/' + m2[1] + '/preview';
  return url;
}

// Validate that a pasted link is actually a Drive/Docs share link
function validateDriveLink(url) {
  return url.includes('drive.google.com') || url.includes('docs.google.com');
}

// Extract the Drive file ID from a share link (needed for thumbnail fetching)
function getDriveFileId(url) {
  const m = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  return m ? m[1] : null;
}

// Fetch a Drive file's thumbnail as a base64 data URL (for AI extraction input)
// Only works on files shared "Anyone with the link"
async function driveFileToDataUrl(fileId, sizePx) {
  const thumbUrl = `https://drive.google.com/thumbnail?id=${fileId}&sz=w${sizePx || 1200}`;
  const resp = await fetch(thumbUrl);
  if (!resp.ok) throw new Error('Drive thumbnail fetch failed — check file is shared "Anyone with link"');
  const blob = await resp.blob();
  return new Promise((resolve) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result);
    fr.readAsDataURL(blob);
  });
}

// (Optional) list every file in a public Drive folder — needs a free Drive API key
// console.cloud.google.com -> APIs & Services -> Credentials -> Create API Key
// Restrict the key to "Google Drive API" only.
const GDRIVE_API_KEY = ''; // optional, only needed for bulk folder scanning
async function listDriveFolderFiles(folderId) {
  const url = `https://www.googleapis.com/drive/v3/files?q='${folderId}'+in+parents&key=${GDRIVE_API_KEY}&fields=files(id,name,mimeType,webViewLink)&pageSize=200`;
  const resp = await fetch(url);
  const data = await resp.json();
  return data.files || [];
}


/* ============================================================================
   SECTION 3 — REPORT STORE (read/write the COA database)
   ========================================================================== */

// In-memory cache, keyed by "vendorId||peptide||testType" -> array of reports
const reportStore = {};

function storeKey(vendorId, peptide, testType) {
  return vendorId + '||' + peptide + '||' + testType;
}

// --- SUPABASE versions ---
async function loadReportsFromDB_supabase() {
  const client = getSupaClient();
  if (!client) return;
  const { data, error } = await client.from('reports').select('*').order('created_at', { ascending: true });
  if (error) { console.warn('Load error:', error.message); return; }
  data.forEach((row) => {
    const key = storeKey(row.vendor_id, row.peptide, row.test_type);
    (reportStore[key] ||= []).push({
      name: row.file_name,
      driveUrl: row.drive_url,
      lab: row.lab,
      batch: row.batch,
      notes: row.notes,
      capColor: row.cap_color || '',
      date: new Date(row.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      metadataSource: row.metadata_source || 'manual',
      aiExtraction: row.ai_extraction || null,
      dbId: row.id
    });
  });
}

async function saveReportToDB_supabase(vendorId, peptide, testType, report) {
  const client = getSupaClient();
  if (!client) return false;
  const { error } = await client.from('reports').insert([{
    vendor_id: vendorId,
    peptide: peptide,
    test_type: testType,
    file_name: report.name,
    drive_url: report.driveUrl,
    lab: report.lab,
    batch: report.batch,
    notes: report.notes,
    cap_color: report.capColor || null,
    metadata_source: report.metadataSource || 'manual',
    ai_extraction: report.aiExtraction || null
  }]);
  if (error) { console.warn('Save error:', error.message); return false; }
  return true;
}

// --- FIREBASE versions (uncomment if using Firebase instead) ---
/*
async function loadReportsFromDB_firebase() {
  const snap = await getDocs(query(collection(db, 'reports'), orderBy('createdAt', 'asc')));
  snap.forEach((doc) => {
    const row = doc.data();
    const key = storeKey(row.vendorId, row.peptide, row.testType);
    (reportStore[key] ||= []).push({ ...row, dbId: doc.id });
  });
}

async function saveReportToDB_firebase(vendorId, peptide, testType, report) {
  await addDoc(collection(db, 'reports'), {
    vendorId, peptide, testType,
    fileName: report.name,
    driveUrl: report.driveUrl,
    lab: report.lab,
    batch: report.batch,
    notes: report.notes,
    capColor: report.capColor || null,
    metadataSource: report.metadataSource || 'manual',
    aiExtraction: report.aiExtraction || null,
    createdAt: new Date()
  });
}
*/

// Pick whichever backend you configured above:
const loadReportsFromDB = loadReportsFromDB_supabase;
const saveReportToDB = saveReportToDB_supabase;


/* ============================================================================
   SECTION 4 — AI EXTRACTOR (server-side LLM call, key never in browser)
   ========================================================================== */

// Point this at YOUR serverless function (Supabase Edge Function, Firebase
// Cloud Function, Cloudflare Worker, Vercel Function — any of them work).
// The function receives { fileData, mediaType } and must return JSON matching
// the EXTRACTION_PROMPT schema below. See the included edge-function
// template (extract-coa-function.js) for a ready-to-deploy example.
const AI_EXTRACT_ENDPOINT = ''; // e.g. 'https://xxxx.supabase.co/functions/v1/extract-coa'

// This is the exact prompt structure that makes extraction reliable:
// - forces a fixed JSON schema (easy to parse, no free text)
// - forces confidence + source_text per field (lets you build trust-but-verify UI)
// - explicitly forbids guessing — single most important line for accuracy
const EXTRACTION_PROMPT = `You are a precise document parser for Certificates of Analysis (COA) in the pharmaceutical/research peptide industry.

Extract ONLY what is explicitly visible in the document. Do NOT infer, guess, or fill in missing information.

Return a JSON object with exactly these fields:
{
  "vendor_name":   { "value": "", "confidence": 0.0, "source_text": "" },
  "product_name":  { "value": "", "confidence": 0.0, "source_text": "" },
  "batch_number":  { "value": "", "confidence": 0.0, "source_text": "" },
  "testing_date":  { "value": "", "confidence": 0.0, "source_text": "" },
  "lab_name":      { "value": "", "confidence": 0.0, "source_text": "" },
  "lab_contact":   { "value": "", "confidence": 0.0, "source_text": "" },
  "sample_id":     { "value": "", "confidence": 0.0, "source_text": "" },
  "compound_name": { "value": "", "confidence": 0.0, "source_text": "" },
  "purity_result": { "value": "", "confidence": 0.0, "source_text": "" },
  "test_type":     { "value": "", "confidence": 0.0, "source_text": "" },
  "verify_code":   { "value": "", "confidence": 0.0, "source_text": "" }
}

Rules:
- confidence: 0.0 = not found, 0.5 = possibly found but unclear, 0.9+ = clearly visible
- source_text: copy the exact text from the document that led to this extraction
- For dates: convert to YYYY-MM-DD if possible, otherwise preserve as-is
- For batch/lot numbers: preserve exact capitalization and punctuation
- For lab names: only extract if clearly labeled as a laboratory or testing facility
- If a field is not clearly present, set value to "" and confidence to 0.0
- Return ONLY the JSON object, no explanation or surrounding text`;

async function extractFieldsFromFile(dataUrl) {
  const mediaType = dataUrl.split(';')[0].split(':')[1];
  const base64Data = dataUrl.split(',')[1];

  const resp = await fetch(AI_EXTRACT_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + SUPA_KEY,   // if using Supabase Edge Functions
      'apikey': SUPA_KEY
    },
    body: JSON.stringify({ fileData: base64Data, mediaType: mediaType })
  });

  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error('Extraction server error ' + resp.status + ': ' + errText.substring(0, 300));
  }
  const data = await resp.json();
  if (data.error) throw new Error(data.error);
  return data;
}


/* ============================================================================
   SECTION 5 — TRUST-BUT-VERIFY MERGE LOGIC
   Use these to wire AI suggestions into your own form, without ever
   silently overwriting something the user already typed.
   ========================================================================== */

// Call this once you have an extraction result, to auto-fill EMPTY fields only.
// formFieldMap example: [{ aiKey: 'batch_number', formId: 'modal-batch' }, ...]
function autoFillEmptyFields(result, formFieldMap) {
  const applied = {};
  formFieldMap.forEach((f) => {
    const field = result[f.aiKey];
    if (!field || !field.value || field.confidence < 0.5) return;
    const input = document.getElementById(f.formId);
    if (!input || input.value.trim()) return; // never overwrite a filled field
    input.value = field.value;
    applied[f.aiKey] = 'prefilled';
  });
  return applied;
}

// Call this when the user clicks "Use AI" on a conflicting field.
function acceptSuggestion(formId, value) {
  const input = document.getElementById(formId);
  if (input) input.value = value;
}

// Confidence -> simple bucket for styling (high/med/low)
function confidenceBucket(confidence) {
  if (confidence >= 0.8) return 'high';
  if (confidence >= 0.55) return 'med';
  return 'low';
}


/* ============================================================================
   EXPORTS (if using as an ES module — otherwise everything above is global)
   ========================================================================== */
// export {
//   normalizeDriveLink, validateDriveLink, getDriveFileId, driveFileToDataUrl, listDriveFolderFiles,
//   reportStore, storeKey, loadReportsFromDB, saveReportToDB,
//   extractFieldsFromFile, EXTRACTION_PROMPT,
//   autoFillEmptyFields, acceptSuggestion, confidenceBucket
// };
