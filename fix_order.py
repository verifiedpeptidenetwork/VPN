import re

with open('home.html', 'r', encoding='utf-8') as f:
    html = f.read()

def find_details_end(text, start):
    i = start
    depth = 0
    while i < len(text):
        if text[i:i+8] == '<details':
            depth += 1
            i += 8
        elif text[i:i+9] == '</details':
            depth -= 1
            if depth == 0:
                end = text.find('>', i) + 1
                if end < len(text) and text[end] == '\n':
                    end += 1
                return end
            i += 9
        else:
            i += 1
    return -1

def extract_section(text, sec_id, search_from=0):
    marker = f'<details id="{sec_id}"'
    pos = text.find(marker, search_from)
    if pos == -1:
        return None, -1, -1
    end = find_details_end(text, pos)
    if end == -1:
        return None, -1, -1
    return text[pos:end], pos, end

cs_start = html.find('<div class="view" id="view-cheatsheets">')
print(f"Cheat sheets view starts at: {cs_start}")

# Collect all cs-sec-* within cheatsheets view and record them
all_cs = re.findall(r'<details id="(cs-sec-[^"]+)"', html[cs_start:])
print(f"cs-sec-* found in cheatsheets: {all_cs}")

# Step 1: Remove ALL cs-sec-* blocks from cheatsheets, saving their content
# We'll keep them in order EXCEPT we want glp1 first, myths second
sections = {}
search_from = cs_start
order = []
while True:
    m = re.search(r'<details id="(cs-sec-[^"]+)"', html[search_from:])
    if not m:
        break
    sec_id = m.group(1)
    abs_pos = search_from + m.start()
    content, s, e = extract_section(html, sec_id, abs_pos)
    if content is None:
        break
    if sec_id not in sections:
        sections[sec_id] = content
        order.append(sec_id)
        print(f"  Saved {sec_id} ({len(content)} chars)")
    else:
        print(f"  Skipping duplicate {sec_id}")
    search_from = e

print(f"\nTotal unique sections: {len(sections)}")

# Step 2: Remove all cs-sec-* from cheatsheets view
# Find their current positions (they may have shifted - re-search)
# Use reverse order of first occurrence
found_positions = []
pos = cs_start
while True:
    m = re.search(r'<details id="cs-sec-[^"]*"', html[pos:])
    if not m:
        break
    abs_pos = pos + m.start()
    sec_id = re.search(r'id="(cs-sec-[^"]*)"', m.group()).group(1)
    end = find_details_end(html, abs_pos)
    if end == -1:
        break
    found_positions.append((abs_pos, end))
    pos = end

print(f"Removing {len(found_positions)} blocks from cheatsheets")
for s, e in sorted(found_positions, reverse=True):
    html = html[:s] + html[e:]

# Step 3: Build the ordered list (glp1 first, myths second, rest in original order)
desired_order = ['cs-sec-glp1', 'cs-sec-myths']
rest = [s for s in order if s not in desired_order]
final_order = [s for s in desired_order if s in sections] + rest
print(f"Final order: {final_order[:5]}... ({len(final_order)} total)")

# Step 4: Insert all sections into cheatsheets view
# Find insertion point: after the action bar / controls area, before end of view
# Use the marker just after the download button area
cs_start2 = html.find('<div class="view" id="view-cheatsheets">')
# Find the end of the controls (after OPEN ALL / CLOSE ALL / DOWNLOAD buttons)
# Look for the search input area or first </div> that closes controls
# Simple approach: find <!-- end controls --> or just insert before next view
# Use end of the cs-action-bar or the JUMP TO SECTION button
insert_anchor = html.find('</div><!-- /cs-cat-panel -->', cs_start2)
if insert_anchor == -1:
    # Try to find after the filter tag buttons
    insert_anchor = html.find('data-filter="all"', cs_start2)
    if insert_anchor != -1:
        # Find the end of that line's container
        insert_anchor = html.find('</div>', insert_anchor) + 6
        while html[insert_anchor:insert_anchor+1] in ('\n',):
            insert_anchor += 1
    else:
        # Just find next </div> after "DOWNLOAD ALL SHEETS" button
        dl_pos = html.find('DOWNLOAD ALL SHEETS', cs_start2)
        insert_anchor = html.find('</div>', dl_pos) + 6

print(f"Insertion point: {insert_anchor}")

insert_text = '\n' + ''.join(sections[s] for s in final_order)
html = html[:insert_anchor] + insert_text + html[insert_anchor:]
print(f"Inserted {len(insert_text)} chars")

with open('home.html', 'w', encoding='utf-8') as f:
    f.write(html)
print("Done!")
