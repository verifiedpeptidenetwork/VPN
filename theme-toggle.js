/* VPN site-wide light/dark toggle — real color remap, not a page filter.

   What it does in light mode:
   - Lightens dark backgrounds (solid colors AND gradient stops) toward a
     clean, near-opaque light tint — opaque on purpose, so it fully covers
     whatever decorative texture/photo sits behind it instead of letting it
     ghost through (which is what a translucent dark-turned-light overlay
     would otherwise do).
   - Darkens near-white text for contrast, and clears any text-shadow glow
     on that text (a neon glow tuned for dark backgrounds turns into a muddy
     smear once the text itself goes dark).
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
  var DARK_THRESHOLD=0.32;        // bg luminance below this = "dark", gets lightened
  var LIGHT_TEXT_L=0.42;          // text HSL-lightness above this = "light", gets darkened
  var TEXT_TARGET_L=0.24;         // darkened text is pulled down to at most this HSL-lightness
  var TEXT_MIN_S=0.55;            // darkened text is boosted to at least this saturation (stays a real color, not gray-mud)
  var TEXT_MIN_ALPHA=0.92;        // darkened text is boosted to at least this opaque -- translucent "muted gray"
                                   // text read as faded-light against black, but the same low alpha reads as
                                   // faded-light against WHITE too, so it has to become solid to look dark
  var MIN_ALPHA=0.12;             // ignore near-fully-transparent colors
  var OPAQUE_FLOOR=0.96;          // lightened backgrounds become (at least) this opaque
  var BACKDROP_AREA=180000;       // px^2 — url() backgrounds bigger than this are treated as decorative texture
  var BACKDROP_OPACITY=0.6;       // decorative <img> opacity ceiling to be considered atmosphere, not content

  var touched=[];      // {el,bg,bgImg,color,textShadow} — recolored elements
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
  function hslToRgb(h,s,l){
    var r,g,b;
    if(s===0){ r=g=b=l; }
    else {
      var hue2rgb=function(p,q,t){
        if(t<0)t+=1; if(t>1)t-=1;
        if(t<1/6) return p+(q-p)*6*t;
        if(t<1/2) return q;
        if(t<2/3) return p+(q-p)*(2/3-t)*6;
        return p;
      };
      var q=l<0.5 ? l*(1+s) : l+s-l*s;
      var p=2*l-q;
      r=hue2rgb(p,q,h+1/3); g=hue2rgb(p,q,h); b=hue2rgb(p,q,h-1/3);
    }
    return [Math.round(r*255),Math.round(g*255),Math.round(b*255)];
  }

  // One consistent warm cream tone for every lightened background -- not a tint of
  // each panel's own original color. That per-panel-hue approach left some cards
  // reading as pale pink, others pale cyan, etc., which looked inconsistent; this
  // gives every panel across the whole site the same warm, neutral background.
  var LIGHT_BG=[253,246,230];
  // Yellow and gray accent borders read poorly against the cream background --
  // swapped for one consistent teal accent in light mode instead.
  var BORDER_ACCENT=[14,124,134];
  // Pink/magenta reads as a jarring, washed-out color choice in light mode --
  // swapped for one consistent dark red accent instead, same as the yellow->teal rule.
  var RED_ACCENT=[139,0,0];
  function isYellowOrGray(rgb){
    var hsl=rgbToHsl(rgb.r,rgb.g,rgb.b);
    if(hsl[1]<0.15) return true; // low saturation -- gray/neutral
    var hueDeg=hsl[0]*360;
    return hueDeg>=40 && hueDeg<=68; // yellow/gold band
  }
  // Yellow hue only (no gray) -- used for text, where gray/white should stay a
  // clean neutral dark gray via darkenRGB rather than being pulled to teal.
  function isYellowHue(hsl){
    if(hsl[1]<0.15) return false;
    var hueDeg=hsl[0]*360;
    return hueDeg>=40 && hueDeg<=68;
  }
  // Pink/magenta/hot-pink band -- stops short of true red (350-360) and true
  // purple/violet (<300) so it only catches colors that actually read as "pink".
  function isPinkHue(hsl){
    if(hsl[1]<0.15) return false;
    var hueDeg=hsl[0]*360;
    return hueDeg>=300 && hueDeg<=349;
  }
  function lightenRGB(rgb){
    var a=(rgb.a===undefined?1:rgb.a);
    if(a>MIN_ALPHA) a=Math.max(a,OPAQUE_FLOOR); // opaque, so it fully covers whatever's behind it
    return {r:LIGHT_BG[0],g:LIGHT_BG[1],b:LIGHT_BG[2],a:a};
  }
  // Pulls lightness down (keeping hue) so "that blue"/"that green" stays recognizably
  // that color but is dark enough to read on a light background, with saturation
  // boosted so it doesn't turn into gray mud.
  function darkenRGB(rgb){
    var hsl=rgbToHsl(rgb.r,rgb.g,rgb.b);
    var l=Math.min(hsl[2], TEXT_TARGET_L);
    // Only boost saturation for colors that were actually tinted (cyan/pink/green/etc).
    // Near-grayscale text (white/off-white/gray) has no real hue -- boosting it would
    // tint it an arbitrary color instead of a clean neutral dark gray.
    var s = hsl[1]>0.08 ? Math.max(hsl[1], TEXT_MIN_S) : hsl[1];
    var out=hslToRgb(hsl[0], s, l);
    var a=(rgb.a===undefined?1:rgb.a);
    if(a>MIN_ALPHA) a=Math.max(a, TEXT_MIN_ALPHA);
    return {r:out[0],g:out[1],b:out[2], a:a};
  }
  function rgbaStr(rgb){
    var a=(rgb.a===undefined?1:rgb.a);
    return a>=1 ? 'rgb('+rgb.r+','+rgb.g+','+rgb.b+')' : 'rgba('+rgb.r+','+rgb.g+','+rgb.b+','+a+')';
  }

  // True if this gradient has any solid-ish dark stop -- i.e. it's a decorative
  // dark-mode vignette/panel background, not something to preserve as a gradient.
  // These often pair a near-opaque dark middle with low-alpha (<MIN_ALPHA) tinted
  // edges for mood -- remapping stop-by-stop would leave those edges nearly
  // transparent (since they never individually cross MIN_ALPHA), letting whatever
  // sits behind bleed through unevenly. Simpler and more reliable: once any stop
  // says "this is a dark decorative background", collapse the WHOLE thing to one
  // flat opaque cream fill instead of trying to keep a gradient shape.
  function gradientHasDarkStop(str){
    var stops=str.match(/rgba?\([^)]+\)/g) || [];
    for(var i=0;i<stops.length;i++){
      var p=stops[i].replace(/rgba?\(|\)/g,'').split(',').map(function(s){return parseFloat(s);});
      var rgb={r:p[0],g:p[1],b:p[2],a:p.length>3?p[3]:1};
      if(rgb.a>MIN_ALPHA && luminance(rgb)<DARK_THRESHOLD) return true;
    }
    return false;
  }
  // For background-clip:text gradients (the gradient IS the visible text) --
  // darken the light stops instead of lightening the dark ones.
  function remapGradientText(str){
    var any=false;
    var out=str.replace(/rgba?\(([^)]+)\)/g, function(full, inner){
      var p=inner.split(',').map(function(s){return parseFloat(s);});
      var rgb={r:p[0],g:p[1],b:p[2],a:p.length>3?p[3]:1};
      if(rgb.a<=MIN_ALPHA) return full;
      var hsl=rgbToHsl(rgb.r,rgb.g,rgb.b);
      if(hsl[2]>LIGHT_TEXT_L){
        any=true;
        if(isPinkHue(hsl)) return rgbaStr({r:RED_ACCENT[0],g:RED_ACCENT[1],b:RED_ACCENT[2],a:Math.max(rgb.a,TEXT_MIN_ALPHA)});
        if(isYellowHue(hsl)) return rgbaStr({r:BORDER_ACCENT[0],g:BORDER_ACCENT[1],b:BORDER_ACCENT[2],a:Math.max(rgb.a,TEXT_MIN_ALPHA)});
        return rgbaStr(darkenRGB(rgb));
      }
      return full;
    });
    return any ? out : null;
  }
  function isTextClip(cs){
    var bc = cs.getPropertyValue('-webkit-background-clip') || cs.backgroundClip || '';
    return bc.indexOf('text')!==-1;
  }

  function shouldSkip(el){
    if(SKIP_TAGS[el.tagName]) return true;
    if(el.id==='vt-toggle-btn') return true;
    return false;
  }

  function neutralizeBackdrops(){
    // Body: drop any decorative gradient/photo entirely for a clean flat base.
    bodyRec={bg:document.body.style.backgroundColor||'', bgImg:document.body.style.backgroundImage||''};
    document.body.style.setProperty('background-image','none','important');
    document.body.style.setProperty('background-color','#fdf6e6','important');

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

  // Recolors one element. Shared by the initial full-DOM walk and the
  // MutationObserver (for content added/cloned after the initial pass --
  // e.g. ticker/marquee text that JS duplicates for a seamless loop).
  function processElement(el){
    if(shouldSkip(el)) return;
    if(el.nodeType!==1) return;
    var cs=getComputedStyle(el);
    var bgImgVal=cs.backgroundImage;
    var isRasterImage = bgImgVal && bgImgVal.indexOf('url(')!==-1;
    var isGradient = bgImgVal && bgImgVal.indexOf('gradient(')!==-1;
    var isTextGradient = isGradient && isTextClip(cs);
    var rec={el:el, bg:el.style.backgroundColor||'', bgImg:el.style.backgroundImage||'', color:el.style.color||'', textShadow:el.style.textShadow||'', filter:el.style.filter||''};
    var changed=false;

    if(isTextGradient){
      var remappedText=remapGradientText(bgImgVal);
      if(remappedText){
        el.style.setProperty('background-image', remappedText, 'important');
        if(cs.textShadow && cs.textShadow!=='none') el.style.setProperty('text-shadow','none','important');
        if(cs.filter && cs.filter!=='none' && cs.filter.indexOf('drop-shadow')!==-1) el.style.setProperty('filter','none','important');
        changed=true;
      }
    } else if(isGradient){
      if(gradientHasDarkStop(bgImgVal)){
        el.style.setProperty('background-image','none','important');
        el.style.setProperty('background-color', rgbaStr({r:LIGHT_BG[0],g:LIGHT_BG[1],b:LIGHT_BG[2],a:OPAQUE_FLOOR}), 'important');
        changed=true;
      }
    } else if(!isRasterImage){
      var bgRgb=toRGBA(cs.backgroundColor);
      if(bgRgb && bgRgb.a>MIN_ALPHA && luminance(bgRgb)<DARK_THRESHOLD){
        el.style.setProperty('background-color', rgbaStr(lightenRGB(bgRgb)), 'important');
        changed=true;
      }
    }

    if(!isRasterImage){
      var colRgb=toRGBA(cs.color);
      if(colRgb){
        var colHsl=rgbToHsl(colRgb.r,colRgb.g,colRgb.b);
        if(colHsl[2]>LIGHT_TEXT_L){
          var newColor;
          if(isPinkHue(colHsl)){
            var pinkA=(colRgb.a===undefined?1:colRgb.a);
            newColor={r:RED_ACCENT[0],g:RED_ACCENT[1],b:RED_ACCENT[2],a:pinkA>MIN_ALPHA?Math.max(pinkA,TEXT_MIN_ALPHA):pinkA};
          } else if(isYellowHue(colHsl)){
            var yellowA=(colRgb.a===undefined?1:colRgb.a);
            newColor={r:BORDER_ACCENT[0],g:BORDER_ACCENT[1],b:BORDER_ACCENT[2],a:yellowA>MIN_ALPHA?Math.max(yellowA,TEXT_MIN_ALPHA):yellowA};
          } else {
            newColor=darkenRGB(colRgb);
          }
          el.style.setProperty('color', rgbaStr(newColor), 'important');
          if(cs.textShadow && cs.textShadow!=='none'){
            el.style.setProperty('text-shadow','none','important');
          }
          if(cs.filter && cs.filter!=='none' && cs.filter.indexOf('drop-shadow')!==-1){
            el.style.setProperty('filter','none','important');
          }
          changed=true;
        }
      }
    }

    // Yellow/gray borders -> one consistent teal accent; pink/magenta borders -> dark red.
    // Same "no yellow, no pink" rule as text, applied to borders.
    var BORDER_SIDES=['borderTopColor','borderRightColor','borderBottomColor','borderLeftColor'];
    var BORDER_CSS_PROP={borderTopColor:'border-top-color',borderRightColor:'border-right-color',borderBottomColor:'border-bottom-color',borderLeftColor:'border-left-color'};
    for(var s=0;s<BORDER_SIDES.length;s++){
      var side=BORDER_SIDES[s];
      var borderRgb=toRGBA(cs[side]);
      if(borderRgb && borderRgb.a>MIN_ALPHA){
        var borderHsl=rgbToHsl(borderRgb.r,borderRgb.g,borderRgb.b);
        var accent=null;
        if(isYellowOrGray(borderRgb)) accent=BORDER_ACCENT;
        else if(isPinkHue(borderHsl)) accent=RED_ACCENT;
        if(accent){
          if(!rec.border) rec.border={};
          rec.border[side]=el.style[side]||'';
          el.style.setProperty(BORDER_CSS_PROP[side], rgbaStr({r:accent[0],g:accent[1],b:accent[2],a:borderRgb.a}), 'important');
          changed=true;
        }
      }
    }
    if(changed) touched.push(rec);
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
      if(rec.border){
        for(var side in rec.border){
          if(rec.border[side]) rec.el.style[side]=rec.border[side]; else rec.el.style.removeProperty(side.replace(/([A-Z])/g,'-$1').toLowerCase());
        }
      }
    }
    touched=[];
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
  }

  function injectStyle(){
    if(document.getElementById('vt-toggle-style')) return;
    var css=
      /* Docked top-right, below the ticker + nav bar (~92px tall on mobile) so it
         never sits under scrolling ticker text, and clear of the bottom-corner
         clutter (mascot, music player, back-to-top). */
      '#vt-toggle-btn{position:fixed;top:6rem;right:0.6rem;z-index:2147483647;width:34px;height:34px;border-radius:50%;border:1.5px solid rgba(0,245,255,0.5);background:rgba(10,0,26,0.55);color:rgba(0,245,255,0.75);font-size:1.05rem;line-height:1;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 0 8px rgba(0,245,255,0.25);transition:transform 0.15s,box-shadow 0.15s,opacity 0.15s;padding:0;font-family:inherit;opacity:0.55;}'
      +'#vt-toggle-btn:hover{opacity:1;transform:scale(1.12);box-shadow:0 0 18px rgba(0,245,255,0.6),0 0 34px rgba(0,245,255,0.25);border-color:#00f5ff;color:#00f5ff;}'
      +'#vt-toggle-btn:active{transform:scale(0.94);}'
      +'@media print{#vt-toggle-btn{display:none!important;}}';
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

  function init(){
    injectStyle();
    injectButton();
    if(current()==='light') applyLight();
    setTimeout(reapplyIfLight, 400);
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
