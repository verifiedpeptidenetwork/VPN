with open('home.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Find both occurrences regardless of indentation
marker = '<details id="cs-sec-myths"'
first = html.find(marker)
second = html.find(marker, first + 1)
print(f"First at: {first}, Second at: {second}")

if second == -1:
    print("No duplicate found")
    exit()

# Remove the SECOND occurrence (the old copy not in the proper T&G wrapper)
i = second
depth = 0
while i < len(html):
    if html[i:i+8] == '<details':
        depth += 1
        i += 8
    elif html[i:i+9] == '</details':
        depth -= 1
        if depth == 0:
            end = html.find('>', i) + 1
            # Also eat a trailing newline if present
            if html[end:end+1] == '\n':
                end += 1
            print(f"Duplicate ends at: {end}, removing {end - second} chars")
            html = html[:second] + html[end:]
            break
        i += 9
    else:
        i += 1

with open('home.html', 'w', encoding='utf-8') as f:
    f.write(html)
print("Done - duplicate removed")
