with open('home.html', 'r', encoding='utf-8') as f:
    html = f.read()

def find_div_block_end(text, start):
    """Find the end of a <div> block starting at or after 'start'."""
    div_start = text.find('<div', start)
    if div_start == -1:
        return -1
    i = div_start
    depth = 0
    while i < len(text):
        if text[i:i+4] == '<div':
            depth += 1
            i += 4
        elif text[i:i+6] == '</div':
            depth -= 1
            if depth == 0:
                return text.find('>', i) + 1
            i += 6
        else:
            i += 1
    return -1

def find_details_block_end(text, start):
    """Find the end of a <details> block starting at 'start'."""
    i = start
    depth = 0
    while i < len(text):
        if text[i:i+8] == '<details':
            depth += 1
            i += 8
        elif text[i:i+9] == '</details':
            depth -= 1
            if depth == 0:
                return text.find('>', i) + 1
            i += 9
        else:
            i += 1
    return -1

# ── 1. Extract REWARD CARD (comment + div block in cs-sec-glp1)
reward_comment = '        <!-- RETA + REWARD RECEPTOR / ADDICTION -->'
r1_start = html.find(reward_comment)
r1_end = find_div_block_end(html, r1_start)
reward_block = html[r1_start:r1_end]
print(f"Reward block: {r1_start}→{r1_end} ({len(reward_block)} chars)")

# ── 2. Extract AUTOIMMUNE CARD (comment + div block, immediately after reward)
auto_comment = '        <!-- GLP-1 RHEUMATISM & AUTOIMMUNE -->'
r2_start = html.find(auto_comment, r1_end - 10)
r2_end = find_div_block_end(html, r2_start)
auto_block = html[r2_start:r2_end]
print(f"Autoimmune block: {r2_start}→{r2_end} ({len(auto_block)} chars)")

# ── 3. Extract MYTHS SECTION (full <details id="cs-sec-myths"> block)
m_start = html.find('  <details id="cs-sec-myths"')
m_end = find_details_block_end(html, m_start)
myths_block = html[m_start:m_end]
print(f"Myths block: {m_start}→{m_end} ({len(myths_block)} chars)")

# ── Remove all three from their current positions (highest index first)
blocks = sorted([
    (r1_start, r1_end, '\n'),
    (r2_start, r2_end, '\n'),
    (m_start,  m_end,  '\n'),
], key=lambda x: x[0], reverse=True)

for s, e, repl in blocks:
    html = html[:s] + repl + html[e:]

print("Removed all three from cheat sheets.")

# ── Find insertion point in Tools & Guides (view-quick-guide)
# Insert just before <!-- WORKOUTS VIEW --> which ends the T&G view
tg_end_marker = '<!-- WORKOUTS VIEW -->'
insert_pos = html.find(tg_end_marker)
if insert_pos == -1:
    raise ValueError("Cannot find T&G end marker")

# Build the T&G wrapper blocks for the two cards
# They need to match the T&G how-to guide style
card_wrapper_open = '''
  <!-- ══ MYTHS, REWARD & AUTOIMMUNE — MOVED FROM CHEAT SHEETS ══ -->
  <div style="margin:0 auto;max-width:860px;width:100%;padding:0 1rem;box-sizing:border-box;">
'''
card_wrapper_close = '''  </div>
'''

# Myths section: convert from cs-sec (details/summary) to a styled section
# We'll keep it as-is but wrap it in a T&G style container with a heading
myths_tg = '''
    <div style="margin-bottom:1.5rem;">
      <div style="font-family:'Bebas Neue',sans-serif;font-size:1.1rem;letter-spacing:0.2em;color:#dc64ff;margin-bottom:0.75rem;padding-bottom:0.4rem;border-bottom:1px solid rgba(220,100,255,0.3);">🚫 MYTHS, MISCONCEPTIONS &amp; HARD QUESTIONS</div>
''' + myths_block.strip() + '''
    </div>
'''

reward_tg = '\n    <div style="margin-bottom:1.5rem;">\n      <div style="font-family:\'Bebas Neue\',sans-serif;font-size:1.1rem;letter-spacing:0.2em;color:#9d00ff;margin-bottom:0.75rem;padding-bottom:0.4rem;border-bottom:1px solid rgba(157,0,255,0.3);">🧠 RETATRUTIDE &amp; THE REWARD SYSTEM</div>\n' + reward_block.strip() + '\n    </div>\n'

auto_tg = '\n    <div style="margin-bottom:1.5rem;">\n      <div style="font-family:\'Bebas Neue\',sans-serif;font-size:1.1rem;letter-spacing:0.2em;color:#00c8ff;margin-bottom:0.75rem;padding-bottom:0.4rem;border-bottom:1px solid rgba(0,200,255,0.3);">🦴 GLP-1 &amp; AUTOIMMUNE / RHEUMATIC DISEASE</div>\n' + auto_block.strip() + '\n    </div>\n'

insert_block = card_wrapper_open + myths_tg + reward_tg + auto_tg + card_wrapper_close

html = html[:insert_pos] + insert_block + html[insert_pos:]
print("Inserted into Tools & Guides.")

with open('home.html', 'w', encoding='utf-8') as f:
    f.write(html)

print("Done.")
