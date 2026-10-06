/* VPN site-wide light/dark toggle — real color remap, not a page filter.

   What it does in light mode (strict: light backgrounds, dark text only):
   - Dark or saturated backgrounds (solid colors and gradients) become one
     opaque cream tone; faint colored tints/glows are removed entirely.
   - Every text color that isn't already dark becomes one near-black color,
     including gradient-filled headline text. All text/box glows are removed.
   - Neon borders become a dark version of their hue.
   - Hides large, dim, decoratively-positioned background photos/textures
     (absolute/fixed <img> at low opacity, or big url() backgrounds) —
     these exist purely as dark-mode atmosphere and have no clean light-mode
     equivalent, so they're hidden rather than recolored.
   - Never touches normal content images (logos, mascot art, screenshots,
     lightbox thumbnails) — those stay exactly as they are.
   - Everything is reversible: toggling back to dark restores every
     original inline value exactly.

   Include:
   1) in <head>, as early as possible:
      <script>(function(){try{if(localStorage.getItem('vpn_theme')==='light')document.documentElement.setAttribute('data-theme','light');}catch(e){}})();</script>
   2) before </body>:
      <script src="theme-toggle.js" defer></script>
*/
(function(){
  var KEY='vpn_theme';
  var LIGHT_BG_MIN=0.62;          // bg luminance below this (dark or saturated mid-tone) gets the cream fill
  var TEXT_MAX_LUM=0.30;          // text luminance above this is "not dark enough" and becomes TEXT_DARK
  // Professional palette: warm off-white page, white cards, navy text, muted gold accents
  var TEXT_DARK_STR='rgb(15,27,45)'; // navy -- the single text color used everywhere in light mode
  var PAGE_BG='#f3efe6';
  var GOLD='rgb(176,141,60)';
  var HAIRLINE='rgba(15,27,45,0.16)';
  var MIN_ALPHA=0.12;             // ignore near-fully-transparent colors
  var OPAQUE_FLOOR=0.96;          // lightened backgrounds become (at least) this opaque
  var BACKDROP_AREA=180000;       // px^2 — url() backgrounds bigger than this are treated as decorative texture
  var BACKDROP_OPACITY=0.6;       // decorative <img> opacity ceiling to be considered atmosphere, not content

  var touched=[];      // {el,bg,bgImg,color,textShadow} — recolored elements
  var touchedSet=new WeakSet(); // same elements, for O(1) "already recolored" checks
  var hiddenImgs=[];   // {el,prev} — decorative <img> visibility
  var hiddenBgUrls=[]; // {el,bgImg} — decorative url() backgrounds
  var bodyRec=null;

  var SKIP_TAGS={IMG:1,VIDEO:1,SVG:1,CANVAS:1,PICTURE:1,IFRAME:1,SOURCE:1,SCRIPT:1,STYLE:1};
  // Every caller passes a value straight from getComputedStyle(), which the browser
  // already normalizes to rgb()/rgba() -- no need to round-trip it through a probe
  // element + a second getComputedStyle() call just to re-parse it. That extra call,
  // done for every background/text/border check on every element, was the main cost
  // behind the toggle feeling slow on a page this size.
  function toRGBA(colorStr){
    if(!colorStr) return null;
    var m=colorStr.match(/rgba?\(([^)]+)\)/);
    if(!m) return null;
    var p=m[1].split(',').map(function(s){return parseFloat(s);});
    return {r:p[0],g:p[1],b:p[2],a:p.length>3?p[3]:1};
  }
  function luminance(rgb){ return (0.299*rgb.r+0.587*rgb.g+0.114*rgb.b)/255; }

  function rgbToHsl(r,g,b){
    r/=255; g/=255; b/=255;
    var max=Math.max(r,g,b), min=Math.min(r,g,b);
    var h=0,s=0,l=(max+min)/2;
    if(max!==min){
      var d=max-min;
      s = l>0.5 ? d/(2-max-min) : d/(max+min);
      switch(max){
        case r: h=(g-b)/d+(g<b?6:0); break;
        case g: h=(b-r)/d+2; break;
        default: h=(r-g)/d+4;
      }
      h/=6;
    }
    return [h,s,l];
  }

  // One consistent warm cream tone for every lightened background -- not a tint of
  // each panel's own original color. That per-panel-hue approach left some cards
  // reading as pale pink, others pale cyan, etc., which looked inconsistent; this
  // gives every panel across the whole site the same warm, neutral background.
  var LIGHT_BG=[255,253,248]; // card/panel fill
  // "Dark enough to keep" needs low perceived brightness AND a genuinely dark shade --
  // vivid purple/blue/red pass the brightness test alone but still read as neon.
  function isDarkText(rgb){
    return luminance(rgb)<=TEXT_MAX_LUM && rgbToHsl(rgb.r,rgb.g,rgb.b)[2]<=0.36;
  }
  // Dark AND not a strong color (dark gray/black) -- dark maroon/purple/teal still count as "colored"
  // (Very dark colors -- e.g. the navy body color itself -- count as final, so the
  //  re-apply pass doesn't treat navy as "blue" and bump it to royal blue.)
  function isNeutralDark(rgb){
    var hsl=rgbToHsl(rgb.r,rgb.g,rgb.b);
    return isDarkText(rgb) && (hsl[1]<=0.35 || hsl[2]<=0.2);
  }
  function isSaturated(rgb){ return rgbToHsl(rgb.r,rgb.g,rgb.b)[1]>0.25; }
  // Each neon accent maps to a deep "jewel" tone of the same hue family, so headings
  // and accents keep their color identity but read as professional on a light page.
  // Every tone here has at least 4.5:1 contrast on the white card color.
  function jewelFor(rgb){
    var h=rgbToHsl(rgb.r,rgb.g,rgb.b)[0]*360;
    if(h>=330 || h<15)  return 'rgb(138,36,50)';   // red / pink / magenta -> wine
    if(h<40)  return 'rgb(154,74,20)';             // orange -> burnt orange (gold ~44deg stays gold)
    if(h<70)  return 'rgb(135,100,26)';            // yellow / gold -> antique gold
    if(h<165) return 'rgb(45,106,62)';             // green -> forest
    if(h<200) return 'rgb(14,103,115)';            // cyan -> deep teal
    if(h<250) return 'rgb(31,78,140)';             // blue -> royal blue
    if(h<290) return 'rgb(74,58,143)';             // purple -> indigo
    return 'rgb(90,45,130)';                       // violet-magenta -> plum
  }
  // Text color in light mode: neutral (white/gray) text -> navy body color;
  // strongly colored text (headings, labels, accents) -> its jewel tone.
  // Pale tints (lavender/ice-blue "white" body text) count as neutral, not as an accent.
  function lightTextFor(rgb){
    var hsl=rgbToHsl(rgb.r,rgb.g,rgb.b);
    return (hsl[1]>0.35 && hsl[2]<=0.72) ? jewelFor(rgb) : TEXT_DARK_STR;
  }
  function lightenRGB(rgb){
    var a=(rgb.a===undefined?1:rgb.a);
    if(a>MIN_ALPHA) a=Math.max(a,OPAQUE_FLOOR); // opaque, so it fully covers whatever's behind it
    return {r:LIGHT_BG[0],g:LIGHT_BG[1],b:LIGHT_BG[2],a:a};
  }
  function rgbaStr(rgb){
    var a=(rgb.a===undefined?1:rgb.a);
    return a>=1 ? 'rgb('+rgb.r+','+rgb.g+','+rgb.b+')' : 'rgba('+rgb.r+','+rgb.g+','+rgb.b+','+a+')';
  }

  // 'light' = every visible stop is already a light, near-opaque color (keep it);
  // 'panel' = has a solid-ish stop that is dark or saturated (replace with cream);
  // 'glow'  = only faint translucent tints (decorative glow -- just remove it).
  function classifyGradient(str){
    var stops=str.match(/rgba?\([^)]+\)/g) || [];
    var anySolid=false, allLight=true;
    for(var i=0;i<stops.length;i++){
      var p=stops[i].replace(/rgba?\(|\)/g,'').split(',').map(function(s){return parseFloat(s);});
      var rgb={r:p[0],g:p[1],b:p[2],a:p.length>3?p[3]:1};
      if(rgb.a<=MIN_ALPHA) continue;
      if(rgb.a>=0.6) anySolid=true;
      if(rgb.a<0.85 || luminance(rgb)<LIGHT_BG_MIN || isSaturated(rgb)) allLight=false; // bright yellow etc. isn't "light" here
    }
    if(allLight && anySolid) return 'light';
    return anySolid ? 'panel' : 'glow';
  }
  function isTextClip(cs){
    var bc = cs.getPropertyValue('-webkit-background-clip') || cs.backgroundClip || '';
    return bc.indexOf('text')!==-1;
  }

  function shouldSkip(el){
    if(SKIP_TAGS[el.tagName]) return true;
    if(el.id==='vt-toggle-btn') return true;
    // Sidebar nav buttons are styled by the light-mode stylesheet (navy buttons, white text)
    if(el.closest && el.closest('.sb-item')) return true;
    // home.html's sidebar LIGHT/DARK switch is styled by the stylesheet too
    if(el.closest && el.closest('#vpn-theme-toggle')) return true;
    // home.html's tablet-nav yellow file-folder tabs read well in both themes
    if(el.closest && el.closest('.rtab')) return true;
    // Any element that styles itself for both themes opts out with data-vt-skip
    if(el.closest && el.closest('[data-vt-skip]')) return true;
    return false;
  }

  function neutralizeBackdrops(){
    // Already done (re-apply pass) -- recording again would save the light values as "originals"
    if(bodyRec) return;
    // Body: drop any decorative gradient/photo entirely for a clean flat base.
    bodyRec={bg:document.body.style.backgroundColor||'', bgImg:document.body.style.backgroundImage||''};
    document.body.style.setProperty('background-image','none','important');
    document.body.style.setProperty('background-color',PAGE_BG,'important');

    // Decorative <img> atmosphere: absolute/fixed + dim.
    var imgs=document.querySelectorAll('img');
    for(var i=0;i<imgs.length;i++){
      var img=imgs[i];
      var cs=getComputedStyle(img);
      var op=parseFloat(cs.opacity);
      if(isNaN(op)) op=1;
      if((cs.position==='absolute'||cs.position==='fixed') && op<BACKDROP_OPACITY){
        hiddenImgs.push({el:img, prev:img.style.visibility||''});
        img.style.setProperty('visibility','hidden','important');
      }
    }

    // Decorative url() backgrounds: large area.
    var all=document.body.querySelectorAll('*');
    for(var j=0;j<all.length;j++){
      var el=all[j];
      if(shouldSkip(el)) continue;
      var bcs=getComputedStyle(el);
      if(bcs.backgroundImage && bcs.backgroundImage.indexOf('url(')!==-1){
        var rect=el.getBoundingClientRect();
        if(rect.width*rect.height>BACKDROP_AREA){
          hiddenBgUrls.push({el:el, bgImg:el.style.backgroundImage||''});
          el.style.setProperty('background-image','none','important');
        }
      }
    }
  }

  function restoreBackdrops(){
    if(bodyRec){
      if(bodyRec.bg) document.body.style.setProperty('background-color',bodyRec.bg); else document.body.style.removeProperty('background-color');
      if(bodyRec.bgImg) document.body.style.setProperty('background-image',bodyRec.bgImg); else document.body.style.removeProperty('background-image');
      bodyRec=null;
    }
    hiddenImgs.forEach(function(r){ if(r.prev) r.el.style.setProperty('visibility',r.prev); else r.el.style.removeProperty('visibility'); });
    hiddenImgs=[];
    hiddenBgUrls.forEach(function(r){ if(r.bgImg) r.el.style.setProperty('background-image',r.bgImg); else r.el.style.removeProperty('background-image'); });
    hiddenBgUrls=[];
  }

  function hexToRGB(str){
    var m=(str||'').trim().match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
    if(!m) return toRGBA((str||'').trim());
    var h=m[1].length===3 ? m[1].replace(/./g,'$&$&') : m[1];
    return {r:parseInt(h.slice(0,2),16), g:parseInt(h.slice(2,4),16), b:parseInt(h.slice(4,6),16), a:1};
  }
  function tint(rgbStr, amt){ // mix a jewel tone with white
    var c=toRGBA(rgbStr);
    return 'rgb('+Math.round(c.r*amt+255*(1-amt))+','+Math.round(c.g*amt+255*(1-amt))+','+Math.round(c.b*amt+255*(1-amt))+')';
  }
  // Each page banner already defines its own two accent colors (--vh1/--vh2). In light
  // mode the banner becomes a soft wash of those colors' jewel tones with a solid accent
  // bar, and its title takes the deep accent color -- every page stays recognizable.
  function styleHero(el, cs){
    var a1=hexToRGB(cs.getPropertyValue('--vh1')) || {r:176,g:141,b:60};
    var a2=hexToRGB(cs.getPropertyValue('--vh2')) || a1;
    var j1=jewelFor(a1), j2=jewelFor(a2);
    var rec={el:el, bg:el.style.backgroundColor||'', bgImg:el.style.backgroundImage||'', color:el.style.color||'', textShadow:'', filter:'', fill:'', border:{borderBottomColor:el.style.borderBottomColor||''}, extra:{'border-bottom-width':el.style.borderBottomWidth||'','border-bottom-style':el.style.borderBottomStyle||''}};
    el.style.setProperty('background-image','linear-gradient(120deg,'+tint(j1,0.16)+' 0%,rgb(255,253,248) 55%,'+tint(j2,0.12)+' 100%)','important');
    el.style.setProperty('background-color','rgb(255,253,248)','important');
    el.style.setProperty('border-bottom-color', j1, 'important');
    el.style.setProperty('border-bottom-width','4px','important');
    el.style.setProperty('border-bottom-style','solid','important');
    touched.push(rec); touchedSet.add(el);
    el.setAttribute('data-vt-accent', j1);
    // Titles inside the banner take the deep accent color
    el.querySelectorAll('.vh-title,.ms-hero-title,.vh-eyebrow').forEach(function(t){
      var trec={el:t, bg:t.style.backgroundColor||'', bgImg:t.style.backgroundImage||'', color:t.style.color||'', textShadow:'', filter:'', fill:t.style.getPropertyValue('-webkit-text-fill-color')||''};
      var col = t.classList.contains('vh-eyebrow') ? j2 : j1;
      t.style.setProperty('background-image','none','important');
      t.style.setProperty('color', col, 'important');
      t.style.setProperty('-webkit-text-fill-color', col, 'important');
      touched.push(trec); touchedSet.add(t);
    });
    // Decorative dark layers inside the banner (logo backing disc, scanlines, glyphs)
    el.querySelectorAll('.vh-logo-bg,.vh-logo-ring,.vh-stripe,.vh-scan,.ms-hero-scan,.ms-logo-glow').forEach(function(d){
      var drec={el:d, bg:d.style.backgroundColor||'', bgImg:d.style.backgroundImage||'', color:'', textShadow:'', filter:'', fill:''};
      if(d.classList.contains('vh-logo-bg')){
        d.style.setProperty('background-image','none','important');
        d.style.setProperty('background-color','#ffffff','important');
      } else if(d.classList.contains('vh-logo-ring')){
        d.style.setProperty('background-image','conic-gradient('+j1+','+j2+','+j1+')','important');
      } else {
        d.style.setProperty('background-image','none','important');
        d.style.setProperty('background-color','transparent','important');
      }
      touched.push(drec); touchedSet.add(d);
    });
  }

  // Recolors one element. Shared by the initial full-DOM walk and the
  // MutationObserver (for content added/cloned after the initial pass --
  // e.g. ticker/marquee text that JS duplicates for a seamless loop).
  function processElement(el){
    if(shouldSkip(el)) return;
    if(el.nodeType!==1) return;
    // Recolor each element once per light-mode session; a second pass would record our own
    // light values as the "original" inline styles and break the switch back to dark.
    if(touchedSet.has(el)) return;
    var cs=getComputedStyle(el);
    // Page banners get their own light treatment (tinted with the banner's accent colors)
    if(el.classList && (el.classList.contains('view-hero') || el.classList.contains('ms-hero'))){
      styleHero(el, cs);
      return;
    }
    var bgImgVal=cs.backgroundImage;
    // On a page this size the computed value can come back stale ("none") right after a
    // theme switch; an inline gradient on the element itself is the reliable source.
    if((!bgImgVal || bgImgVal==='none') && el.style.backgroundImage && el.style.backgroundImage.indexOf('gradient(')!==-1){
      bgImgVal=el.style.backgroundImage;
    }
    var isRasterImage = bgImgVal && bgImgVal.indexOf('url(')!==-1;
    var isGradient = bgImgVal && bgImgVal.indexOf('gradient(')!==-1;
    var isTextGradient = isGradient && isTextClip(cs);
    var rec={el:el, bg:el.style.backgroundColor||'', bgImg:el.style.backgroundImage||'', color:el.style.color||'', textShadow:el.style.textShadow||'', filter:el.style.filter||'', fill:el.style.getPropertyValue('-webkit-text-fill-color')||''};
    var changed=false;

    // STRICT LIGHT MODE: light backgrounds + one dark text color. No neon, no tints.
    if(isTextGradient){
      // Gradient-filled headline text -> solid jewel tone of its first strong color (navy if none)
      var stops=(bgImgVal.match(/rgba?\([^)]+\)/g)||[]).map(toRGBA).filter(function(c){return c && c.a>MIN_ALPHA;});
      var lead=stops.filter(function(c){return rgbToHsl(c.r,c.g,c.b)[1]>0.35;})[0];
      var headCol=lead ? jewelFor(lead) : TEXT_DARK_STR;
      el.style.setProperty('background-image','none','important');
      el.style.setProperty('-webkit-text-fill-color', headCol, 'important');
      el.style.setProperty('color', headCol, 'important');
      changed=true;
    } else if(isGradient){
      var g=classifyGradient(bgImgVal);
      if(g!=='light'){
        el.style.setProperty('background-image','none','important');
        // a real panel/button gets the cream fill; a faint decorative glow just disappears
        if(g==='panel') el.style.setProperty('background-color', rgbaStr({r:LIGHT_BG[0],g:LIGHT_BG[1],b:LIGHT_BG[2],a:1}), 'important');
        changed=true;
      }
    } else if(!isRasterImage){
      var bgRgb=toRGBA(cs.backgroundColor);
      if(bgRgb && bgRgb.a>0 && bgRgb.a<=MIN_ALPHA && isSaturated(bgRgb)){
        // even a very faint colored wash reads as a pink/cyan tint on the off-white page
        el.style.setProperty('background-color','transparent','important');
        changed=true;
      } else if(bgRgb && bgRgb.a>MIN_ALPHA){
        if(luminance(bgRgb)<LIGHT_BG_MIN || (bgRgb.a>=0.6 && isSaturated(bgRgb))){
          // dark, mid-tone, or bright colored fill (neon buttons, yellow nav buttons, badges) -> white card
          el.style.setProperty('background-color', rgbaStr(lightenRGB(bgRgb)), 'important');
          changed=true;
        } else if(bgRgb.a<0.6 && rgbToHsl(bgRgb.r,bgRgb.g,bgRgb.b)[1]>0.15){
          // translucent colored tint -> reads as pastel pink/cyan on cream; drop it
          el.style.setProperty('background-color','transparent','important');
          changed=true;
        }
      }
    }

    if(!isRasterImage){
      var colRgb=toRGBA(cs.color);
      // Anything that isn't already a neutral dark becomes navy or its jewel tone
      if(colRgb && colRgb.a>MIN_ALPHA && !isNeutralDark(colRgb)){
        el.style.setProperty('color', lightTextFor(colRgb), 'important');
        changed=true;
      }
      var fill=cs.getPropertyValue('-webkit-text-fill-color');
      var fillRgb=toRGBA(fill);
      if(fillRgb && fillRgb.a>MIN_ALPHA && !isNeutralDark(fillRgb)){
        el.style.setProperty('-webkit-text-fill-color', lightTextFor(fillRgb), 'important');
        changed=true;
      }
    }

    // Neon drop-shadow glows (filter) -> off. Images are skipped above, so logo art keeps its look.
    if(cs.filter && cs.filter.indexOf('drop-shadow')!==-1){
      el.style.setProperty('filter','none','important');
      changed=true;
    }

    // Borders: thick accent borders -> jewel tone; every other colored/light border -> thin navy hairline
    var BORDER_SIDES=['borderTopColor','borderRightColor','borderBottomColor','borderLeftColor'];
    var BORDER_WIDTH={borderTopColor:'borderTopWidth',borderRightColor:'borderRightWidth',borderBottomColor:'borderBottomWidth',borderLeftColor:'borderLeftWidth'};
    var BORDER_CSS_PROP={borderTopColor:'border-top-color',borderRightColor:'border-right-color',borderBottomColor:'border-bottom-color',borderLeftColor:'border-left-color'};
    for(var s=0;s<BORDER_SIDES.length;s++){
      var side=BORDER_SIDES[s];
      var borderRgb=toRGBA(cs[side]);
      if(borderRgb && borderRgb.a>MIN_ALPHA && parseFloat(cs[BORDER_WIDTH[side]])>0 && !isNeutralDark(borderRgb)){
        if(!rec.border) rec.border={};
        rec.border[side]=el.style[side]||'';
        // thick accent bars keep their color family as a jewel tone (gold if neutral); thin lines -> hairline
        var thick=parseFloat(cs[BORDER_WIDTH[side]])>=2;
        el.style.setProperty(BORDER_CSS_PROP[side], thick ? (isSaturated(borderRgb) ? jewelFor(borderRgb) : GOLD) : HAIRLINE, 'important');
        changed=true;
      }
    }
    if(changed){ touched.push(rec); touchedSet.add(el); }
  }

  function applyLight(){
    neutralizeBackdrops();
    var all=document.body.querySelectorAll('*');
    for(var i=0;i<all.length;i++) processElement(all[i]);
    startObserver();
  }

  var observer=null;
  function startObserver(){
    if(observer) return;
    observer=new MutationObserver(function(mutations){
      for(var i=0;i<mutations.length;i++){
        var added=mutations[i].addedNodes;
        for(var j=0;j<added.length;j++){
          var node=added[j];
          if(node.nodeType!==1) continue;
          processElement(node);
          var descendants=node.querySelectorAll ? node.querySelectorAll('*') : [];
          for(var k=0;k<descendants.length;k++) processElement(descendants[k]);
        }
      }
    });
    observer.observe(document.body, {childList:true, subtree:true});
  }
  function stopObserver(){
    if(observer){ observer.disconnect(); observer=null; }
  }

  function revertLight(){
    stopObserver();
    for(var i=0;i<touched.length;i++){
      var rec=touched[i];
      if(rec.bg) rec.el.style.setProperty('background-color', rec.bg); else rec.el.style.removeProperty('background-color');
      if(rec.bgImg) rec.el.style.setProperty('background-image', rec.bgImg); else rec.el.style.removeProperty('background-image');
      if(rec.color) rec.el.style.setProperty('color', rec.color); else rec.el.style.removeProperty('color');
      if(rec.textShadow) rec.el.style.setProperty('text-shadow', rec.textShadow); else rec.el.style.removeProperty('text-shadow');
      if(rec.filter) rec.el.style.setProperty('filter', rec.filter); else rec.el.style.removeProperty('filter');
      if(rec.fill) rec.el.style.setProperty('-webkit-text-fill-color', rec.fill); else rec.el.style.removeProperty('-webkit-text-fill-color');
      if(rec.extra){
        for(var prop in rec.extra){
          if(rec.extra[prop]) rec.el.style.setProperty(prop, rec.extra[prop]); else rec.el.style.removeProperty(prop);
        }
      }
      if(rec.border){
        for(var side in rec.border){
          if(rec.border[side]) rec.el.style[side]=rec.border[side]; else rec.el.style.removeProperty(side.replace(/([A-Z])/g,'-$1').toLowerCase());
        }
      }
    }
    touched=[];
    touchedSet=new WeakSet();
    restoreBackdrops();
  }

  function current(){ return document.documentElement.getAttribute('data-theme')||'dark'; }
  function apply(theme, isInit){
    if(theme==='light'){
      document.documentElement.setAttribute('data-theme','light');
      applyLight();
    } else {
      document.documentElement.removeAttribute('data-theme');
      if(!isInit) revertLight();
    }
    try{localStorage.setItem(KEY,theme);}catch(e){}
    var btn=document.getElementById('vt-toggle-btn');
    if(btn){
      btn.textContent = theme==='light' ? '🌙' : '☀️';
      btn.setAttribute('aria-pressed', theme==='light' ? 'true' : 'false');
    }
    try{ document.dispatchEvent(new CustomEvent('vpn-theme-change',{detail:theme})); }catch(e){}
  }
  // Shared entry point so other buttons (e.g. home.html's sidebar toggle) use this same light mode
  window.vpnThemeToggle=function(){ apply(current()==='light' ? 'dark' : 'light'); };

  function injectStyle(){
    if(document.getElementById('vt-toggle-style')) return;
    var css=
      /* Docked top-right, below the ticker + nav bar (~92px tall on mobile) so it
         never sits under scrolling ticker text, and clear of the bottom-corner
         clutter (mascot, music player, back-to-top). */
      '#vt-toggle-btn{position:fixed;top:6rem;right:0.6rem;z-index:2147483647;width:38px;height:38px;border-radius:50%;border:1.5px solid rgba(0,245,255,0.6);background:rgba(10,0,26,0.88);color:rgba(0,245,255,0.9);font-size:1.15rem;line-height:1;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 0 10px rgba(0,245,255,0.3);transition:transform 0.15s,box-shadow 0.15s,opacity 0.15s;padding:0;font-family:inherit;opacity:0.9;}'
      +'#vt-toggle-btn:hover{opacity:1;transform:scale(1.12);box-shadow:0 0 18px rgba(0,245,255,0.6),0 0 34px rgba(0,245,255,0.25);border-color:#00f5ff;color:#00f5ff;}'
      +'#vt-toggle-btn:active{transform:scale(0.94);}'
      +'@media print{#vt-toggle-btn{display:none!important;}}'
      /* Text size controls: stacked under the moon button. Sized in px so they
         don't grow with the text they control. */
      +'#vt-text-ctrl{position:fixed;top:calc(6rem + 46px);right:0.6rem;z-index:2147483647;display:flex;flex-direction:column;gap:6px;align-items:center;}'
      +'#vt-text-ctrl button{width:38px;height:32px;border-radius:9px;border:1.5px solid rgba(0,245,255,0.6);background:rgba(10,0,26,0.88);color:#7ff7ff;font:700 14px/1 Rajdhani,Arial,sans-serif;letter-spacing:0;cursor:pointer;padding:0;display:flex;align-items:center;justify-content:center;box-shadow:0 0 8px rgba(0,245,255,0.25);transition:transform 0.15s,background 0.15s;}'
      +'#vt-text-ctrl button:hover:not(:disabled){transform:scale(1.08);background:rgba(0,245,255,0.18);}'
      +'#vt-text-ctrl button:disabled{opacity:0.35;cursor:default;}'
      +'#vt-text-toast{position:absolute;right:46px;top:16px;white-space:nowrap;font:700 13px/1 Rajdhani,Arial,sans-serif;letter-spacing:0.08em;padding:6px 10px;border-radius:6px;background:rgba(10,0,26,0.92);color:#7ff7ff;border:1px solid rgba(0,245,255,0.5);opacity:0;pointer-events:none;transition:opacity 0.2s;}'
      +'#vt-text-toast.show{opacity:1;}'
      +'html[data-theme="light"] #vt-text-ctrl button{background:#13294b;color:#f3d27a;border:2px solid #b08d3c;}'
      +'html[data-theme="light"] #vt-text-ctrl button:hover:not(:disabled){background:#1d3a66;}'
      +'html[data-theme="light"] #vt-text-toast{background:#13294b;color:#f3d27a;border-color:#b08d3c;}'
      +'@media print{#vt-text-ctrl{display:none!important;}}'
      /* Quick dock (portrait only): one ⚙ button + labeled menu replaces the corner clutter */
      +'#vt-dock{display:none;}'
      +'@media (orientation:portrait) and (max-width:1100px){'
      +  '#vt-toggle-btn,#vt-text-ctrl,#vpn-mp-fab,#vpn-back-top{display:none!important;}'
      +  '#vt-dock{display:flex;flex-direction:column;align-items:flex-end;gap:10px;position:fixed;right:14px;bottom:calc(18px + env(safe-area-inset-bottom,0px));z-index:2147483646;font:700 15px/1 Rajdhani,Arial,sans-serif;}'
      +  '#gw-fab-home{width:58px!important;height:58px!important;}'
      +'}'
      /* above home.html's phone bottom nav bar */
      +'@media (orientation:portrait) and (max-width:900px){body:has(#vpn-bottom-nav) #vt-dock{bottom:calc(64px + 14px + env(safe-area-inset-bottom,0px));}}'
      +'#vt-dock-btn{width:52px;height:52px;border-radius:50%;border:2px solid rgba(0,245,255,0.7);background:rgba(8,0,24,0.94);color:#7ff7ff;font-size:24px;line-height:1;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 0 14px rgba(0,245,255,0.35);padding:0;}'
      +'#vt-dock-panel{display:none;flex-direction:column;gap:8px;padding:12px;min-width:200px;border-radius:14px;background:rgba(8,0,24,0.96);border:1.5px solid rgba(0,245,255,0.5);box-shadow:0 8px 30px rgba(0,0,0,0.6);}'
      +'#vt-dock.open #vt-dock-panel{display:flex;}'
      +'.vt-dock-item{display:flex;align-items:center;gap:8px;width:100%;padding:11px 14px;border-radius:9px;border:1px solid rgba(0,245,255,0.3);background:rgba(0,245,255,0.06);color:#d8f4ff;font:700 15px/1 Rajdhani,Arial,sans-serif;letter-spacing:0.04em;cursor:pointer;text-align:left;}'
      +'.vt-dock-row{display:flex;align-items:center;gap:8px;padding:6px 6px 6px 14px;border-radius:9px;border:1px solid rgba(0,245,255,0.3);background:rgba(0,245,255,0.06);color:#d8f4ff;}'
      +'.vt-dock-lbl{flex:1;letter-spacing:0.08em;font-size:13px;opacity:0.8;}'
      +'#vt-dock-pct{min-width:44px;text-align:center;font-size:14px;}'
      +'.vt-dock-sm{width:40px;height:36px;border-radius:8px;border:1px solid rgba(0,245,255,0.5);background:rgba(0,245,255,0.1);color:#7ff7ff;font:700 15px/1 Rajdhani,Arial,sans-serif;cursor:pointer;padding:0;}'
      +'.vt-dock-sm:disabled{opacity:0.35;cursor:default;}'
      +'html[data-theme="light"] #vt-dock-btn{background:#13294b;color:#f3d27a;border-color:#b08d3c;}'
      +'html[data-theme="light"] #vt-dock-panel{background:#fffdf8;border-color:#b08d3c;}'
      +'html[data-theme="light"] .vt-dock-item,html[data-theme="light"] .vt-dock-row{background:#13294b;border-color:#13294b;color:#fffdf8;-webkit-text-stroke:0;}'
      +'html[data-theme="light"] .vt-dock-sm{background:rgba(243,210,122,0.15);border-color:#b08d3c;color:#f3d27a;-webkit-text-stroke:0;}'
      +'html[data-theme="light"] #vt-dock *{-webkit-text-stroke:0!important;}'
      +'@media print{#vt-dock{display:none!important;}}'
      /* Phones: keep home.html's search bar clear of the corner controls (landscape still shows them) */
      +'@media(max-width:900px) and (orientation:landscape){#vpnSearchBar{padding-right:56px!important;box-sizing:border-box;}}'
      /* Light mode, stylesheet half: these can't be handled per-element from JS
         (pseudo-elements, every glow) and vanish automatically when data-theme is removed. */
      +'html[data-theme="light"] body *:not(img):not(video):not(canvas){text-shadow:none!important;box-shadow:none!important;}'
      +'html[data-theme="light"] body *::before,html[data-theme="light"] body *::after{text-shadow:none!important;box-shadow:none!important;}'
      +'html[data-theme="light"] body::before,html[data-theme="light"] body::after{display:none!important;}'
      /* Neon glow filters on logo/mascot art read as pink smudges on a light page */
      +'html[data-theme="light"] img{filter:none!important;}'
      /* Bolder text: the thin display fonts relied on neon glow for weight in dark mode.
         A hairline stroke in the text's own color thickens every font evenly. */
      +'html[data-theme="light"] body{-webkit-font-smoothing:antialiased;}'
      +'html[data-theme="light"] body *:not(svg):not(svg *){-webkit-text-stroke:0.35px currentColor;}'
      +'html[data-theme="light"] input,html[data-theme="light"] textarea,html[data-theme="light"] select{-webkit-text-stroke:0!important;font-weight:600;}'
      +'html[data-theme="light"] #starfield,html[data-theme="light"] #scene-canvas,html[data-theme="light"] #petals-canvas,html[data-theme="light"] .scan-line,html[data-theme="light"] .bg-glow,'
      +'html[data-theme="light"] #vpn-logo-petals,html[data-theme="light"] #vpn-logo-matrix,html[data-theme="light"] #vpn-matrix-canvas,html[data-theme="light"] #vpn-petals-canvas{display:none!important;}'
      /* Decorative pseudo-element layers (neon gradient lines, glows, dark overlays) have no
         light-mode equivalent -- strip their fills. Text content in pseudo-elements is unaffected. */
      +'html[data-theme="light"] body *::before,html[data-theme="light"] body *::after{background-image:none!important;background-color:transparent!important;}'
      /* ...except the file-folder tab on home.html's tablet nav buttons */
      +'html[data-theme="light"] .rtab::before{background-color:#ffe066!important;}'
      +'html[data-theme="light"] .rtab.rtab-active::before{background-color:#fffbe6!important;}'
      +'html[data-theme="light"] ::placeholder{color:#6b6460!important;opacity:1!important;-webkit-text-fill-color:#6b6460!important;}'
      /* Corner moon button in light mode: navy disc with a gold ring, fully visible */
      +'html[data-theme="light"] #vt-toggle-btn{background:#13294b;color:#f3d27a;border:2px solid #b08d3c;opacity:1;}'
      +'html[data-theme="light"] #vt-toggle-btn:hover{background:#1d3a66;border-color:#d4ad55;transform:scale(1.1);}'
      /* home.html sidebar LIGHT/DARK switch: navy bar, white label, gold track + thumb */
      +'html[data-theme="light"] #vpn-theme-toggle{background:#13294b!important;color:#fffdf8!important;border-top:1px solid #b08d3c!important;-webkit-text-stroke:0!important;}'
      +'html[data-theme="light"] #vpn-theme-toggle *{color:#fffdf8!important;-webkit-text-fill-color:#fffdf8!important;-webkit-text-stroke:0!important;}'
      +'html[data-theme="light"] #vpn-theme-toggle:hover{background:#1d3a66!important;}'
      +'html[data-theme="light"] #vpn-theme-toggle .tgl-track{background:rgba(176,141,60,0.35)!important;border:1px solid #b08d3c!important;}'
      +'html[data-theme="light"] #vpn-theme-toggle .tgl-thumb{background:#f3d27a!important;}'
      /* Sidebar nav: navy buttons with white text and a gold edge; active/hover get a gold fill bar */
      +'html[data-theme="light"] #vpn-sidebar{border-right:1px solid rgba(15,27,45,0.12)!important;}'
      +'html[data-theme="light"] .sb-item{background:#13294b!important;background-image:none!important;color:#fffdf8!important;-webkit-text-fill-color:#fffdf8!important;border:1px solid #13294b!important;border-left:4px solid #b08d3c!important;-webkit-text-stroke:0!important;}'
      +'html[data-theme="light"] .sb-item *{color:#fffdf8!important;-webkit-text-fill-color:#fffdf8!important;-webkit-text-stroke:0!important;}'
      +'html[data-theme="light"] .sb-item:hover{background:#1d3a66!important;}'
      +'html[data-theme="light"] .sb-item.sb-active{background:#b08d3c!important;border-color:#b08d3c!important;color:#0f1b2d!important;-webkit-text-fill-color:#0f1b2d!important;}'
      +'html[data-theme="light"] .sb-item.sb-active *{color:#0f1b2d!important;-webkit-text-fill-color:#0f1b2d!important;}';
    var s=document.createElement('style');
    s.id='vt-toggle-style'; s.textContent=css;
    document.head.appendChild(s);
  }
  function injectButton(){
    if(document.getElementById('vt-toggle-btn')) return;
    var btn=document.createElement('button');
    btn.id='vt-toggle-btn'; btn.type='button';
    btn.title='Toggle light / dark mode';
    btn.setAttribute('aria-label','Toggle light and dark mode');
    btn.setAttribute('aria-pressed', current()==='light' ? 'true' : 'false');
    btn.textContent = current()==='light' ? '🌙' : '☀️';
    btn.addEventListener('click', function(){ apply(current()==='light' ? 'dark' : 'light'); });
    document.body.appendChild(btn);
  }

  // Re-walk the DOM and fix anything the first pass missed. On a very large page,
  // a handful of elements can occasionally read a stale computed style back when
  // thousands of getComputedStyle/style-mutation calls fire in one tight synchronous
  // loop; re-running shortly after (and again once the page is fully settled) is cheap
  // and catches those without needing to chase the exact cause on every huge page.
  function reapplyIfLight(){
    if(current()==='light') applyLight();
  }

  // ── TEXT SIZE (A− / A+) ─────────────────────────────────────────
  // Nearly all text on the site is sized in rem, so scaling the root font size
  // scales every word without zooming images or breaking the layout. Inline
  // !important on <html>/<body> beats home.html's "font-size:16px !important".
  var TEXT_KEY='vpn_text_scale';
  var TEXT_STEPS=[0.9,1,1.1,1.25,1.4,1.6];
  var baseHtmlPx=null, baseBodyPx=null, toastTimer=null;
  function savedTextStep(){
    var v=1; try{ v=parseFloat(localStorage.getItem(TEXT_KEY))||1; }catch(e){}
    var i=TEXT_STEPS.indexOf(v); return i===-1 ? 1 : i;
  }
  function applyTextScale(step, announce){
    var scale=TEXT_STEPS[step];
    var root=document.documentElement, body=document.body;
    if(baseHtmlPx===null){
      baseHtmlPx=parseFloat(getComputedStyle(root).fontSize)||16;
      baseBodyPx=parseFloat(getComputedStyle(body).fontSize)||baseHtmlPx;
    }
    if(scale===1){
      root.style.removeProperty('font-size'); body.style.removeProperty('font-size');
    } else {
      root.style.setProperty('font-size',(baseHtmlPx*scale)+'px','important');
      body.style.setProperty('font-size',(baseBodyPx*scale)+'px','important');
    }
    try{ localStorage.setItem(TEXT_KEY, String(scale)); }catch(e){}
    ['vt-text-minus','vt-dock-minus'].forEach(function(id){ var b=document.getElementById(id); if(b) b.disabled = step===0; });
    ['vt-text-plus','vt-dock-plus'].forEach(function(id){ var b=document.getElementById(id); if(b) b.disabled = step===TEXT_STEPS.length-1; });
    var pct=document.getElementById('vt-dock-pct'); if(pct) pct.textContent=Math.round(scale*100)+'%';
    if(announce){
      var t=document.getElementById('vt-text-toast');
      if(t){
        t.textContent='TEXT '+Math.round(scale*100)+'%';
        t.classList.add('show');
        clearTimeout(toastTimer);
        toastTimer=setTimeout(function(){ t.classList.remove('show'); },1200);
      }
    }
  }
  function injectTextControls(){
    if(document.getElementById('vt-text-ctrl')) return;
    var wrap=document.createElement('div');
    wrap.id='vt-text-ctrl'; wrap.setAttribute('data-vt-skip','');
    wrap.innerHTML=
      '<button type="button" id="vt-text-plus" title="Bigger text" aria-label="Increase text size">A+</button>'+
      '<button type="button" id="vt-text-minus" title="Smaller text" aria-label="Decrease text size">A−</button>'+
      '<div id="vt-text-toast" role="status" aria-live="polite"></div>';
    document.body.appendChild(wrap);
    textStep=savedTextStep();
    document.getElementById('vt-text-plus').addEventListener('click',function(){ textBigger(true); });
    document.getElementById('vt-text-minus').addEventListener('click',function(){ textSmaller(true); });
    applyTextScale(textStep,false);
  }
  var textStep=1;
  function textBigger(announce){ if(textStep<TEXT_STEPS.length-1){ textStep++; applyTextScale(textStep,announce); } }
  function textSmaller(announce){ if(textStep>0){ textStep--; applyTextScale(textStep,announce); } }

  // ── PORTRAIT QUICK DOCK ─────────────────────────────────────────
  // On portrait phones/tablets the separate corner buttons (light/dark, A+/A-,
  // music, back-to-top) become one ⚙ button that opens a labeled menu. Desktop
  // and landscape keep the individual buttons. The page's own music player and
  // back-to-top button are reused when present, so this works on every page.
  function injectDock(){
    if(document.getElementById('vt-dock')) return;
    var dock=document.createElement('div');
    dock.id='vt-dock'; dock.setAttribute('data-vt-skip','');
    var hasMusic = !!(window.vpnMPExpand && document.getElementById('vpn-mp-fab'));
    dock.innerHTML=
      '<div id="vt-dock-panel" role="menu" aria-label="Quick settings">'+
        '<button type="button" class="vt-dock-item" id="vt-dock-theme"></button>'+
        '<div class="vt-dock-row"><span class="vt-dock-lbl">TEXT</span>'+
          '<button type="button" class="vt-dock-sm" id="vt-dock-minus" aria-label="Smaller text">A−</button>'+
          '<span id="vt-dock-pct">100%</span>'+
          '<button type="button" class="vt-dock-sm" id="vt-dock-plus" aria-label="Bigger text">A+</button></div>'+
        (hasMusic ? '<button type="button" class="vt-dock-item" id="vt-dock-music">🎵 Music player</button>' : '')+
        '<button type="button" class="vt-dock-item" id="vt-dock-top">↑ Back to top</button>'+
      '</div>'+
      '<button type="button" id="vt-dock-btn" aria-label="Quick settings" aria-expanded="false">⚙</button>';
    document.body.appendChild(dock);
    var btn=document.getElementById('vt-dock-btn');
    function setOpen(open){ dock.classList.toggle('open',open); btn.setAttribute('aria-expanded',open?'true':'false'); btn.textContent=open?'✕':'⚙'; }
    function syncTheme(){ document.getElementById('vt-dock-theme').textContent = current()==='light' ? '🌙 Dark mode' : '☀️ Light mode'; }
    btn.addEventListener('click',function(e){ e.stopPropagation(); setOpen(!dock.classList.contains('open')); });
    document.getElementById('vt-dock-theme').addEventListener('click',function(){ apply(current()==='light' ? 'dark' : 'light'); });
    document.getElementById('vt-dock-plus').addEventListener('click',function(){ textBigger(false); });
    document.getElementById('vt-dock-minus').addEventListener('click',function(){ textSmaller(false); });
    if(hasMusic) document.getElementById('vt-dock-music').addEventListener('click',function(){ setOpen(false); window.vpnMPExpand(); });
    document.getElementById('vt-dock-top').addEventListener('click',function(){ setOpen(false); window.scrollTo({top:0,behavior:'smooth'}); });
    document.addEventListener('click',function(e){ if(!dock.contains(e.target)) setOpen(false); });
    document.addEventListener('vpn-theme-change', syncTheme);
    syncTheme();
    applyTextScale(textStep,false); // fill in the % readout + disabled states
  }

  function init(){
    injectStyle();
    injectButton();
    injectTextControls();
    injectDock();
    if(current()==='light') applyLight();
    setTimeout(reapplyIfLight, 400);
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
