import sys, re
sys.stdout.reconfigure(encoding='utf-8')

with open('home.html', 'r', encoding='utf-8', errors='replace') as f:
    html = f.read()

changes = []

# ── 1. Add GLP safety infographic to START HERE dropdown (top of content) ──
glp_pos = html.find('<details id="glp-must-read"')
summary_end = html.find('</summary>', glp_pos) + len('</summary>')
content_div_pos = html.find('<div', summary_end)
closing_gt = html.find('>', content_div_pos) + 1

GLP_IMG_HTML = """

            <!-- GLP Safety Infographic — first thing visible in dropdown -->
            <div style="margin-top:0;margin-bottom:1.1rem;text-align:center;cursor:zoom-in;"
                 onclick="openLightbox('cheatsheet/glp-safety-ruleouts.png','GLP Medication Safety — Rule-Outs &amp; Cautions')">
              <img loading="lazy" src="cheatsheet/glp-safety-ruleouts.png"
                   alt="GLP Medication Safety: Important Rule-Outs and Cautions"
                   style="max-width:100%;border-radius:8px;border:1px solid rgba(255,0,128,0.4);box-shadow:0 0 20px rgba(255,0,128,0.2);"
                   title="Click to zoom">
            </div>
            <div style="margin-bottom:1rem;padding:0.75rem 1rem;background:rgba(0,0,0,0.35);border:1px solid rgba(255,165,0,0.3);border-left:4px solid #ff6b00;border-radius:6px;font-family:'Rajdhani',sans-serif;font-size:0.88rem;font-weight:600;color:rgba(255,220,180,0.95);line-height:1.7;">
              <div style="font-family:'Bebas Neue',sans-serif;font-size:1.05rem;letter-spacing:0.1em;color:#ff6b00;margin-bottom:0.5rem;">⚠ START HERE — CLEARING THE MYTHS</div>
              <b>Cancer:</b> GLP medications do not cause cancer. A rodent-specific study (supraphysiologic doses) does not translate to humans. No credible human data supports this fear.<br>
              <b>Pancreatitis:</b> GLP meds do not directly cause pancreatitis in most people — risk is about <em>pre-existing susceptibility</em> (gallstones, high triglycerides, alcohol). New severe upper belly pain going to the back = pause &amp; seek eval.<br>
              <b>Arrhythmias:</b> Some users notice elevated heart rate (mostly retatrutide). This is usually transient and dose-related — not a cardiac event. Monitor resting HR; titrate slowly. It is NOT the medication "damaging" your heart.<br>
              <b>Key:</b> These are rule-outs and cautions — not reasons to avoid. Understand who should avoid, watch the warning signs, and work with a provider who knows the research.
            </div>
"""

html = html[:closing_gt] + GLP_IMG_HTML + html[closing_gt:]
changes.append("Added GLP safety infographic + myth-busting text to START HERE dropdown")

# ── Recalculate positions after insertion ──
shift = len(GLP_IMG_HTML)

# ── 2. Remove Femme Fatale card from cs-sec-peptides, add to view-templates ──
femme_img = 'vanity-vault-femme-fatale-peptide-dosing.jpg'
fpos = html.find(femme_img)
if fpos != -1:
    card_start = html.rfind('<div data-search=', 0, fpos)
    i = card_start; depth = 0; card_end = -1
    while i < fpos + 3000:
        if html[i:i+4] == '<div': depth += 1; i += 4
        elif html[i:i+6] == '</div>':
            depth -= 1
            if depth == 0: card_end = i + 6; break
            i += 6
        else: i += 1
    if card_end != -1:
        femme_card_html = html[card_start:card_end]
        # Remove from current location
        html = html[:card_start] + html[card_end:]
        changes.append(f"Extracted Femme Fatale card from cs-sec-peptides ({len(femme_card_html)} chars)")
        # Insert into view-templates before </div><!-- /view-templates--> or just before the closing div of view-templates
        # Find a good insertion point in view-templates (before the last </div> that closes view-templates)
        vt_start = html.find('<div class="view" id="view-templates">')
        vt_end = html.find('<div class="view"', vt_start + 10)
        # Insert right before the grid area closes - find the last card-grid in templates
        grid_close = html.rfind('</div>', vt_start, vt_end)
        html = html[:grid_close] + '\n        ' + femme_card_html + '\n' + html[grid_close:]
        changes.append("Inserted Femme Fatale card into view-templates")

# ── 3. Remove Peach Bottle card ──
peach_img = 'skin-peach-bottle-fat-dissolving-injection.jpg'
ppos = html.find(peach_img)
if ppos != -1:
    card_start = html.rfind('<div data-search=', 0, ppos)
    i = card_start; depth = 0; card_end = -1
    while i < ppos + 3000:
        if html[i:i+4] == '<div': depth += 1; i += 4
        elif html[i:i+6] == '</div>':
            depth -= 1
            if depth == 0: card_end = i + 6; break
            i += 6
        else: i += 1
    if card_end != -1:
        html = html[:card_start] + html[card_end:]
        changes.append("Removed Peach Bottle card")

# ── 4. Remove Pine Bottle card ──
pine_img = 'skin-pine-bottle-lipolysis-solution.jpg'
ppos2 = html.find(pine_img)
if ppos2 != -1:
    card_start = html.rfind('<div data-search=', 0, ppos2)
    i = card_start; depth = 0; card_end = -1
    while i < ppos2 + 3000:
        if html[i:i+4] == '<div': depth += 1; i += 4
        elif html[i:i+6] == '</div>':
            depth -= 1
            if depth == 0: card_end = i + 6; break
            i += 6
        else: i += 1
    if card_end != -1:
        html = html[:card_start] + html[card_end:]
        changes.append("Removed Pine Bottle card")

# ── 5. Add retaleakygut.jpg card to cs-sec-reta (at end of section, before closing </details>) ──
if 'retaleakygut.jpg' not in html:
    reta_sec = html.find('<details id="cs-sec-reta"')
    if reta_sec != -1:
        # Find the grid container end - look for the closing div of the card grid
        # Find the last card data-search before the end of reta section
        # Scan for </details> at depth 1 from reta_sec
        i = reta_sec; depth = 0; reta_end = -1
        while i < reta_sec + 200000:
            if html[i:i+8] == '<details': depth += 1; i += 8
            elif html[i:i+9] == '</details':
                depth -= 1
                if depth == 0: reta_end = html.find('>', i); break
                i += 9
            else: i += 1
        if reta_end != -1:
            # Find the last </div> before </details>
            last_div_close = html.rfind('</div>', reta_sec, reta_end)
            RETA_CARD = """
        <div data-search="retatrutide leaky gut inflammation gut health peptide healing" style="background:var(--card-bg);border:1px solid var(--card-border);border-top:3px solid var(--neon-pink);overflow:hidden;">
          <div style="padding:0.6rem 1rem;border-bottom:1px solid var(--card-border);display:flex;justify-content:space-between;align-items:center;">
            <div style="font-family:'Bebas Neue',sans-serif;font-size:0.95rem;letter-spacing:0.08em;color:var(--neon-pink);">Retatrutide — Gut Healing &amp; Leaky Gut</div>
            <a href="retaleakygut.jpg" download style="font-family:'Bebas Neue',sans-serif;font-size:0.75rem;letter-spacing:0.06em;padding:0.2rem 0.6rem;border:1px solid var(--neon-pink);color:var(--neon-pink);text-decoration:none;background:rgba(0,0,0,0.3);">⬇ Save</a>
          </div>
          <div style="cursor:zoom-in;" onclick="openLightbox('retaleakygut.jpg','Retatrutide — Gut Healing &amp; Leaky Gut')">
            <img loading="lazy" src="retaleakygut.jpg" alt="Retatrutide — Gut Healing &amp; Leaky Gut" style="width:100%;display:block;object-fit:contain;" title="Click to zoom">
          </div>
        </div>"""
            html = html[:last_div_close + 6] + RETA_CARD + html[last_div_close + 6:]
            changes.append("Added retaleakygut.jpg card to cs-sec-reta")

# ── 6. Add parasitedieoff.png card to view-bonus if not in cheatsheets ──
# parasitedieoff.png is already somewhere in the HTML (confirmed at pos 634112)
# Check if it's in the bonus view
bonus_start = html.find('<div class="view" id="view-bonus">')
bonus_end = html.find('<div class="view"', bonus_start + 10) if bonus_start != -1 else -1
if bonus_start != -1 and 'parasitedieoff.png' not in html[bonus_start:bonus_end]:
    changes.append("parasitedieoff.png already exists elsewhere in HTML - skipped")
else:
    changes.append("parasitedieoff.png found in HTML (check it's in right place)")

with open('home.html', 'w', encoding='utf-8') as f:
    f.write(html)

print("CHANGES MADE:")
for c in changes:
    print(f"  ✓ {c}")
print(f"\nFile written. Total size: {len(html):,} bytes")
