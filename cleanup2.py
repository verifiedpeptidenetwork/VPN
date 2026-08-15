import sys, re
sys.stdout.reconfigure(encoding='utf-8')

with open('home.html', 'r', encoding='utf-8', errors='replace') as f:
    html = f.read()

changes = []

def remove_card_by_img(html, img_src, label):
    """Remove the card div that contains this image src."""
    pos = html.find(img_src)
    if pos == -1:
        print(f"  NOT FOUND: {img_src}")
        return html, False
    card_start = html.rfind('<div data-search=', 0, pos)
    if card_start == -1:
        card_start = html.rfind('<div', 0, pos - 100)
    i = card_start; depth = 0; card_end = -1
    while i < pos + 5000:
        if html[i:i+4] == '<div': depth += 1; i += 4
        elif html[i:i+6] == '</div>':
            depth -= 1
            if depth == 0: card_end = i + 6; break
            i += 6
        else: i += 1
    if card_end == -1:
        print(f"  COULD NOT FIND END: {img_src}")
        return html, False
    html = html[:card_start] + html[card_end:]
    print(f"  Removed: {label}")
    return html, True

# ── Remove cards for genuinely missing images ──
to_remove = [
    ('cheatsheet/guides-peptide-cheat-sheet-page2.jpg', 'Peptide Cheat Sheet Page 2'),
    ('cheatsheet/guides-peptide-cheat-sheet-page3.jpg', 'Peptide Cheat Sheet Page 3'),
    ('cheatsheet/guides-peptide-cheat-sheet-page4.jpg', 'Peptide Cheat Sheet Page 4'),
    ('cheatsheet/guides-peptide-cheat-sheet-page5.jpg', 'Peptide Cheat Sheet Page 5'),
    ('cheatsheet/guides-peptide-cheat-sheet-page6.jpg', 'Peptide Cheat Sheet Page 6'),
    ('dmso2.png', 'DMSO2 card'),
    # MOTSC SS31 SEQUENCE — user said remove as repeat
    ('cheatsheet/MOTSC%20SS31%20SEQUENCE.png', 'MOTSC SS31 SEQUENCE (repeat)'),
    ('cheatsheet/MOTSC SS31 SEQUENCE.png', 'MOTSC SS31 SEQUENCE (decoded, repeat)'),
]

print("REMOVALS:")
for img_src, label in to_remove:
    html, ok = remove_card_by_img(html, img_src, label)
    if ok:
        changes.append(f"Removed card: {label}")

# ── Remove the hash-named screenshot cards that look like app screenshots ──
# These are the Telegram/app screenshot cards identified earlier
# cheatsheet/79c1d2074b2b79e8861584a9bc8bed8f.png and cheatsheet/file_00000000ec007230bac2285eac156c3b.png
# may be app screenshots - check by searching for them in peptides section
for img_src, label in [
    ('cheatsheet/79c1d2074b2b79e8861584a9bc8bed8f.png', 'hash-named screenshot card 79c1d'),
    ('cheatsheet/file_00000000ec007230bac2285eac156c3b.png', 'hash-named file card ec007230'),
]:
    pos = html.find(img_src)
    if pos != -1:
        # Get the data-search to see if it's the app screenshot
        ds_pos = html.rfind('data-search=', 0, pos)
        ds = html[ds_pos:ds_pos+200]
        print(f"\n  Found {img_src}")
        print(f"  data-search: {ds[:150]}")

# ── Also search for any card with 'vpnpepdata' or Reconstitution Calculator screenshot ──
for kw in ['1000090390', 'cheatsheet/upload/1000090390']:
    pos = html.find(kw)
    if pos != -1:
        ds_pos = html.rfind('data-search=', 0, pos)
        ds = html[ds_pos:ds_pos+200]
        print(f"\n  Found {kw}: {ds[:200]}")

print()
print("SUMMARY:")
for c in changes:
    print(f"  ✓ {c}")

with open('home.html', 'w', encoding='utf-8') as f:
    f.write(html)
print(f"\nFile written. Size: {len(html):,} bytes")
