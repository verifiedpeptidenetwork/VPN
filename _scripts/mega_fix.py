import sys, re
sys.stdout.reconfigure(encoding='utf-8')

with open('home.html', 'r', encoding='utf-8', errors='replace') as f:
    html = f.read()

changes = []

# ── 1. Remove images from inject arrays (deletions — NOT moving to templates) ──
inject_removals = [
    'img_49.jpg',    # GLP-1 Guide 43 — ATX-304/semaglutide study
    'img_108.jpg',   # Injection Technique Guide 3 — product images
    'img_50.jpg',    # Injection Technique Guide 48 — ATX-304 MASLD study
    'img_101.jpg',   # Reconstitution Guide 2 — wrong image
]

# ── 2. Move from inject arrays → templates ──
# (title, img_file, already_in_templates)
inject_to_templates = [
    ('RUIC — Reta Unfiltered Inner Circle Label',      'img_154.jpg', False),
    ("I'll Be BAC — Bacteriostatic Water Label 1",     'img_129.jpg', False),
    ("I'll Be BAC — Bacteriostatic Water Label 2",     'img_131.jpg', False),
    ('Captain Pin It — BAC Water Label',               'img_135.jpg', False),
    ('Pin & Pray — Research Label 1',                  'img_144.jpg', False),
    ('Pin & Pray — Research Label 2',                  'img_145.jpg', False),
    # Vendor Testing Guides 2-7 — already in templates, just remove from inject
    ('World of PepCraft — Vial Label',                 'img_121.jpg', True),
    ('Pretty in PiNiK — Research Poster 1',            'img_142.jpg', True),
    ('Pretty in PIN-K — Research Poster 2',            'img_143.jpg', True),
    ('Peptide PIN-cess — Poke-Ahontas Label',          'img_146.jpg', True),
    ('Peptide PIN-cess RiPINzel — Label',              'img_147.jpg', True),
    ('VPN Research — Vial Label',                      'img_153.jpg', True),
    # Blood Work & Labs Guides 4 and 5
    ('Stab Labs Killer Collection — Label Set',        'img_109.jpg', False),
    ('BioShell Labs — Research Label',                 'img_125.jpg', False),
]

# All img files to remove from inject arrays
all_inject_remove = inject_removals + [img for _, img, _ in inject_to_templates]

# Find inject script block
inject_start = html.rfind('<script>', 0, html.find('inject('))
inject_end = html.find('</script>', inject_start) + 9
script_block = html[inject_start:inject_end]

removed = 0
for img in all_inject_remove:
    before = len(script_block)
    script_block = re.sub(r"'" + re.escape(img) + r"',?\s*", '', script_block)
    if len(script_block) < before:
        removed += 1
        changes.append(f'Removed {img} from inject array')
    else:
        print(f'  NOT in inject arrays: {img}')

html = html[:inject_start] + script_block + html[inject_end:]
print(f'{removed} images removed from inject arrays')

# ── 3. Remove ATX-304 static HTML card from cheatsheets ──
atx_pos = html.find('data-search="GLP-1 vs ATX304')
if atx_pos != -1:
    i = atx_pos; depth = 0; card_end = -1
    while i < atx_pos + 5000:
        if html[i:i+4] == '<div': depth += 1; i += 4
        elif html[i:i+6] == '</div>':
            depth -= 1
            if depth == 0: card_end = i + 6; break
            i += 6
        else: i += 1
    if card_end != -1:
        html = html[:atx_pos] + html[card_end:]
        changes.append('Removed ATX-304 static card from cheatsheets')

# ── 4. Add new template cards to view-templates ──
def make_card(title, img_file):
    p = f'cheatsheet/upload/{img_file}'
    return f'''      <div data-search="{title.lower()} vial label peptide template" style="background:var(--card-bg);border:1px solid var(--card-border);border-top:3px solid var(--neon-pink);overflow:hidden;">
        <div style="padding:0.6rem 1rem;border-bottom:1px solid var(--card-border);display:flex;justify-content:space-between;align-items:center;">
          <div style="font-family:'Bebas Neue',sans-serif;font-size:0.95rem;letter-spacing:0.08em;color:var(--neon-pink);">{title}</div>
          <a href="{p}" download="{img_file}" style="font-family:'Bebas Neue',sans-serif;font-size:0.75rem;letter-spacing:0.06em;padding:0.2rem 0.6rem;border:1px solid var(--neon-pink);color:var(--neon-pink);text-decoration:none;background:rgba(0,0,0,0.3);">⬇ Save</a>
        </div>
        <div style="cursor:zoom-in;" onclick="openLightbox('{p}','{title}')">
          <img loading="lazy" src="{p}" alt="{title}" style="width:100%;display:block;object-fit:contain;" title="Click to zoom">
        </div>
      </div>'''

new_cards = [make_card(t, img) for t, img, already in inject_to_templates if not already]

# Insert before <!-- BLOOD WORK -->
insert_marker = '<!-- BLOOD WORK -->'
insert_pos = html.find(insert_marker)
if insert_pos != -1 and new_cards:
    cards_html = '\n' + '\n'.join(new_cards) + '\n'
    html = html[:insert_pos] + cards_html + html[insert_pos:]
    changes.append(f'Added {len(new_cards)} new cards to Labels & Templates')

with open('home.html', 'w', encoding='utf-8') as f:
    f.write(html)

print('\nCHANGES:')
for c in changes:
    print(f'  ✓ {c}')
print(f'\nFile size: {len(html):,} bytes')
