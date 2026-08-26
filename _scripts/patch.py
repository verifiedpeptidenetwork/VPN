with open('home.html', 'r', encoding='utf-8') as f:
    html = f.read()

# ── 1. Desktop alignment CSS for hero-btn-row ──
OLD_CSS = '      .hero-btn-row .qa-dropdown{flex:1;min-width:0;position:relative;}\n      .hero-btn-row .qa-dropdown .hbtn{width:100%;box-sizing:border-box;}\n      @media(max-width:700px){'
NEW_CSS = '      .hero-btn-row .qa-dropdown{flex:1;min-width:0;position:relative;margin:0;}\n      .hero-btn-row .qa-dropdown .hbtn{width:100%;box-sizing:border-box;height:100%;}\n      /* Desktop: equal-height buttons, capped width, centred */\n      @media(min-width:901px){\n        .hero-btn-row{\n          max-width:860px;\n          margin-left:auto;\n          margin-right:auto;\n          align-items:stretch;\n        }\n        .hero-btn-row .qa-dropdown{display:flex;flex-direction:column;}\n        .hero-btn-row .qa-dropdown .qa-trigger{flex:1;height:auto;align-items:center;}\n        /* START HERE full-width row keeps its full container width */\n        .hero-btn-row > div[style*="width:100%"]{max-width:100%;}\n      }\n      @media(max-width:700px){'
if OLD_CSS in html:
    html = html.replace(OLD_CSS, NEW_CSS, 1)
    print("OK alignment CSS applied")
else:
    print("!! alignment CSS anchor not found - trying partial match")
    # Try simpler approach
    OLD2 = '.hero-btn-row .qa-dropdown{flex:1;min-width:0;position:relative;}'
    NEW2 = '.hero-btn-row .qa-dropdown{flex:1;min-width:0;position:relative;margin:0;}'
    if OLD2 in html:
        html = html.replace(OLD2, NEW2, 1)
        print("OK partial alignment applied")

# ── 2. GLP infographic — remove top margin so it appears at very top ──
OLD_IMG = 'margin-top:0.85rem;margin-bottom:1rem;text-align:center;cursor:zoom-in;" onclick="openLightbox(\'GLP_Medications_Explanation_Infographic.png\''
NEW_IMG = 'margin-top:0;margin-bottom:1rem;text-align:center;cursor:zoom-in;" onclick="openLightbox(\'GLP_Medications_Explanation_Infographic.png\''
if OLD_IMG in html:
    html = html.replace(OLD_IMG, NEW_IMG, 1)
    print("OK infographic margin removed")
else:
    print("!! infographic margin anchor not found")

# ── 3. hero-btn-row order fix: START HERE before LATEST NEWS ──
# Change order:1 for latest-news to order:3, and hero-btn-row to order:1
OLD_ORDER = '    #home-latest-news  { order:1; }   /* Latest News             — right under Why We\'re Here */\n    .hero-btn-row      { order:2; }   /* GLP / Gray / Glowrilla — under Latest News */'
NEW_ORDER = '    #home-latest-news  { order:3; }   /* Latest News             — after START HERE */\n    .hero-btn-row      { order:1; }   /* GLP / Gray / Glowrilla — right under Why We\'re Here */'
if OLD_ORDER in html:
    html = html.replace(OLD_ORDER, NEW_ORDER, 1)
    print("OK order: START HERE first, Latest News second")
else:
    print("!! order anchor not found")

with open('home.html', 'w', encoding='utf-8') as f:
    f.write(html)
print("Done")
