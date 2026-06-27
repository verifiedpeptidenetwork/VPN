/* ============================================================================
   extract-coa-function.js
   Deploy this as a SUPABASE EDGE FUNCTION (Deno runtime). This is the
   server-side piece that actually calls the AI model — your model API key
   lives ONLY here, in an environment variable, never in the browser.

   DEPLOY STEPS (Supabase, free tier):
   1. Install the Supabase CLI: npm install -g supabase
   2. supabase login
   3. supabase functions new extract-coa
   4. Replace the generated index.ts with this file (rename to .ts is fine,
      this is plain JS/TS-compatible syntax)
   5. Set your AI provider key as a secret (never commit it):
        supabase secrets set GEMINI_API_KEY=your_key_here
      (or ANTHROPIC_API_KEY / OPENAI_API_KEY — see the fetch call below)
   6. supabase functions deploy extract-coa
   7. Your endpoint becomes:
        https://<project>.supabase.co/functions/v1/extract-coa
      Put that URL into AI_EXTRACT_ENDPOINT in coa-ai-module.js

   This template uses Google Gemini (gemini-1.5-flash) because it has a
   generous free tier and accepts images directly. Swap the fetch() body
   for Anthropic or OpenAI if you prefer — both also accept images.
   ========================================================================== */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  try {
    const { fileData, mediaType } = await req.json();
    if (!fileData) {
      return new Response(JSON.stringify({ error: 'Missing fileData' }), {
        status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
      });
    }

    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    const model = 'gemini-1.5-flash';
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;

    const geminiResp = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: EXTRACTION_PROMPT },
            { inline_data: { mime_type: mediaType || 'image/jpeg', data: fileData } }
          ]
        }],
        generationConfig: { temperature: 0, responseMimeType: 'application/json' }
      })
    });

    if (!geminiResp.ok) {
      const errText = await geminiResp.text();
      throw new Error('Gemini API error: ' + errText.substring(0, 300));
    }

    const geminiData = await geminiResp.json();
    const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '{}';

    // Gemini sometimes wraps JSON in markdown fences — strip them defensively
    const cleaned = rawText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(cleaned);

    return new Response(JSON.stringify(parsed), {
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
    });

  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
    });
  }
});

/* ----------------------------------------------------------------------------
   ALTERNATIVE: swap the fetch() above for Anthropic Claude instead of Gemini.
   Claude also has image support and a free trial credit (not an ongoing
   free tier, so Gemini is the better default for $0 long-term cost).

   const anthropicResp = await fetch('https://api.anthropic.com/v1/messages', {
     method: 'POST',
     headers: {
       'x-api-key': Deno.env.get('ANTHROPIC_API_KEY'),
       'anthropic-version': '2023-06-01',
       'content-type': 'application/json'
     },
     body: JSON.stringify({
       model: 'claude-3-5-haiku-20241022',
       max_tokens: 1024,
       messages: [{
         role: 'user',
         content: [
           { type: 'text', text: EXTRACTION_PROMPT },
           { type: 'image', source: { type: 'base64', media_type: mediaType, data: fileData } }
         ]
       }]
     })
   });
   const anthropicData = await anthropicResp.json();
   const rawText = anthropicData.content[0].text;
---------------------------------------------------------------------------- */
