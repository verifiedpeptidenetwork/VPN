const fs = require('fs');
const path = 'C:\\Users\\Saidk\\OneDrive\\Desktop\\vpn\\index.html';
let content = fs.readFileSync(path, 'utf8');
console.log('Start length:', content.length);

// ============================================================
// FIX 1: Broken emoji U0001f3e5 -> 🏥
// ============================================================
if (content.includes('U0001f3e5')) {
  content = content.replace(/U0001f3e5/g, '🏥');
  console.log('FIX 1 OK: fixed broken hospital emoji');
} else {
  console.log('FIX 1: emoji already fine or not found');
}

// ============================================================
// Helper: remove the FIRST occurrence of a card within a section boundary
// ============================================================
function removeFirstInSection(html, sectionStartMarker, sectionEndMarker, cardSrcFilename) {
  const secStart = html.indexOf(sectionStartMarker);
  const secEnd = html.indexOf(sectionEndMarker, secStart);
  if (secStart === -1 || secEnd === -1) return { html, removed: false, msg: `section markers not found` };

  // Find a card div that contains this src filename
  // Card starts with opening div, ends after closing </div> of the card
  const srcMarker = `src="cheatsheet/${cardSrcFilename}"`;
  const srcPos = html.indexOf(srcMarker, secStart);
  if (srcPos === -1 || srcPos > secEnd) return { html, removed: false, msg: `card not found in section` };

  // Walk back to find the opening <div of this card (starts with 8 spaces + <div style="background:var(--card-bg)
  const cardOpen = '        <div style="background:var(--card-bg)';
  let cardStart = html.lastIndexOf(cardOpen, srcPos);
  if (cardStart === -1 || cardStart < secStart) return { html, removed: false, msg: `card opening not found` };

  // Walk forward to find closing </div> of card (the 3rd closing </div> after card start)
  let closeCount = 0;
  let pos = cardStart;
  while (pos < secEnd) {
    const openDiv = html.indexOf('<div', pos + 1);
    const closeDiv = html.indexOf('</div>', pos + 1);
    if (closeDiv === -1) break;
    if (openDiv !== -1 && openDiv < closeDiv) {
      closeCount++;
      pos = openDiv;
    } else {
      if (closeCount === 0) {
        // This is the final closing div
        const cardEnd = closeDiv + 6; // length of </div>
        html = html.slice(0, cardStart) + html.slice(cardEnd);
        return { html, removed: true, msg: `removed at ~pos ${cardStart}` };
      }
      closeCount--;
      pos = closeDiv;
    }
  }
  return { html, removed: false, msg: `could not find card end` };
}

// ============================================================
// FIX 2: Remove duplicate retatrutide-phase3 from Section 1 (keep only 1)
// ============================================================
const sec1Marker = '<!-- ── SECTION 1: GLP-1 · Weight Loss · Metabolic Peptides ──';
const sec1BMarker = '<!-- ── SECTION 1B: GLP-1 Health, Safety & Education ──';

// Count occurrences in Section 1
const s1Start = content.indexOf(sec1Marker);
const s1End = content.indexOf(sec1BMarker, s1Start);
const sec1Content = content.slice(s1Start, s1End);
const phase3Count = (sec1Content.match(/retatrutide-phase3\.png/g) || []).length / 3;
console.log(`retatrutide-phase3 in Section 1: ${phase3Count}x`);

if (phase3Count >= 2) {
  const r = removeFirstInSection(content, sec1Marker, sec1BMarker, 'retatrutide-phase3.png');
  content = r.html;
  console.log(`FIX 2: ${r.removed ? 'OK removed dup retatrutide-phase3 from Sec1' : 'FAIL - ' + r.msg}`);
}

// ============================================================
// FIX 3: Remove leftover health cards from Section 1 (they belong in 1B only)
// ============================================================
const healthCards = [
  'tirz-switch-from-reta.png',
  'sugar-cravings-tirz-reta.png',
  'when-to-eat-more-tirz-reta.png',
  'berberine-guide.png'
];

for (const card of healthCards) {
  // Check if card exists in Section 1
  const s1StartNow = content.indexOf(sec1Marker);
  const s1EndNow = content.indexOf(sec1BMarker, s1StartNow);
  const sec1Now = content.slice(s1StartNow, s1EndNow);
  if (sec1Now.includes(`cheatsheet/${card}`)) {
    const r = removeFirstInSection(content, sec1Marker, sec1BMarker, card);
    content = r.html;
    console.log(`FIX 3 - ${card}: ${r.removed ? 'OK removed from Sec1' : 'FAIL - ' + r.msg}`);
  } else {
    console.log(`FIX 3 - ${card}: not in Section 1, skipping`);
  }
}

// ============================================================
// FIX 4: Remove duplicate cards from Section 1B (keep only 1 of each)
// ============================================================
const sec2Marker = '<!-- ── SECTION 2: GH · Longevity · Mitochondrial ──';

for (const card of healthCards) {
  const s1BStartNow = content.indexOf(sec1BMarker);
  const s1BEndNow = content.indexOf(sec2Marker, s1BStartNow);
  const sec1BContent = content.slice(s1BStartNow, s1BEndNow);
  const countIn1B = (sec1BContent.match(new RegExp(`cheatsheet/${card.replace('.', '\\.')}`, 'g')) || []).length / 3;
  console.log(`  ${card} in Section 1B: ${countIn1B}x`);
  if (countIn1B >= 2) {
    const r = removeFirstInSection(content, sec1BMarker, sec2Marker, card);
    content = r.html;
    console.log(`  FIX 4 - removed 1 dup of ${card} from Sec1B: ${r.removed ? 'OK' : 'FAIL - ' + r.msg}`);
  }
}

// ============================================================
// FIX 5: Remove ca0705 (duplicate of glp-warning-signs) from Protocol Playbooks
// ============================================================
const sec7Marker = '<!-- ── SECTION 7:';
const afterSec7 = '<!-- CHEAT SHEETS VIEW';  // won't work, use a better end marker

// Just remove the ca0705 card entirely from anywhere in the vault
const ca0705Src = 'src="cheatsheet/ca0705c93f0fa93db1d3152f053bd7d6.png"';
const ca0705Pos = content.indexOf(ca0705Src);
if (ca0705Pos !== -1) {
  // Find the card start (go back to find <div style="background:var(--card-bg)
  const cardOpen = '        <div style="background:var(--card-bg)';
  const cardStart = content.lastIndexOf(cardOpen, ca0705Pos);
  if (cardStart !== -1) {
    // Find end of card
    let closeCount = 0;
    let pos = cardStart;
    let found = false;
    while (pos < ca0705Pos + 500) {
      const openDiv = content.indexOf('<div', pos + 1);
      const closeDiv = content.indexOf('</div>', pos + 1);
      if (closeDiv === -1) break;
      if (openDiv !== -1 && openDiv < closeDiv) {
        closeCount++;
        pos = openDiv;
      } else {
        if (closeCount === 0) {
          const cardEnd = closeDiv + 6;
          content = content.slice(0, cardStart) + content.slice(cardEnd);
          console.log('FIX 5 OK: removed ca0705 duplicate warning signs card');
          found = true;
          break;
        }
        closeCount--;
        pos = closeDiv;
      }
    }
    if (!found) console.log('FIX 5 FAIL: could not find card end for ca0705');
  }
} else {
  console.log('FIX 5: ca0705 not found (already removed?)');
}

// ============================================================
// FIX 6: Update Section 1 count to correct number
// ============================================================
// Count actual cards in Section 1 now
const s1FinalStart = content.indexOf(sec1Marker);
const s1FinalEnd = content.indexOf(sec1BMarker, s1FinalStart);
const sec1Final = content.slice(s1FinalStart, s1FinalEnd);
const actualCount1 = (sec1Final.match(/src="cheatsheet\//g) || []).length;
console.log(`\nSection 1 actual card count: ${actualCount1}`);

// Count actual cards in Section 1B now
const s1BFinalStart = content.indexOf(sec1BMarker);
const s1BFinalEnd = content.indexOf(sec2Marker, s1BFinalStart);
const sec1BFinal = content.slice(s1BFinalStart, s1BFinalEnd);
const actualCount1B = (sec1BFinal.match(/src="cheatsheet\//g) || []).length;
console.log(`Section 1B actual card count: ${actualCount1B}`);

// Update Section 1 count display
content = content.replace(
  `<span style="font-family:'Bebas Neue',sans-serif;font-size:0.85rem;color:rgba(255,45,120,0.7);flex-shrink:0;">▼ 9 SHEETS</span>`,
  `<span style="font-family:'Bebas Neue',sans-serif;font-size:0.85rem;color:rgba(255,45,120,0.7);flex-shrink:0;">▼ ${actualCount1} SHEETS</span>`
);
// Update Section 1B count display
content = content.replace(
  `<span style="font-family:'Bebas Neue',sans-serif;font-size:0.85rem;color:rgba(255,107,0,0.7);flex-shrink:0;">▼ 19 SHEETS</span>`,
  `<span style="font-family:'Bebas Neue',sans-serif;font-size:0.85rem;color:rgba(255,107,0,0.7);flex-shrink:0;">▼ ${actualCount1B} SHEETS</span>`
);

// Also fix Protocol Playbooks count (ca0705 removed = -1)
content = content.replace(
  `<span style="font-family:'Bebas Neue',sans-serif;font-size:0.85rem;color:rgba(255,45,120,0.7);flex-shrink:0;">▼ 4 SHEETS</span>`,
  `<span style="font-family:'Bebas Neue',sans-serif;font-size:0.85rem;color:rgba(255,45,120,0.7);flex-shrink:0;">▼ 3 SHEETS</span>`
);

fs.writeFileSync(path, content, 'utf8');
console.log('\nDone! Length:', content.length);

// Final section count report
const allCounts = content.match(/▼ \d+ SHEETS/g) || [];
console.log('Final section counts:', allCounts);
