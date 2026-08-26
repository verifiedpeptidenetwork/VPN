import sys, re
sys.stdout.reconfigure(encoding='utf-8')

with open('home.html', 'r', encoding='utf-8', errors='replace') as f:
    html = f.read()

changes = []

def find_div_end(html, start):
    """Find the closing </div> at depth 1 from start."""
    i = start; depth = 0
    while i < len(html):
        if html[i:i+4] == '<div': depth += 1; i += 4
        elif html[i:i+6] == '</div>':
            depth -= 1
            if depth == 0: return i + 6
            i += 6
        else: i += 1
    return -1

def extract_and_remove(html, start_marker, label):
    """Find the card div containing start_marker, extract and remove it."""
    pos = html.find(start_marker)
    if pos == -1:
        print(f'  NOT FOUND: {label}')
        return html, None
    card_start = html.rfind('<div', 0, pos)
    card_end = find_div_end(html, card_start)
    if card_end == -1:
        print(f'  Could not find end: {label}')
        return html, None
    card_html = html[card_start:card_end]
    html = html[:card_start] + html[card_end:]
    print(f'  Extracted ({len(card_html)} chars): {label}')
    return html, card_html

cs_start = html.find('<div class="view" id="view-cheatsheets">')
tg_start = html.find('<div class="view" id="view-quick-guide">')

# ── 1. Extract RETATRUTIDE REWARD SYSTEM dropdown from cheatsheets ──
# It's a larger block — find by its outer border-top div
ret_anchor = 'RETATRUTIDE &amp; THE REWARD SYSTEM'
ret_pos = html.find(ret_anchor, cs_start)
# Go back to find the outermost card wrapper
ret_card_start = html.rfind('<div style="', 0, ret_pos)
# Find a wider containing div (the one with border styling)
for i in range(ret_pos, ret_pos - 2000, -1):
    if html[i:i+12] == '<div style="' and ('border' in html[i:i+200] or 'background' in html[i:i+200]):
        ret_card_start = i
        break
ret_card_end = find_div_end(html, ret_card_start)
ret_card_html = html[ret_card_start:ret_card_end]
html = html[:ret_card_start] + html[ret_card_end:]
print(f'  Extracted RETATRUTIDE REWARD SYSTEM ({len(ret_card_html)} chars)')
changes.append('Moved RETATRUTIDE REWARD SYSTEM to T&G')

# ── 2. Extract GLP-1 AUTOIMMUNE dropdown from cheatsheets ──
glp_anchor = 'GLP-1 MEDICATIONS &amp; AUTOIMMUNE'
glp_pos = html.find(glp_anchor, cs_start)
glp_card_start = html.rfind('<div style="', 0, glp_pos)
for i in range(glp_pos, glp_pos - 2000, -1):
    if html[i:i+12] == '<div style="' and ('border' in html[i:i+200] or 'background' in html[i:i+200]):
        glp_card_start = i
        break
glp_card_end = find_div_end(html, glp_card_start)
glp_card_html = html[glp_card_start:glp_card_end]
html = html[:glp_card_start] + html[glp_card_end:]
print(f'  Extracted GLP-1 AUTOIMMUNE ({len(glp_card_html)} chars)')
changes.append('Moved GLP-1 AUTOIMMUNE/RHEUMATIC to T&G')

# ── 3. Insert both dropdowns into view-quick-guide (T&G) at end of its content ──
tg_start2 = html.find('<div class="view" id="view-quick-guide">')
tg_end2 = html.find('<div class="view"', tg_start2 + 10)
# Insert before the closing </div> of T&G
tg_close = html.rfind('</div>', tg_start2, tg_end2)
insert_html = '\n' + ret_card_html + '\n' + glp_card_html + '\n'
html = html[:tg_close] + insert_html + html[tg_close:]
print(f'  Inserted both dropdowns into T&G')

# ── 4. Extract Research Template card from cheatsheets → Labels & Templates ──
html, rt_card = extract_and_remove(html, 'RESEARCH%20TEMPLATE.png', 'Research Template')
if rt_card:
    # Make it a proper template card
    changes.append('Moved Research Template to Labels & Templates')
    # Insert into view-templates
    vt_start = html.find('<div class="view" id="view-templates">')
    i = vt_start; depth = 0
    while i < vt_start + 300000:
        if html[i:i+4] == '<div': depth += 1; i += 4
        elif html[i:i+6] == '</div>':
            depth -= 1
            if depth == 0: vt_close = i; break
            i += 6
        else: i += 1
    html = html[:vt_close] + '\n' + rt_card + '\n' + html[vt_close:]

# ── 5. Extract BPC-157 Killer Collection dosing card → Labels & Templates ──
html, bpc_card = extract_and_remove(html,
    'data-search="BPC-157 killer collection peptide doses',
    'BPC-157 Killer Collection dosing card')
if bpc_card:
    changes.append('Moved BPC-157 Killer Collection dosing to Labels & Templates')
    vt_start = html.find('<div class="view" id="view-templates">')
    i = vt_start; depth = 0
    while i < vt_start + 300000:
        if html[i:i+4] == '<div': depth += 1; i += 4
        elif html[i:i+6] == '</div>':
            depth -= 1
            if depth == 0: vt_close = i; break
            i += 6
        else: i += 1
    html = html[:vt_close] + '\n' + bpc_card + '\n' + html[vt_close:]

with open('home.html', 'w', encoding='utf-8') as f:
    f.write(html)

print('\nCHANGES:')
for c in changes:
    print(f'  ✓ {c}')
print(f'File size: {len(html):,}')
