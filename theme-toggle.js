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
  var TEXT_TARGET_L=0.30;         // darkened text is pulled down to at most this HSL-lightness
  var TEXT_MIN_S=0.55;            // darkened text is boosted to at least this saturation (stays a real color, not gray-mud)
  var MIN_ALPHA=0.12;             // ignore near-fully-transparent colors
  var OPAQUE_FLOOR=0.96;          // lightened backgrounds become (at least) this opaque
  var BACKDROP_AREA=180000;       // px^2 — url() backgrounds bigger than this are treated as decorative texture
  var BACKDROP_OPACITY=0.6;       // decorative <img> opacity ceiling to be considered atmosphere, not content

  var touched=[];      // {el,bg,bgImg,color,textShadow} — recolored elements
  var hiddenImgs=[];   // {el,prev} — decorative <img> visibility
  var hiddenBgUrls=[]; // {el,bgImg} — decorative url() backgrounds
  var bodyRec=null;

  var SKIP_TAGS={IMG:1,VIDEO:1,SVG:1,CANVAS:1,PICTURE:1,IFRAME:1,SOURCE:1,SCRIPT:1,STYLE:1};
  var probe=null;
  function toRGBA(colorStr){
    if(!colorStr) return null;
    if(!probe){ probe=document.createElement('div'); probe.style.cssText='position:absolute;visibility:hidden;pointer-events:none;'; document.documentElement.appendChild(probe); }
    probe.style.color='';
    probe.style.color=colorStr;
    var resolved=getComputedStyle(probe).color;
    var m=resolved.match(/rgba?\(([^)]+)\)/);
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

  function lightenRGB(rgb){
    var mix=0.93;
    var r=Math.round(rgb.r+(255-rgb.r)*mix);
    var g=Math.round(rgb.g+(255-rgb.g)*mix);
    var b=Math.round(rgb.b+(255-rgb.b)*mix);
    var a=(rgb.a===undefined?1:rgb.a);
    if(a>MIN_ALPHA) a=Math.max(a,OPAQUE_FLOOR); // opaque, so it fully covers whatever's behind it
    return {r:r,g:g,b:b,a:a};
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
    return {r:out[0],g:out[1],b:out[2], a:(rgb.a===undefined?1:rgb.a)};
  }
  function rgbaStr(rgb){
    var a=(rgb.a===undefined?1:rgb.a);
    return a>=1 ? 'rgb('+rgb.r+','+rgb.g+','+rgb.b+')' : 'rgba('+rgb.r+','+rgb.g+','+rgb.b+','+a+')';
  }

  function remapGradient(str){
    var any=false;
    var out=str.replace(/rgba?\(([^)]+)\)/g, function(full, inner){
      var p=inner.split(',').map(function(s){return parseFloat(s);});
      var rgb={r:p[0],g:p[1],b:p[2],a:p.length>3?p[3]:1};
      if(rgb.a<=MIN_ALPHA) return full;
      if(luminance(rgb)<DARK_THRESHOLD){
        any=true;
        return rgbaStr(lightenRGB(rgb));
      }
      return full;
    });
    return any ? out : null;
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
    document.body.style.setProperty('background-color','#f4f4f8','important');

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

  function applyLight(){
    neutralizeBackdrops();
    var all=document.body.querySelectorAll('*');
    for(var i=0;i<all.length;i++){
      var el=all[i];
      if(shouldSkip(el)) continue;
      var cs=getComputedStyle(el);
      var bgImgVal=cs.backgroundImage;
      var isRasterImage = bgImgVal && bgImgVal.indexOf('url(')!==-1;
      var isGradient = bgImgVal && bgImgVal.indexOf('gradient(')!==-1;
      var rec={el:el, bg:el.style.backgroundColor||'', bgImg:el.style.backgroundImage||'', color:el.style.color||'', textShadow:el.style.textShadow||''};
      var changed=false;

      if(isGradient){
        var remapped=remapGradient(bgImgVal);
        if(remapped){ el.style.setProperty('background-image', remapped, 'important'); changed=true; }
      } else if(!isRasterImage){
        var bgRgb=toRGBA(cs.backgroundColor);
        if(bgRgb && bgRgb.a>MIN_ALPHA && luminance(bgRgb)<DARK_THRESHOLD){
          el.style.setProperty('background-color', rgbaStr(lightenRGB(bgRgb)), 'important');
          changed=true;
        }
      }

      if(!isRasterImage){
        var colRgb=toRGBA(cs.color);
        if(colRgb && rgbToHsl(colRgb.r,colRgb.g,colRgb.b)[2]>LIGHT_TEXT_L){
          el.style.setProperty('color', rgbaStr(darkenRGB(colRgb)), 'important');
          if(cs.textShadow && cs.textShadow!=='none'){
            el.style.setProperty('text-shadow','none','important');
          }
          changed=true;
        }
      }
      if(changed) touched.push(rec);
    }
  }

  function revertLight(){
    for(var i=0;i<touched.length;i++){
      var rec=touched[i];
      if(rec.bg) rec.el.style.setProperty('background-color', rec.bg); else rec.el.style.removeProperty('background-color');
      if(rec.bgImg) rec.el.style.setProperty('background-image', rec.bgImg); else rec.el.style.removeProperty('background-image');
      if(rec.color) rec.el.style.setProperty('color', rec.color); else rec.el.style.removeProperty('color');
      if(rec.textShadow) rec.el.style.setProperty('text-shadow', rec.textShadow); else rec.el.style.removeProperty('text-shadow');
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
      '#vt-toggle-btn{position:fixed;top:0.6rem;right:0.6rem;z-index:2147483647;width:34px;height:34px;border-radius:50%;border:1.5px solid rgba(0,245,255,0.5);background:rgba(10,0,26,0.55);color:rgba(0,245,255,0.75);font-size:1.05rem;line-height:1;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 0 8px rgba(0,245,255,0.25);transition:transform 0.15s,box-shadow 0.15s,opacity 0.15s;padding:0;font-family:inherit;opacity:0.55;}'
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

  function init(){
    injectStyle();
    injectButton();
    if(current()==='light') applyLight();
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
