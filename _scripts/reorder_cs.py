import re

with open('home.html', 'r', encoding='utf-8') as f:
    html = f.read()

def extract_section(text, sec_id):
    """Extract a <details id="sec_id"...>...</details> block."""
    start_marker = f'  <details id="{sec_id}"'
    start = text.find(start_marker)
    if start == -1:
        raise ValueError(f"Section not found: {sec_id}")
    # Find the closing </details> that matches this opening
    depth = 0
    i = start
    while i < len(text):
        if text[i:i+8] == '<details':
            depth += 1
            i += 8
        elif text[i:i+9] == '</details':
            depth -= 1
            if depth == 0:
                end = text.find('>', i) + 1
                return text[start:end], start, end
            i += 9
        else:
            i += 1
    raise ValueError(f"Could not find closing </details> for {sec_id}")

# Extract both sections with their positions
glp1_html, glp1_start, glp1_end = extract_section(html, 'cs-sec-glp1')
myths_html, myths_start, myths_end = extract_section(html, 'cs-sec-myths')

print(f"cs-sec-glp1: chars {glp1_start}–{glp1_end} ({glp1_end-glp1_start} chars)")
print(f"cs-sec-myths: chars {myths_start}–{myths_end} ({myths_end-myths_start} chars)")

# Remove both from their current positions (remove higher index first to avoid shifts)
positions = sorted([(glp1_start, glp1_end, glp1_html),
                    (myths_start, myths_end, myths_html)],
                   key=lambda x: x[0], reverse=True)

for s, e, _ in positions:
    html = html[:s] + html[e:]

# Now find the first <details id="cs-sec- anchor in the cheat sheet view
# and insert glp1 then myths before it
first_sec = html.find('  <details id="cs-sec-bepatient"')
if first_sec == -1:
    first_sec = html.find('  <details id="cs-sec-')
    if first_sec == -1:
        raise ValueError("Cannot find first cheat sheet section")

# Insert: glp1 first, then myths, then everything else
insert_block = glp1_html + '\n' + myths_html + '\n'
html = html[:first_sec] + insert_block + html[first_sec:]

with open('home.html', 'w', encoding='utf-8') as f:
    f.write(html)

print("Done — GLP-1 Safety is now first, Myths (cancer/neuropathy) is second.")
