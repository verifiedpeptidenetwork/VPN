/* Pro layer for standalone pages — the same clean card style as the home sections:
   expandable bars become uniform cards, neon-bordered boxes get a thin border + coloured top edge,
   ALL-CAPS labels become normal case, long centred text inside cards is left-aligned.
   Loaded by readable.js. <html data-px-skip> opts a page out; [data-px-skip] skips one block. */
(function(){
  if (document.documentElement.hasAttribute('data-px-skip')) return;
  var css = ''
    + ':root{--px-ink:#f1f3fb;--px-sub:rgba(200,206,230,0.74);--px-line:rgba(255,255,255,0.09);--px-card:#0e0c18;--px-card2:#14111f;}'
    + 'html[data-theme="light"]{--px-ink:#14112a;--px-sub:#4a4566;--px-line:rgba(30,20,70,0.12);--px-card:#ffffff;--px-card2:#f3f0fb;}'
    + 'body.px-page *{text-shadow:none!important}'
    + 'body.px-page details.px-det{border:none!important;background:none!important;box-shadow:none!important;border-radius:16px!important;margin:0 0 .6rem!important;overflow:visible!important}'
    + 'body.px-page summary.px-sum{display:flex!important;align-items:center!important;justify-content:flex-start!important;flex-wrap:wrap;gap:.4rem .75rem!important;min-height:56px;box-sizing:border-box;margin:0!important;padding:.85rem 2.8rem .85rem 1.1rem!important;position:relative;list-style:none;cursor:pointer;border-radius:16px!important;border:1px solid var(--px-line)!important;border-left:3px solid var(--px-ac,#9a5cff)!important;background:var(--px-card)!important;box-shadow:none!important;color:var(--px-ink)!important;-webkit-text-fill-color:currentColor!important;font:700 1rem/1.35 Inter,system-ui,sans-serif!important;letter-spacing:-.005em!important;text-transform:none!important;text-align:left!important;animation:none!important;transition:background .15s,transform .15s}'
    + 'body.px-page summary.px-sum *{text-align:left!important}'
    + 'body.px-page summary.px-sum::-webkit-details-marker{display:none}'
    + 'body.px-page summary.px-sum::marker{content:""}'
    + 'body.px-page summary.px-sum::before{display:none!important}'
    + 'body.px-page summary.px-sum::after{content:""!important;display:block!important;position:absolute!important;right:1.1rem;top:50%;width:8px;height:8px;margin-top:-6px;border-right:2px solid var(--px-sub);border-bottom:2px solid var(--px-sub);transform:rotate(45deg);transition:transform .2s;background:none!important}'
    + 'body.px-page details[open]>summary.px-sum::after{transform:rotate(-135deg);margin-top:-2px}'
    + 'body.px-page details[open]>summary.px-sum{border-radius:16px 16px 0 0!important;background:var(--px-card2)!important}'
    + 'body.px-page summary.px-sum:hover{background:var(--px-card2)!important}'
    + 'body.px-page details.px-det[open]{border:1px solid var(--px-line)!important}'
    + 'body.px-page details.px-det[open]>summary.px-sum{border-top:none!important;border-right:none!important;border-bottom:1px solid var(--px-line)!important}'
    + 'body.px-page .px-pill{font:700 .66rem/1 Inter,sans-serif!important;letter-spacing:.08em!important;text-transform:uppercase!important;padding:.35rem .55rem!important;border-radius:999px!important;border:1px solid var(--px-line)!important;background:rgba(255,255,255,.04)!important;color:var(--px-sub)!important;-webkit-text-fill-color:currentColor!important;box-shadow:none!important}'
    + 'body.px-page .px-box{border-radius:18px!important;border:1px solid var(--px-line)!important;border-top:3px solid var(--px-ac,#9a5cff)!important;box-shadow:none!important;animation:none!important}'
    + 'body.px-page .px-box.px-solid{background:var(--px-card)!important}'
    + 'body.px-page .px-box.px-warn{border-top-color:#ffb020!important}'
    + 'body.px-page .px-left{text-align:left!important}'
    + 'body.px-page .px-head{font-family:Inter,system-ui,sans-serif!important;font-weight:800!important;letter-spacing:-.01em!important;text-transform:none!important}'
    + 'body.px-page .px-btn{font-family:Inter,system-ui,sans-serif!important;font-weight:700!important;letter-spacing:0!important;text-transform:none!important;box-shadow:none!important}'
    + '@media(max-width:640px){body.px-page summary.px-sum{padding:.8rem 2.5rem .8rem .95rem!important;font-size:.98rem!important}}';
  var st = document.createElement('style'); st.id = 'px-css'; st.textContent = css; document.head.appendChild(st);

  var KEEP = /^(GLP|GLP-1|GLP-1S|COA|COAS|BAC|PCOS|EAA|EAAS|NAD|NAD\+|DNA|MTC|MEN|FDA|RUI|VPN|BPC|TB|GHK|GHK-CU|KPV|PDF|ID|AI|IGF|IGF-1|HGH|GH|TRT|LDL|HDL|CBC|CMP|TSH|A1C|HBA1C|NMN|MOTS-C|SS-31|IV|IM|SQ|UV|LED|USA|UK|EU|DIY|ELI5|FAQ|CJC|HCG|DHEA|PT-141|MK-677|ALA|NAC|COQ10|PQQ|ATP|AMPK|MTOR|CRP|ALT|AST|PSA|LH|FSH|SHBG|DHT|T3|T4|PTH|EPA|DHA|OTC|RX|IU|UTI|ADHD|PTSD|IBS|SIBO|GI|ED|MS|ALS|HIV|COVID|COVID-19|LLC|TV|NIH|PMC|USP|HPLC|LC-MS|QR|BDNF|GABA|DSIP|NK|II|III|TA1|TB-500|BPC-157|AOD|AOD-9604|CJC-1295|SLU-PP-332|5-AMINO-1MQ|VIP|LL-37|KLOW|ARA-290|HP|XP|PVP|VS|AM|PM|US|NEWS|RSS|PUBMED|POKEME-DEX|POKEME|GLOWRILLA)$/;
  var FIX = {COAS:'COAs',EAAS:'EAAs','GLP-1S':'GLP-1s',COQ10:'CoQ10','GHK-CU':'GHK-Cu','MOTS-C':'MOTS-c',NEWS:'News',RSS:'RSS',PUBMED:'PubMed','POKEME-DEX':'PokeMe-Dex',POKEME:'PokeMe',XP:'XP',GLOWRILLA:'Glowrilla',VS:'vs',AM:'am',PM:'pm',US:'US'};
  var UNITS = {MG:'mg',MCG:'mcg',ML:'mL',KG:'kg',IU:'IU',MM:'mm',LB:'lb',LBS:'lbs',OZ:'oz'};
  var SMALL = /^(AN|AND|OR|THE|OF|TO|FOR|IN|ON|AT|BY|WITH|PER|FROM|INTO|NOR|BUT|AS|IS|IT|ITS)$/;
  function cap(w){ return w.charAt(0) + w.slice(1).toLowerCase(); }
  function word(w, first){
    var core = w.replace(/^[^A-Z0-9]+|[^A-Z0-9+]+$/g, ''); if (!core) return w;
    var at = w.indexOf(core), pre = w.slice(0, at), post = w.slice(at + core.length), out;
    if (KEEP.test(core)) out = FIX[core] || core;
    else if (UNITS[core]) out = UNITS[core];
    else if (/\d/.test(core) && core.length <= 6) out = core;
    else if (!first && SMALL.test(core)) out = core.toLowerCase();
    else out = core.split('-').map(cap).join('-');
    return pre + out + post;
  }
  function decaps(s){ var i = 0, prev = ''; return s.replace(/\S+/g, function(w){ var r = word(w, i === 0 || /[—:|·–]$/.test(prev)); prev = w; i++; return r; }); }
  function isCaps(t){ var l = t.replace(/[^A-Za-z]/g, ''); return l.length >= 4 && l === l.toUpperCase(); }
  function convertText(el){
    var w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT), n, list = [];
    while ((n = w.nextNode())) list.push(n);
    list.forEach(function(n){ if (isCaps(n.textContent) && !n.parentElement.closest('svg,code,kbd,.px-pill,[data-px-skip]')) n.textContent = decaps(n.textContent); });
  }
  function rgb(s){ var m = s && s.match(/\d+(\.\d+)?/g); if (!m) return null; return {r:+m[0], g:+m[1], b:+m[2], a: m[3] == null ? 1 : +m[3]}; }
  function vivid(s){ var c = rgb(s); if (!c || c.a < 0.25) return ''; var mx = Math.max(c.r,c.g,c.b), mn = Math.min(c.r,c.g,c.b); return mx - mn > 60 ? 'rgb(' + c.r + ',' + c.g + ',' + c.b + ')' : ''; }
  function accentOf(el){ var c = getComputedStyle(el); return vivid(c.borderLeftColor) || vivid(c.borderTopColor) || vivid(c.color); }
  var SKIPT = 'svg, video, iframe, canvas, input, select, textarea, option, [data-px-skip], #vt-text-ctrl, #vt-top-btn';
  var SKIP = 'svg, video, iframe, canvas, table, form, input, select, textarea, button, header, nav, [data-px-skip], [data-vt-skip], #vt-text-ctrl, #vt-top-btn';

  function skin(root){
    // bars
    root.querySelectorAll('details > summary:not(.px-sum)').forEach(function(s){
      if (s.closest(SKIP)) return;
      var d = s.parentElement, ac = accentOf(d) || accentOf(s);
      d.classList.add('px-det'); s.classList.add('px-sum'); if (ac) s.style.setProperty('--px-ac', ac);
      var sb = [], q = s; while (q && q !== document.documentElement) { sb = (getComputedStyle(q).backgroundColor.match(/[\d.]+/g) || []).map(Number); if (sb.length >= 3 && (sb[3] == null || sb[3] > 0.5)) break; sb = []; q = q.parentElement; }
      if (sb.length >= 3 && sb[0] + sb[1] + sb[2] > 560) { s.style.setProperty('--px-ink', '#14112a'); s.style.setProperty('--px-sub', '#4a4566'); }
      s.querySelectorAll('span, em, b, small, div').forEach(function(x){
        var t = x.textContent.trim();
        if (x.children.length === 0 && /^(TAP|CLICK) TO (EXPAND|OPEN)/i.test(t) && t.length <= 24) { x.style.setProperty('display','none','important'); return; }
        if (x.children.length === 0 && t.length > 1 && t.length <= 22 && isCaps(t) && /NEW|CHOICE|BEST|TOP|HOT|FREE|SALE|WARNING|GUIDE|LIVE|BREAKING/.test(t)) x.classList.add('px-pill');
      });
      convertText(s);
      s.querySelectorAll('span, b, strong, div, em, small, p').forEach(function(x){
        if (x.classList.contains('px-pill')) return;
        var own = ''; for (var n = x.firstChild; n; n = n.nextSibling) if (n.nodeType === 3) own += n.textContent;
        if (!own.trim()) return;
        var xc = getComputedStyle(x), xb = (xc.backgroundColor.match(/[\d.]+/g) || []).map(Number);
        if (xb.length >= 3 && (xb[3] == null || xb[3] > 0.5)) return; // badges with their own fill keep their colours
        var fs = parseFloat(xc.fontSize);
        x.style.setProperty('color', fs < 14.5 ? 'var(--px-sub)' : 'var(--px-ink)', 'important');
        x.style.setProperty('-webkit-text-fill-color', 'currentColor', 'important');
        x.style.setProperty('background-image', 'none', 'important');
        if (fs >= 14.5) { x.style.setProperty('font-weight', '700', 'important'); x.style.setProperty('text-transform', 'none', 'important'); x.style.setProperty('letter-spacing', '-0.005em', 'important'); }
      });
    });
    // neon-bordered boxes (vivid border colour or glow)
    root.querySelectorAll('div, section, article, aside, a, li').forEach(function(b){
      if (b.__pxb) return;
      if (b.closest(SKIP) || b.closest('summary')) { b.__pxb = true; return; }
      var r = b.getBoundingClientRect(); if (!r.height) return; b.__pxb = true;
      if (r.height < 60 || r.width < 220 || r.height > 2400) return;
      var c = getComputedStyle(b); if (c.position === 'fixed') return;
      var bw = parseFloat(c.borderTopWidth) + parseFloat(c.borderLeftWidth) + parseFloat(c.borderRightWidth);
      var ac = vivid(c.borderTopColor) || vivid(c.borderLeftColor);
      var glow = c.boxShadow !== 'none' && /rgba?\(/.test(c.boxShadow) && vivid(c.boxShadow);
      if (!(bw >= 1 && ac) && !glow) return;
      if (b.parentElement && b.parentElement.closest('.px-box') && !ac) return;
      b.classList.add('px-box'); b.style.setProperty('--px-ac', ac || vivid(c.boxShadow) || '#9a5cff');
      var bg = rgb(c.backgroundColor), tx = rgb(c.color); if ((!bg || bg.a < 0.5) && tx && (tx.r + tx.g + tx.b) > 450) b.classList.add('px-solid');
      if (/NOT FOR HUMAN|DISCLAIMER|RESEARCH USE ONLY|NOT MEDICAL ADVICE|WARNING/i.test(b.textContent.slice(0, 120))) b.classList.add('px-warn');
    });
    // ALL-CAPS headings and labels, centred paragraphs inside cards
    root.querySelectorAll('h1,h2,h3,h4,h5,strong,b,div,span,a,p,label,button').forEach(function(e){
      if (e.__pxt) return; e.__pxt = true;
      if (e.closest(SKIPT) || e.closest('summary')) return;
      var own = ''; for (var n = e.firstChild; n; n = n.nextSibling) if (n.nodeType === 3) own += n.textContent;
      own = own.trim(); if (!own) return;
      var c = getComputedStyle(e), fs = parseFloat(c.fontSize);
      if ((c.textTransform === 'uppercase' || isCaps(own)) && fs >= 14 && own.length >= 6) {
        e.style.setProperty('text-transform', 'none', 'important');
        e.style.setProperty('letter-spacing', '-0.005em', 'important');
        if (isCaps(own)) convertText(e);
        else if (c.textTransform === 'uppercase' && own === own.toLowerCase()) e.firstChild && (e.firstChild.textContent = e.firstChild.textContent.replace(/^\s*\w/, function(m){ return m.toUpperCase(); }));
        e.classList.add(/^(A|BUTTON)$/.test(e.tagName) || e.closest('button') ? 'px-btn' : 'px-head');
      }
      if ((e.tagName === 'P' || e.tagName === 'DIV') && c.textAlign === 'center' && e.textContent.trim().length > 110 && e.closest('.px-box, .px-det')) e.classList.add('px-left');
    });
  }
  function run(){ document.body.classList.add('px-page'); skin(document.body); }
  function start(){
    setTimeout(run, 150);
    var p = null;
    new MutationObserver(function(){ if (p) return; p = setTimeout(function(){ p = null; run(); }, 400); }).observe(document.body, { childList:true, subtree:true });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
