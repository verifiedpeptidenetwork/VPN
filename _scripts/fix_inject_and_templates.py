import sys, re
sys.stdout.reconfigure(encoding='utf-8')

with open('home.html', 'r', encoding='utf-8', errors='replace') as f:
    html = f.read()

# ── Images to REMOVE entirely (screenshots, repeats) ──
removals = [
    'img_107.jpg',   # Peptide Research Guide 33 — Telegram app screenshot
    'img_298.jpg',   # Injection Technique Guide 53 — Skool pricing screenshot
    'img_84.jpg',    # Stack & Longevity Guide 6 — SS-31/MOTS-c/NAD+ dosing repeat
    'img_93.jpg',    # Stack & Longevity Guide 7 — GlowRilla phone screenshot
]

# ── Images to MOVE from inject arrays → view-templates ──
# (title, filename)
label_moves = [
    # Peptide Research Guide 1, 2, 30
    ('Killer Collection — Vial Label Series',         'img_111.jpg'),
    ('Killer Collection — Full Label Set',            'img_114.jpg'),
    ('Willy Wonka — Peptide Label Series',            'img_124.jpg'),
    # GLP-1 Weight Loss Guide 2-5
    ('PokeMe-Mon — GLP-1 Vial Labels',               'img_128.jpg'),
    ('Femme Fatale — GLP-1 Label Series',            'img_136.jpg'),
    ("Victoria's Secret — GLP-1 Vial Labels",        'img_140.jpg'),
    ('Pretty in PINK-i — GLP-1 Label Series',        'img_141.jpg'),
    # Injection Technique Guide 5-9
    ('Peptide Rangers — Label Set 1',                'img_110.jpg'),
    ('Peptide Rangers — Label Set 2',                'img_112.jpg'),
    ('Peptide Rangers — Label Set 3',                'img_113.jpg'),
    ('Killer Collection — Label Poster',             'img_115.jpg'),
    ('Peptide Rangers — Pen Case Labels',            'img_116.jpg'),
    # Injection Technique Guide 12-13
    ('BAC to the Future — Vial Label',               'img_120.jpg'),
    ('Harry Poker — Vial Label',                     'img_123.jpg'),
    # Injection Technique Guide 15-21
    ('Back to the BAC — Vial Label',                 'img_132.jpg'),
    ('World of PepCraft — Vial Label',               'img_133.jpg'),
    ('Vial Label Template Series 17',                'img_134.jpg'),
    ('Vial Label Template Series 18',                'img_137.jpg'),
    ('Vial Label Template Series 19',                'img_139.jpg'),
    ('Vial Label Template Series 20',                'img_148.jpg'),
    ('Vial Label Template Series 21',                'img_152.jpg'),
    # Injection Technique Guide 69
    ('VPN / Wrex / Dino — Vial Label',              'img_66.jpg'),
    # Reconstitution Guide 3-9
    ('Pokenator — Reconstitution Label',             'img_119.jpg'),
    ('PokeMan — Reconstitution Label',               'img_122.jpg'),
    ('Pokebusters — Reconstitution Label',           'img_126.jpg'),
    ('PepZule — Reconstitution Label',               'img_127.jpg'),
    ('Breaking BAC — Vial Label',                    'img_130.jpg'),
    ('Pink PEPTIDE — Vial Labels',                   'img_138.jpg'),
    ('Fellowship of Peptides — Vial Label',          'img_151.jpg'),
]

all_to_remove_from_inject = removals + [f for _, f in label_moves]

# ── Step 1: Remove images from ALL inject() arrays ──
# Find the script block
script_start = html.rfind('<script>', 0, html.find('inject('))
script_end = html.find('</script>', script_start) + 9
script_block = html[script_start:script_end]

removed_count = 0
for img in all_to_remove_from_inject:
    # Remove "'img_X.jpg'," or "'img_X.jpg'" (with or without trailing comma)
    before = len(script_block)
    script_block = re.sub(r"'(?:cheatsheet/upload/)?" + re.escape(img) + r"',?\s*", '', script_block)
    if len(script_block) < before:
        removed_count += 1
        print(f"  Removed {img} from inject array")
    else:
        print(f"  NOT FOUND in inject arrays: {img}")

html = html[:script_start] + script_block + html[script_end:]
print(f"\n{removed_count} images removed from inject arrays\n")

# ── Step 2: Add label template cards to view-templates ──
# Build card HTML for each moved image
# Check which img files already exist on disk
import os
upload_dir = os.path.join(os.getcwd(), 'cheatsheet', 'upload')

def make_template_card(title, img_file):
    p = f'cheatsheet/upload/{img_file}'
    slug = title.lower().replace(' ', '-').replace('/', '-').replace("'", '').replace('—', '').replace(',', '')
    search = title.lower()
    return f'''      <div data-search="{search} vial label peptide template" style="background:var(--card-bg);border:1px solid var(--card-border);border-top:3px solid var(--neon-pink);overflow:hidden;">
        <div style="padding:0.6rem 1rem;border-bottom:1px solid var(--card-border);display:flex;justify-content:space-between;align-items:center;">
          <div style="font-family:'Bebas Neue',sans-serif;font-size:0.95rem;letter-spacing:0.08em;color:var(--neon-pink);">{title}</div>
          <a href="{p}" download="{img_file}" style="font-family:'Bebas Neue',sans-serif;font-size:0.75rem;letter-spacing:0.06em;padding:0.2rem 0.6rem;border:1px solid var(--neon-pink);color:var(--neon-pink);text-decoration:none;background:rgba(0,0,0,0.3);">⬇ Save</a>
        </div>
        <div style="cursor:zoom-in;" onclick="openLightbox('{p}','{title}')">
          <img loading="lazy" src="{p}" alt="{title}" style="width:100%;display:block;object-fit:contain;" title="Click to zoom">
        </div>
      </div>'''

# Find view-templates end insertion point — right before <!-- BLOOD WORK -->
vt_insert_marker = '<!-- BLOOD WORK -->'
vt_insert_pos = html.find(vt_insert_marker)
if vt_insert_pos == -1:
    print("ERROR: Could not find <!-- BLOOD WORK --> insertion point")
else:
    cards_html = '\n' + '\n'.join(make_template_card(title, img) for title, img in label_moves) + '\n'
    html = html[:vt_insert_pos] + cards_html + html[vt_insert_pos:]
    print(f"Added {len(label_moves)} label template cards to view-templates")

with open('home.html', 'w', encoding='utf-8') as f:
    f.write(html)

print(f"\nDone. File size: {len(html):,} bytes")
