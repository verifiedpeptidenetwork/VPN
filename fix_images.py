import re

with open('home.html', 'r', encoding='utf-8') as f:
    html = f.read()

# ══════════════════════════════════════════════════════════
# 1.  REMOVE everything the previous script added to bonus
# ══════════════════════════════════════════════════════════

# Helper: strip a block between two unique anchors
def remove_between(text, start_marker, end_marker):
    idx_s = text.find(start_marker)
    if idx_s == -1:
        print(f"  !! start marker not found: {start_marker[:60]}")
        return text
    idx_e = text.find(end_marker, idx_s)
    if idx_e == -1:
        print(f"  !! end marker not found: {end_marker[:60]}")
        return text
    return text[:idx_s] + text[idx_e:]

# Remove GLP Education section (added between Dr-Makis block and CANCER RESEARCH)
html = remove_between(html,
    '\n    <!-- GLP / TIRZEPATIDE EDUCATION -->',
    '\n    <!-- CANCER RESEARCH -->'
)
# Re-add the CANCER RESEARCH comment that was also removed
html = html.replace(
    '    <div style="display:flex;align-items:center;gap:1rem;margin-bottom:1.25rem;">\n      <div style="flex:1;height:1px;background:linear-gradient(90deg,transparent,rgba(255,45,120,0.4));"></div>\n      <div style="font-family:\'Bebas Neue\',sans-serif;font-size:1rem;letter-spacing:0.2em;color:var(--neon-pink);">🎗 CANCER RESEARCH</div>',
    '    <!-- CANCER RESEARCH -->\n    <div style="display:flex;align-items:center;gap:1rem;margin-bottom:1.25rem;">\n      <div style="flex:1;height:1px;background:linear-gradient(90deg,transparent,rgba(255,45,120,0.4));"></div>\n      <div style="font-family:\'Bebas Neue\',sans-serif;font-size:1rem;letter-spacing:0.2em;color:var(--neon-pink);">🎗 CANCER RESEARCH</div>',
    1
)

# Remove BPC cancer card (added before Dr. Makis YouTube in cancer section)
html = remove_between(html,
    '\n    <div data-search="BPC-157 cancer tumor growth hormone',
    '\n    <!-- Dr. Makis YouTube -->'
)
html = html.replace(
    '    <div style="background:#04141a;border:2px solid rgba(255,45,120',
    '    <!-- Dr. Makis YouTube -->\n    <div style="background:#04141a;border:2px solid rgba(255,45,120',
    1
)

# Remove supply/legal cards (added before ZINC section)
html = remove_between(html,
    '\n    <div data-search="chinese supply chain red flags',
    '\n    <!-- ZINC & ITS TYPES -->'
)

# Remove retaleakygut card (added before DR. ZELENKO)
html = remove_between(html,
    '\n    <div data-search="retatrutide leaky gut',
    '\n    <!-- DR. ZELENKO -->'
)

# Remove peptide education section (added before COVID RESEARCH)
html = remove_between(html,
    '\n    <!-- PEPTIDE EDUCATION IMAGES -->',
    '\n    <!-- COVID RESEARCH -->'
)

# Keep parasitedieoff in COVID area — already there, leave it.
print("✓ Bonus vault cleaned")

# ══════════════════════════════════════════════════════════
# 2.  ADD images into correct CHEAT SHEET sections
#     Images are in site root, so path = just the filename
# ══════════════════════════════════════════════════════════

def cs_card(filename, title, color):
    """Matching the exact card HTML format used in cheat sheet sections."""
    return (
        f'\n        <div data-search="{title} cheatsheet" '
        f'style="background:var(--card-bg);border:1px solid var(--card-border);'
        f'border-top:3px solid {color};overflow:hidden;">'
        f'\n          <div style="padding:0.6rem 1rem;border-bottom:1px solid var(--card-border);'
        f'display:flex;justify-content:space-between;align-items:center;">'
        f'\n            <div style="font-family:\'Bebas Neue\',sans-serif;font-size:0.95rem;'
        f'letter-spacing:0.08em;color:{color};">{title}</div>'
        f'\n            <a href="{filename}" download style="font-family:\'Bebas Neue\',sans-serif;'
        f'font-size:0.75rem;letter-spacing:0.06em;padding:0.2rem 0.6rem;border:1px solid {color};'
        f'color:{color};text-decoration:none;background:rgba(0,0,0,0.3);">⬇ Save</a>'
        f'\n          </div>'
        f'\n          <div style="cursor:zoom-in;" onclick="openLightbox(\'{filename}\',\'{title}\')">'
        f'\n            <img loading="lazy" src="{filename}" alt="{title}" '
        f'style="width:100%;display:block;object-fit:contain;" title="Click to zoom">'
        f'\n          </div>'
        f'\n        </div>'
    )

# The grid anchor we insert BEFORE (start of the dynamic grid inside each details block)
# Each section has: <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:0.85rem;">
# We insert our static cards right after that opening div tag IN THE CORRECT SECTION.
# Strategy: find the section <details id="cs-sec-XXX"> then find its grid div, insert there.

def insert_into_section(html, section_id, cards_html):
    """Insert cards_html right after the opening grid div inside section_id."""
    sec_start = html.find(f'id="{section_id}"')
    if sec_start == -1:
        print(f"  !! section not found: {section_id}")
        return html
    # Find the grid div after the section start
    grid_marker = '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:0.85rem;">'
    grid_pos = html.find(grid_marker, sec_start)
    if grid_pos == -1:
        print(f"  !! grid not found in {section_id}")
        return html
    insert_pos = grid_pos + len(grid_marker)
    return html[:insert_pos] + cards_html + html[insert_pos:]

# cs-sec-tirz: Tirzepatide deaths
html = insert_into_section(html, 'cs-sec-tirz',
    cs_card('whatcausedtirzdeath.jpg', 'What Caused Tirzepatide Deaths', 'var(--neon-pink)')
)

# cs-sec-glp1: GLP-1 education images
glp_cards = (
    cs_card('glp123.png',       'GLP-1 / GLP-2 / GLP-3 Explained',        '#ff6b00') +
    cs_card('carbfirst.jpg',    'Carbs First — GLP Blood Sugar Strategy',  '#ff6b00') +
    cs_card('saltnandbloat.png','Salt & Bloat on GLP-1 Medications',       '#ff6b00') +
    cs_card('obesityharm.png',  'Obesity Harm — The Data',                 '#ff6b00')
)
html = insert_into_section(html, 'cs-sec-glp1', glp_cards)

# cs-sec-peptides: peptide education images
pep_cards = (
    cs_card('peptideliferecon.jpg', 'Peptide Shelf Life & Reconstitution', '#cc44ff') +
    cs_card('peptidesynthetic.png', 'Synthetic Peptides — How They\'re Made', '#cc44ff') +
    cs_card('newkpv.png',           'KPV — The New Must-Know Peptide',     '#cc44ff') +
    cs_card('bpccancer.jpg',        'BPC-157 & Cancer / Growth — Know The Research', '#cc44ff')
)
html = insert_into_section(html, 'cs-sec-peptides', pep_cards)

# cs-sec-autoimmune: autoimmune peptides
html = insert_into_section(html, 'cs-sec-autoimmune',
    cs_card('autoimmunepeps.jpg', 'Autoimmune Peptides — Immune Modulation', '#00c8ff')
)

# cs-sec-recon: storing/mixing vials and print labels
recon_cards = (
    cs_card('storingvials.jpg',    'Storing Vials — Cold Chain & Preservation', 'var(--neon-orange)') +
    cs_card('printlabelsorder.png','Print Labels & Vial Order Guide',            'var(--neon-orange)')
)
html = insert_into_section(html, 'cs-sec-recon', recon_cards)

# cs-sec-vendors: Chinese supply red flags + legal
vendor_cards = (
    cs_card('chinesesupplyredflag.jpg', 'Chinese Supply Red Flags',           '#9d00ff') +
    cs_card('are peptides legal to sell.png', 'Are Peptides Legal To Sell?', '#9d00ff')
)
html = insert_into_section(html, 'cs-sec-vendors', vendor_cards)

print("✓ Cheat sheet cards inserted")

# ══════════════════════════════════════════════════════════
# 3.  BPC CANCER WARNING — site-wide note on BPC-157
#     Add a small callout near BPC-157 in the Peptide Index
# ══════════════════════════════════════════════════════════

BPC_WARNING = (
    '<div style="margin:0.45rem 0 0.3rem;background:rgba(255,45,120,0.08);'
    'border-left:3px solid var(--neon-pink);padding:0.45rem 0.75rem;'
    'font-family:\'Rajdhani\',sans-serif;font-size:0.8rem;font-weight:700;'
    'color:rgba(255,180,200,0.9);line-height:1.5;">'
    '⚠ <strong style="color:var(--neon-pink);">Cancer/Growth Note:</strong> '
    'Some research raises questions about BPC-157\'s role in angiogenesis and cell proliferation. '
    'If you have an active cancer diagnosis or family history, review the research and consult your oncologist. '
    'See <em>BPC-157 &amp; Cancer Research</em> in the Cheat Sheet Vault.'
    '</div>'
)

# Find BPC-157 entry in PEPTIDE_DATA rendered card - look for the pep-idx-card for BPC-157
# The peptide index card ID is pep-BPC157, body div id="pep-BPC157"
# Add warning inside the body div right after it opens
BPC_BODY_OPEN = 'id="pep-BPC157" class="pep-idx-body">'
pos = html.find(BPC_BODY_OPEN)
if pos != -1:
    insert_pos = pos + len(BPC_BODY_OPEN)
    html = html[:insert_pos] + '\n' + BPC_WARNING + html[insert_pos:]
    print("✓ BPC-157 cancer warning added to peptide index")
else:
    print("  !! BPC-157 peptide index body not found (may be JS-rendered)")

# Also add near BPC-157 in bonus guardian/larazotide text
BPC_BONUS_ANCHOR = 'BPC-157 + KPV + Larazotide = The Guardian Stack'
pos = html.find(BPC_BONUS_ANCHOR)
if pos != -1:
    html = html[:pos] + BPC_WARNING + html[pos:]
    print("✓ BPC-157 cancer warning added to bonus guardian stack mention")
else:
    print("  !! BPC bonus mention not found")

with open('home.html', 'w', encoding='utf-8') as f:
    f.write(html)

print("\nAll done.")
