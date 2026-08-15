import re

with open('home.html', 'r', encoding='utf-8') as f:
    html = f.read()

cs_start = html.find('<div class="view" id="view-cheatsheets">')

# 1. Add missing closing tags to end of file (cs-sec-glp1 is unclosed)
glp1_pos = html.find('<details id="cs-sec-glp1"', cs_start)
region_from_glp1 = html[glp1_pos:]
opens = region_from_glp1.count('<details')
closes = region_from_glp1.count('</details')
diff = opens - closes
print(f"glp1 region: {opens} opens, {closes} closes, need {diff} closing tags")

# Strip trailing whitespace/newlines and add the missing closing tags
CLOSE_TAGS = '\n      </div>\n    </div>\n  </details>\n'
html = html.rstrip('\n') + CLOSE_TAGS
print("Added closing tags")

# 2. Reorder: move cs-sec-glp1 to FIRST position in cheatsheets
# Find glp1 start and end (now it should close properly)
cs_start = html.find('<div class="view" id="view-cheatsheets">')
glp1_s = html.find('<details id="cs-sec-glp1"', cs_start)

# Find end using character scanning
i = glp1_s
depth = 0
glp1_e = -1
while i < len(html):
    if html[i:i+8] == '<details':
        depth += 1; i += 8
    elif html[i:i+9] == '</details':
        depth -= 1
        if depth == 0:
            glp1_e = html.find('>', i) + 1
            if glp1_e < len(html) and html[glp1_e] == '\n':
                glp1_e += 1
            break
        i += 9
    else:
        i += 1

if glp1_e == -1:
    print("!! Still cannot find end of glp1")
    exit()

glp1_content = html[glp1_s:glp1_e]
print(f"glp1 extracted: {len(glp1_content)} chars, ends at {glp1_e}")

# Remove glp1 from current position
html = html[:glp1_s] + html[glp1_e:]

# Find first cs-sec-* in cheatsheets (now myths should be first)
cs_start2 = html.find('<div class="view" id="view-cheatsheets">')
first_sec = re.search(r'<details id="cs-sec-', html[cs_start2:])
if not first_sec:
    print("!! No cs-sec-* found in cheatsheets to insert before")
    exit()
insert_at = cs_start2 + first_sec.start()
html = html[:insert_at] + glp1_content + html[insert_at:]
print(f"glp1 inserted before myths at position {insert_at}")

# 3. Verify order
cs_start3 = html.find('<div class="view" id="view-cheatsheets">')
order = re.findall(r'<details id="(cs-sec-[^"]+)"', html[cs_start3:])
print(f"Final order (first 4): {order[:4]}")
print(f"Total sections in CS: {len(order)}")

with open('home.html', 'w', encoding='utf-8') as f:
    f.write(html)
print("Done!")
