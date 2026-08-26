with open(r'C:\Users\Saidk\OneDrive\Desktop\WEBSITES\RUIVPNDATA\home.html', 'r', encoding='utf-8') as f:
    content = f.read()

start_marker = '    <div class="section-header" style="margin-bottom:1.25rem;">\n      <div class="section-title">\U0001f3f7\ufe0f Label Templates</div>'
end_marker = '  <!-- BLOOD WORK -->'
start_idx = content.find(start_marker)
end_idx = content.find(end_marker)

if start_idx == -1 or end_idx == -1:
    print(f"Markers not found: start={start_idx}, end={end_idx}")
    exit(1)

print(f"Found start={start_idx}, end={end_idx}")

def mk_card(title, href, dl, color, search, lb_title=None):
    if lb_title is None: lb_title = title
    img = href
    return (
        f'      <div data-search="{search}" style="background:var(--card-bg);border:1px solid var(--card-border);border-top:3px solid {color};overflow:hidden;">\n'
        f'        <div style="padding:0.6rem 1rem;border-bottom:1px solid var(--card-border);display:flex;justify-content:space-between;align-items:center;">\n'
        f'          <div style="font-family:\'Bebas Neue\',sans-serif;font-size:0.95rem;letter-spacing:0.08em;color:{color};">{title}</div>\n'
        f'          <a href="{href}" download="{dl}" style="font-family:\'Bebas Neue\',sans-serif;font-size:0.75rem;letter-spacing:0.06em;padding:0.2rem 0.6rem;border:1px solid {color};color:{color};text-decoration:none;background:rgba(0,0,0,0.3);">\u2b07 Save</a>\n'
        f'        </div>\n'
        f'        <div style="cursor:zoom-in;" onclick="openLightbox(\'{img}\',\'{lb_title}\')">\n'
        f'          <img loading="lazy" src="{img}" alt="{title}" title="Click to zoom" style="width:100%;display:block;object-fit:contain;max-height:210px;">\n'
        f'        </div>\n'
        f'      </div>'
    )

def mk_grid(cards, mincol=260):
    return f'    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax({mincol}px,1fr));gap:0.85rem;">\n' + '\n'.join(cards) + '\n    </div>'

def mk_section(sid, icon, title, sub, color, count, body, open_=False):
    open_attr = ' open' if open_ else ''
    return (
        f'\n<div class="csv-group-sep">{icon}  {title.upper()}</div>\n'
        f'<details id="{sid}" class="csv-section" style="background:#020008;border-color:rgba(255,255,255,0.08);border-left:3px solid {color};"{open_attr}>\n'
        f'  <summary style="background:rgba(0,0,0,0.4);">'
        f'<span class="csv-sec-icon">{icon}</span>'
        f'<div class="csv-sec-info"><div class="csv-sec-title" style="color:{color};">{title}</div>'
        f'<div class="csv-sec-sub">{sub}</div></div>'
        f'<div class="csv-sec-meta"><span class="csv-count" style="color:{color};">{count}</span>'
        f'<span class="csv-chevron" style="color:{color};">\u25bc</span></div></summary>\n'
        f'  <div style="padding:1rem 1.25rem;border-top:1px solid rgba(0,0,0,0.15);">\n'
        f'{body}\n'
        f'  </div>\n'
        f'</details>'
    )

# Section 1: Pin & Pray Original Artwork
s1 = mk_grid([
    mk_card('Pin &amp; Pray \u2014 VPN / RUIC Edition', 'cheatsheet/upload/1000090306.png', 'PinPray-VPN-RUIC.png', '#ff2d78', 'pin pray vpn ruic logo artwork sticker'),
    mk_card('Pin &amp; Pray \u2014 Reta Unfiltered (Male)', 'cheatsheet/upload/1000090308.png', 'PinPray-RetaUnfiltered-Male.png', '#cc44ff', 'pin pray reta unfiltered male logo artwork'),
    mk_card('Pin &amp; Pray \u2014 Reta Unfiltered (Female)', 'cheatsheet/upload/1000090310.png', 'PinPray-RetaUnfiltered-Female.png', '#ff69b4', 'pin pray reta unfiltered female logo artwork'),
])
s1_body = (
    '    <div style="background:rgba(255,45,120,0.08);border:1px solid rgba(255,45,120,0.35);border-radius:6px;padding:0.85rem 1rem;'
    'font-family:\'Rajdhani\',sans-serif;font-weight:700;font-size:0.92rem;color:#fff;line-height:1.7;margin-bottom:1rem;">\n'
    '      \U0001f4ac <strong style="color:#ff2d78;">A note from Sah (creator):</strong> Hand-drawn on paper, refined with AI. '
    '<span style="color:#c6ff00;">Free for personal T-shirts, stickers, and community merch.</span> Printing to sell? A revenue share is only fair. \U0001f64f\n'
    '    </div>\n' + s1
)

# Section 2: Pin & Pray Vial Labels
s2_body = mk_grid([
    mk_card('Pin &amp; Pray \u2014 Miami Edition', 'PIN_PRAY_LABEL_1.png', 'VPN-Pin-Pray-Label-Miami.png', '#00f5ff', 'pin pray vial label miami niimbot', 'Pin &amp; Pray \u2014 Miami Edition \u00b7 I Pin. I Pray. I Trust.'),
    mk_card('Pin &amp; Pray \u2014 VPN Dark Edition', 'PIN_PRAY_LABEL_2.png', 'VPN-Pin-Pray-Label-Dark.png', '#ff2d78', 'pin pray vial label dark vpn niimbot', 'Pin &amp; Pray \u2014 VPN Dark Edition \u00b7 With God We Test.'),
])

# Section 3: Label Sheets
s3_body = mk_grid([
    mk_card('Funny Scientist Labels \u2014 Full Sheet (15)', 'LABELS_FUNNY.png', 'VPN-Labels-Funny-Scientists.png', '#9d00ff', 'funny scientist label sheet hamster sloth 15 designs'),
    mk_card('For The Ladies \u2014 Color Edition (15)', 'LABELS_LADIES_COLOR.png', 'VPN-Labels-Ladies-Color.png', '#ff2d78', 'ladies color label sheet 15 designs pretty smart curious'),
    mk_card('For The Ladies \u2014 Classic B&amp;W (15)', 'LABELS_LADIES_BW.png', 'VPN-Labels-Ladies-BW.png', 'rgba(255,255,255,0.5)', 'ladies classic black white label sheet 15 designs'),
    mk_card('Neon Animal Labels \u2014 Full Sheet (15)', 'LABELS_COLOR.png', 'VPN-Labels-Neon-Animals.png', '#ff2d78', 'neon animal label sheet 15 designs color'),
    mk_card('Classic B&amp;W Animal Labels \u2014 Full Sheet (15)', 'LABELS_BW.png', 'VPN-Labels-Classic-Animals.png', '#00f5ff', 'classic black white animal label sheet 15 designs'),
    mk_card('Classic B&amp;W Labels', 'LABEL1.png', 'VPN-Labels-Classic.png', '#00f5ff', 'vpn classic black white label original'),
    mk_card('Neon Colour Labels', 'LABEL%202.png', 'VPN-Labels-Neon.png', '#ff2d78', 'vpn neon colour label original'),
    mk_card('VPN Branded Labels', 'LABEL%203.png', 'VPN-Labels-Branded.png', '#9d00ff', 'vpn branded label original'),
], 270)

# Section 4: Collection Series
s4_body = mk_grid([
    mk_card('Peptide Rangers \u2014 Blank Templates', 'Peptide_Rangers_Blank_Templates.png', 'VPN-Peptide-Rangers-Blank.png', '#00f5ff', 'peptide rangers blank template vial label'),
    mk_card('Peptide Rangers \u2014 Color Series', 'Peptide_Rangers_Color_Rangers.png', 'VPN-Peptide-Rangers-Color.png', '#ff2d78', 'peptide rangers color series vial label'),
    mk_card('Vanity Vault \u2014 Blank Templates', 'Vanity_Vault_Blank_Templates.png', 'VPN-Vanity-Vault-Blank.png', '#9d00ff', 'vanity vault blank template vial label'),
    mk_card('Vanity Vault \u2014 Named Series', 'Vanity_Vault_Named_Series.png', 'VPN-Vanity-Vault-Named.png', '#ff2d78', 'vanity vault named series vial label'),
    mk_card('Noor Labs \u2014 Killer Collection', 'Noor_Labs_Killer_Collection.png', 'VPN-Noor-Labs-Killer-Collection.png', '#00f5ff', 'noor labs killer collection vial label'),
    mk_card('Stab Labs \u2014 Killer Collection', 'Stab_Labs_Killer_Collection.png', 'VPN-Stab-Labs-Killer-Collection.png', '#9d00ff', 'stab labs killer collection vial label'),
])

# Section 5: Community Designs
s5_body = mk_grid([
    mk_card('Researcher Wrex \u2014 Retro Vial Label (Blank)', 'cheatsheet/upload/img_153.jpg', 'VPN-Researcher-Wrex-Label.jpg', '#cc44ff', 'researcher wrex vpn retro vial label blank template'),
    mk_card('World of PepCraft \u2014 Vial Label (Blank)', 'cheatsheet/upload/img_121.jpg', 'VPN-World-of-PepCraft-Label.jpg', '#9d00ff', 'world pepcraft wow vial label blank template'),
    mk_card('Pretty in PiN-K / Poke-Ahontas \u2014 Label Art (Vials)', 'cheatsheet/upload/img_142.jpg', 'VPN-Pretty-in-Pink-Label-Art.jpg', '#ff69b4', 'pretty pink pokahontas vial label art bpc tb tirzepatide'),
    mk_card('Pretty in PiN-K \u2014 Research Grade Label Art (v2)', 'cheatsheet/upload/img_143.jpg', 'VPN-Pretty-in-Pink-v2-Label-Art.jpg', '#ff69b4', 'pretty pink research grade label art v2'),
    mk_card('Peptide PiN-icess / Poke-Ahontas \u2014 Vial Label (Blank)', 'cheatsheet/upload/img_146.jpg', 'VPN-Poke-Ahontas-PiNicess-Label.jpg', '#ff69b4', 'pokahontas pinicess blank vial label template'),
    mk_card('RaPINzul \u2014 Peptide PiN-Cess Label (Blank)', 'cheatsheet/upload/img_147.jpg', 'VPN-RaPINzul-PinCess-Label.jpg', '#ff69b4', 'rapinzul peptide pincess vial label blank'),
    mk_card('Vanity Vault \u2014 Femme Fatale Peptide Dosing', 'cheatsheet/vanity-vault-femme-fatale-peptide-dosing.jpg', '', '#ff2d78', 'vanity vault femme fatale peptide dosing women cosmetic anti-aging'),
])

# Section 6: How To Print
s6_body = mk_grid([
    mk_card("Glowrilla's Ultimate Guide \u2014 All 4 Label Printers", 'cheatsheet/upload/img_117.jpg', 'Glowrillas-Ultimate-Label-Printing-Guide.jpg', '#9d00ff', 'glowrilla ultimate guide label printer niimbot liene primera epson'),
    mk_card('Niimbot M2 \u2014 Label Printer Setup Guide', 'cheatsheet/vendors-niimbot-m2-label-printer-guide.jpg', '', '#00f5ff', 'niimbot m2 label printer setup guide'),
    mk_card('Peptide Vial Label Printing Guide', 'cheatsheet/vendors-peptide-label-printing-guide.jpg', '', '#ff2d78', 'peptide vial label printing guide how to print'),
])

# Section 7: Additional Community Templates
excluded = {121, 142, 143, 146, 147, 153}
all_nums = [140,136,141,128,110,115,112,113,116,120,123,132,133,134,137,139,148,152,210,66,122,119,126,127,130,151,138,111,114,124,154,144,145,135,131,129,67,125,109,207]
extra_cards = []
for n in all_nums:
    if n not in excluded:
        img = f'cheatsheet/upload/img_{n}.jpg'
        extra_cards.append(mk_card(f'Community Template #{n}', img, '', '#cc44ff', f'vial label template community design {n}'))
s7_body = mk_grid(extra_cards, 200)

new_content = (
    '    <div class="section-header" style="margin-bottom:1.25rem;">\n'
    '      <div class="section-title">\U0001f3f7\ufe0f Label Templates</div>\n'
    '      <span class="section-count">Niimbot-compatible \u00b7 Vial labels \u00b7 VPN branded \u00b7 Community designs</span>\n'
    '    </div>\n'
    '    <div style="font-family:\'Rajdhani\',sans-serif;font-weight:600;font-size:1rem;color:var(--text-secondary);margin-bottom:1rem;line-height:1.65;">\n'
    '      Download label templates for your <strong style="color:var(--neon-pink);">Niimbot</strong> or any compatible label printer. Click a section to expand.\n'
    '    </div>\n'
    + mk_section('lbl-pinpray-art', '\U0001f3a8', 'Pin &amp; Pray \u2014 Original Artwork', 'VPN \u00b7 RUIC \u00b7 Reta Unfiltered editions \u2014 hand-designed by Sah', '#ff2d78', '3', s1_body, True)
    + mk_section('lbl-pinpray-vials', '\U0001f3f7\ufe0f', 'Pin &amp; Pray Vial Labels', 'Miami Edition \u00b7 VPN Dark Edition \u2014 Niimbot-ready', '#00f5ff', '2', s2_body, True)
    + mk_section('lbl-sheets', '\U0001f43e', 'Label Sheets', 'Full 15-per-sheet collections \u2014 Animal \u00b7 Ladies \u00b7 Classic \u00b7 Neon', '#9d00ff', '8', s3_body)
    + mk_section('lbl-collections', '\U0001f48a', 'Collection Series', 'Peptide Rangers \u00b7 Vanity Vault \u00b7 Noor Labs \u00b7 Stab Labs', '#ff6b00', '6', s4_body)
    + mk_section('lbl-community', '\U0001f380', 'Community Label Designs', 'Researcher Wrex \u00b7 Pretty in PiN-K \u00b7 Poke-Ahontas \u00b7 RaPINzul \u00b7 Vanity Vault', '#cc44ff', '7', s5_body)
    + mk_section('lbl-print', '\U0001f5a8\ufe0f', 'How To Print Your Labels', 'Niimbot M2 \u00b7 Liene \u00b7 Primera \u00b7 Epson \u2014 full setup guides', '#c9a227', '3', s6_body, True)
    + mk_section('lbl-extra', '\U0001f4cb', 'Additional Community Templates', 'Blank &amp; community-submitted vial label templates', '#cc44ff', str(len(extra_cards)), s7_body)
    + '\n\n  '
)

content = content[:start_idx] + new_content + content[end_idx:]

with open(r'C:\Users\Saidk\OneDrive\Desktop\WEBSITES\RUIVPNDATA\home.html', 'w', encoding='utf-8') as f:
    f.write(content)

print(f"Done. Replaced {end_idx - start_idx} chars with {len(new_content)} chars.")
