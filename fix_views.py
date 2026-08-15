import re

with open('home.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Boundaries
tg_start = html.find('<div class="view" id="view-quick-guide">')
cs_start = html.find('<div class="view" id="view-cheatsheets">')
print(f"T&G view starts: {tg_start}")
print(f"Cheat sheets view starts: {cs_start}")

# Find all cs-sec-* <details> blocks inside view-quick-guide (between tg_start and cs_start)
tg_region = html[tg_start:cs_start]

# Find every <details id="cs-sec-..."> inside T&G
pattern = re.compile(r'<details id="cs-sec-[^"]*"')
matches = list(pattern.finditer(tg_region))
print(f"Found {len(matches)} cs-sec-* blocks inside T&G")
for m in matches:
    print(f"  {m.group()} at offset {m.start()} (absolute: {tg_start + m.start()})")

def find_details_end(text, start):
    """Find closing </details> for the <details> block starting at or after 'start'."""
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

# Extract all cs-sec-* blocks from T&G (collect as (abs_start, abs_end, content))
blocks = []
for m in matches:
    abs_start = tg_start + m.start()
    # eat any leading whitespace/newlines before this block
    # find actual start including leading newline
    lead_start = abs_start
    # also eat preceding newlines
    while lead_start > 0 and html[lead_start-1] in ('\n', ' ', '\t'):
        lead_start -= 1
    lead_start += 1  # keep one newline separator

    abs_end = find_details_end(html, abs_start)
    if abs_end == -1:
        print(f"  !! Could not find end for block at {abs_start}")
        continue
    # eat trailing newline
    if abs_end < len(html) and html[abs_end] == '\n':
        abs_end += 1
    content = html[abs_start:abs_end]
    blocks.append((abs_start, abs_end, content))
    print(f"  Extracted {len(content)} chars ending at {abs_end}")

if not blocks:
    print("No blocks to move!")
    exit()

# Remove all blocks from T&G region (highest position first to avoid index shifts)
for abs_start, abs_end, content in sorted(blocks, key=lambda x: x[0], reverse=True):
    html = html[:abs_start] + html[abs_end:]
    print(f"Removed block from {abs_start} to {abs_end}")

# Now find insertion point in view-cheatsheets: right before the first existing cs-sec-*
# OR right after the action bar (OPEN ALL / CLOSE ALL buttons area)
# Find the OPEN ALL / CLOSE ALL / DOWNLOAD button block end as insertion anchor
# Use the search bar wrapper or the filter-tags line as anchor
insert_marker = '<!-- CHEAT SHEET SECTIONS -->'
if insert_marker not in html:
    # Find view-cheatsheets and insert the blocks right before the existing cs-sec-glp1
    cs_view_start = html.find('<div class="view" id="view-cheatsheets">')
    existing_cs = html.find('  <details id="cs-sec-', cs_view_start)
    if existing_cs == -1:
        # find any cs-sec
        existing_cs = html.find('<details id="cs-sec-', cs_view_start)
    if existing_cs == -1:
        print("!! Cannot find insertion point in view-cheatsheets")
        exit()
    print(f"Will insert {len(blocks)} blocks before line at pos {existing_cs}")
    insert_pos = existing_cs
else:
    insert_pos = html.find(insert_marker)

# Build insertion text: all extracted blocks joined
# Order them by their original position (already in order since we iterated forward)
insert_text = '\n'.join(content for _, _, content in blocks) + '\n'

html = html[:insert_pos] + insert_text + html[insert_pos:]
print(f"Inserted {len(insert_text)} chars of cheat sheet sections into view-cheatsheets")

with open('home.html', 'w', encoding='utf-8') as f:
    f.write(html)
print("Done!")
