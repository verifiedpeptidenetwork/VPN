import re

with open('home.html', 'r', encoding='utf-8') as f:
    html = f.read()

def img_card(src, title, search_tags, label_color='var(--neon-pink)', border_color='rgba(255,45,120,0.3)', border_left='var(--neon-pink)', extra_note=''):
    note_html = f'<div style="font-family:\'Rajdhani\',sans-serif;font-size:0.83rem;font-weight:600;color:rgba(255,200,210,0.75);margin-top:0.55rem;">{extra_note}</div>' if extra_note else ''
    return f'''
    <div data-search="{search_tags}" style="background:#0a060e;border:1px solid {border_color};border-left:4px solid {border_left};border-radius:8px;padding:1rem 1.1rem;margin-bottom:1.25rem;">
      <div style="font-family:\'Bebas Neue\',sans-serif;font-size:1rem;letter-spacing:0.12em;color:{label_color};margin-bottom:0.75rem;">📌 {title}</div>
      <div style="text-align:center;cursor:zoom-in;" onclick="openLightbox(\'{src}\',\'{title}\')">
        <img src="{src}" alt="{title}" style="max-width:100%;border-radius:6px;border:1px solid {border_color};box-shadow:0 0 18px rgba(0,0,0,0.5);" loading="lazy">
      </div>{note_html}
    </div>'''

def cyan_img_card(src, title, search_tags, extra_note=''):
    return img_card(src, title, search_tags, 'var(--neon-cyan)', 'rgba(0,245,255,0.3)', 'var(--neon-cyan)', extra_note)

def green_img_card(src, title, search_tags, extra_note=''):
    return img_card(src, title, search_tags, '#00ff64', 'rgba(0,255,100,0.3)', '#00ff64', extra_note)

def orange_img_card(src, title, search_tags, extra_note=''):
    return img_card(src, title, search_tags, 'var(--neon-orange)', 'rgba(255,165,0,0.3)', 'var(--neon-orange)', extra_note)

# ── 1. PARASITE DIE-OFF → after COVID disclaimer (line ~8843)
parasite_card = cyan_img_card(
    'parasitedieoff.png',
    'PARASITE DIE-OFF REACTION — WHAT TO EXPECT',
    'parasite die off herxheimer reaction ivermectin fenbendazole mebendazole detox symptoms nausea fatigue healing crisis covid spike protein cleanse',
    'What to expect during a parasite cleanse — die-off symptoms, timeline, and support strategies.'
)
html = html.replace(
    '    <!-- Dr. John Campbell YouTube -->',
    parasite_card + '\n    <!-- Dr. John Campbell YouTube -->'
)

# ── 2. TIRZ DEATH / GLP section → after Dr. Makis YouTube block, before CANCER RESEARCH divider
glp_section = '''
    <!-- GLP / TIRZEPATIDE EDUCATION -->
    <div style="display:flex;align-items:center;gap:1rem;margin-bottom:1.25rem;margin-top:0.5rem;">
      <div style="flex:1;height:1px;background:linear-gradient(90deg,transparent,rgba(255,165,0,0.4));"></div>
      <div style="font-family:\'Bebas Neue\',sans-serif;font-size:1rem;letter-spacing:0.2em;color:var(--neon-orange);">⚡ GLP-1 EDUCATION &amp; RESEARCH</div>
      <div style="flex:1;height:1px;background:linear-gradient(90deg,rgba(255,165,0,0.4),transparent);"></div>
    </div>
''' + orange_img_card(
    'whatcausedtirzdeath.jpg',
    'WHAT CAUSED TIRZEPATIDE DEATHS — RESEARCH BREAKDOWN',
    'tirzepatide death causes mounjaro zepbound GLP-1 risks side effects fatal adverse events research',
    'Important safety data on adverse events associated with tirzepatide use.'
) + orange_img_card(
    'glp123.png',
    'GLP-1 / GLP-2 / GLP-3 — UNDERSTANDING THE DIFFERENCES',
    'GLP-1 GLP-2 GLP-3 receptor agonist semaglutide tirzepatide retatrutide difference comparison weight loss gut',
) + orange_img_card(
    'carbfirst.jpg',
    'CARBS FIRST — GLP-1 & BLOOD SUGAR STRATEGY',
    'carbs first carbohydrates blood sugar glucose GLP-1 semaglutide tirzepatide insulin spike weight loss strategy',
    'Eating carbs first may blunt glucose spikes — relevant for GLP-1 users managing blood sugar.'
) + orange_img_card(
    'saltnandbloat.png',
    'SALT & BLOAT — SODIUM RETENTION ON GLP-1S',
    'salt bloat sodium retention water weight GLP-1 semaglutide tirzepatide edema swelling electrolytes',
) + orange_img_card(
    'obesityharm.png',
    'OBESITY HARM — THE DATA BEHIND THE RISK',
    'obesity harm metabolic disease cardiovascular risk diabetes cancer comorbidities BMI weight data research',
)

html = html.replace(
    '    <!-- CANCER RESEARCH -->',
    glp_section + '\n    <!-- CANCER RESEARCH -->'
)

# ── 3. BPC CANCER → after CANCER RESEARCH disclaimer (~line 8882)
bpc_cancer_card = img_card(
    'bpccancer.jpg',
    'BPC-157 & CANCER / GROWTH HORMONE — KNOW THE RESEARCH',
    'BPC-157 cancer tumor growth hormone angiogenesis cell growth risk concern safety peptide controversy',
    'var(--neon-pink)', 'rgba(255,45,120,0.3)', 'var(--neon-pink)',
    'Understand the nuanced evidence around BPC-157 and cancer-related growth factors before using.'
)
html = html.replace(
    '    <!-- Dr. Makis YouTube -->\n    <div style="background:#04141a;border:2px solid rgba(255,45,120',
    bpc_cancer_card + '\n    <!-- Dr. Makis YouTube -->\n    <div style="background:#04141a;border:2px solid rgba(255,45,120'
)

# ── 4. SUPPLY CHAIN + LEGAL → after FUCKFAUCI card, before ZINC section
supply_legal = green_img_card(
    'chinesesupplyredflag.jpg',
    'CHINESE SUPPLY RED FLAGS — SOURCING SAFETY GUIDE',
    'chinese supply chain red flags sourcing safety peptide quality contamination counterfeit research chemical vendor',
    'Know the warning signs of unreliable peptide sources — protect your health and money.'
) + img_card(
    'are peptides legal to sell.png',
    'ARE PEPTIDES LEGAL TO SELL? — REGULATORY OVERVIEW',
    'peptides legal sell buy law FDA regulations research chemical status legality US Canada UK Australia',
    '#cc44ff', 'rgba(204,68,255,0.3)', '#cc44ff',
    'A breakdown of the legal landscape for research peptides in the US and internationally.'
)

html = html.replace(
    '    <!-- ZINC & ITS TYPES -->',
    supply_legal + '\n    <!-- ZINC & ITS TYPES -->'
)

# ── 5. RETATRUTIDE / LEAKY GUT → after Guardian/Larazotide block, before DR. ZELENKO
retaleaky_card = cyan_img_card(
    'retaleakygut.jpg',
    'RETATRUTIDE & LEAKY GUT — GLP-1 GUT HEALTH RESEARCH',
    'retatrutide leaky gut intestinal permeability GLP-1 gut barrier inflammation spike protein long covid healing BPC-157 KPV larazotide',
    'How retatrutide interacts with gut barrier function and what it means for leaky gut protocols.'
)
html = html.replace(
    '    <!-- DR. ZELENKO -->',
    retaleaky_card + '\n    <!-- DR. ZELENKO -->'
)

# ── 6. PEPTIDE EDUCATION section → before COVID RESEARCH divider
peptide_edu_section = '''
    <!-- PEPTIDE EDUCATION IMAGES -->
    <div style="display:flex;align-items:center;gap:1rem;margin-bottom:1.25rem;margin-top:0.5rem;">
      <div style="flex:1;height:1px;background:linear-gradient(90deg,transparent,rgba(157,0,255,0.4));"></div>
      <div style="font-family:\'Bebas Neue\',sans-serif;font-size:1rem;letter-spacing:0.2em;color:#9d00ff;">🧬 PEPTIDE EDUCATION</div>
      <div style="flex:1;height:1px;background:linear-gradient(90deg,rgba(157,0,255,0.4),transparent);"></div>
    </div>
''' + img_card(
    'peptideliferecon.jpg',
    'PEPTIDE LIFE & RECONSTITUTION — STORAGE GUIDE',
    'peptide shelf life reconstitution bacteriostatic water mixing storage refrigeration lyophilized powder stability expiration',
    '#9d00ff', 'rgba(157,0,255,0.3)', '#9d00ff',
    'How long peptides last, how to mix them safely, and storage best practices.'
) + img_card(
    'autoimmunepeps.jpg',
    'AUTOIMMUNE PEPTIDES — IMMUNE MODULATION RESEARCH',
    'autoimmune peptides immune modulation thymosin alpha-1 BPC-157 KPV selank semax lupus rheumatoid arthritis MS inflammation',
    '#9d00ff', 'rgba(157,0,255,0.3)', '#9d00ff',
    'Peptides with evidence for modulating overactive immune responses and reducing autoimmune symptoms.'
) + img_card(
    'peptidesynthetic.png',
    'SYNTHETIC PEPTIDES — HOW THEY\'RE MADE',
    'synthetic peptides manufacturing SPPS solid phase peptide synthesis purity quality control GMP pharmaceutical grade',
    '#9d00ff', 'rgba(157,0,255,0.3)', '#9d00ff',
) + img_card(
    'newkpv.png',
    'KPV — THE NEW MUST-KNOW PEPTIDE',
    'KPV tripeptide anti-inflammatory gut healing IBD Crohn\'s colitis skin wound healing melanocyte stimulating hormone MSH',
    '#9d00ff', 'rgba(157,0,255,0.3)', '#9d00ff',
    'KPV (Lys-Pro-Val) is a fragment of alpha-MSH with potent anti-inflammatory and gut-healing properties.'
) + img_card(
    'storingvials.jpg',
    'STORING VIALS — COLD CHAIN & PEPTIDE PRESERVATION',
    'storing vials peptide storage cold chain refrigerator freezer temperature stability degradation reconstituted bacteriostatic water',
    '#9d00ff', 'rgba(157,0,255,0.3)', '#9d00ff',
    'Proper vial storage protocols before and after reconstitution — keep your peptides potent.'
) + img_card(
    'printlabelsorder.png',
    'PRINT LABELS & ORDER GUIDE',
    'print labels order guide peptide labeling organization tracking vials dosage protocol management',
    '#9d00ff', 'rgba(157,0,255,0.3)', '#9d00ff',
    'How to label and organize your peptide vials for safe, trackable use.'
)

html = html.replace(
    '    <!-- COVID RESEARCH -->',
    peptide_edu_section + '\n    <!-- COVID RESEARCH -->'
)

with open('home.html', 'w', encoding='utf-8') as f:
    f.write(html)

print("Done — all images inserted.")
