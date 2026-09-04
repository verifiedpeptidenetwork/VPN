/* VPN site-wide light/dark toggle.
   Only ever changes background colors and text colors. Never touches
   actual images/video (<img>, <video>, url(...) backgrounds) — CSS
   gradients used as decorative panel/page backgrounds ARE remapped
   (they're color, not photos), so the page genuinely goes light.

   Include:
   1) in <head>, as early as possible:
      <script>(function(){try{if(localStorage.getItem('vpn_theme')==='light')document.documentElement.setAttribute('data-theme','light');}catch(e){}})();</script>
   2) before </body>:
      <script src="theme-toggle.js" defer></script>
*/
(function(){
  var KEY='vpn_theme';
  var DARK_THRESHOLD=0.32;        // luminance below this = "dark", gets lightened
  var LIGHT_TEXT_THRESHOLD=0.68;  // text luminance above this = "light", gets darkened
  var MIN_ALPHA=0.12;             // ignore near-fully-transparent colors
  var touched=[]; // {el, bg, bgImg, color} original inline values, for reverting

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

  function lightenRGB(rgb){
    var mix=0.93; // slide toward white but keep a whisper of the original hue
    var r=Math.round(rgb.r+(255-rgb.r)*mix);
    var g=Math.round(rgb.g+(255-rgb.g)*mix);
    var b=Math.round(rgb.b+(255-rgb.b)*mix);
    return {r:r,g:g,b:b,a:rgb.a};
  }
  function darkenRGB(rgb){
    return {r:Math.round(rgb.r*0.12), g:Math.round(rgb.g*0.12), b:Math.round(rgb.b*0.12), a:rgb.a};
  }
  function rgbaStr(rgb){
    var a=(rgb.a===undefined?1:rgb.a);
    return a>=1 ? 'rgb('+rgb.r+','+rgb.g+','+rgb.b+')' : 'rgba('+rgb.r+','+rgb.g+','+rgb.b+','+a+')';
  }

  // Remap every rgb()/rgba() color stop inside a gradient string, lightening dark ones.
  function remapGradient(str){
    var any=false;
    var out=str.replace(/rgba?\(([^)]+)\)/g, function(full, inner){
      var p=inner.split(',').map(function(s){return parseFloat(s);});
      var rgb={r:p[0],g:p[1],b:p[2],a:p.length>3?p[3]:1};
      if(rgb.a<=MIN_ALPHA) return full; // fully transparent stop, leave as-is
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

  function applyLight(){
    var all=document.body.querySelectorAll('*');
    for(var i=0;i<all.length;i++){
      var el=all[i];
      if(shouldSkip(el)) continue;
      var cs=getComputedStyle(el);
      var bgImgVal=cs.backgroundImage;
      var isRasterImage = bgImgVal && bgImgVal.indexOf('url(')!==-1;
      var isGradient = bgImgVal && bgImgVal.indexOf('gradient(')!==-1;
      var rec={el:el, bg:el.style.backgroundColor||'', bgImg:el.style.backgroundImage||'', color:el.style.color||''};
      var changed=false;

      if(isGradient){
        var remapped=remapGradient(bgImgVal);
        if(remapped){
          el.style.setProperty('background-image', remapped, 'important');
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
        if(colRgb && luminance(colRgb)>LIGHT_TEXT_THRESHOLD){
          el.style.setProperty('color', rgbaStr(darkenRGB(colRgb)), 'important');
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
    }
    touched=[];
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
      '#vt-toggle-btn{position:fixed;bottom:1.5rem;left:1rem;z-index:2147483647;width:48px;height:48px;border-radius:50%;border:2px solid #00f5ff;background:#0a001a;color:#00f5ff;font-size:1.4rem;line-height:1;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 0 16px rgba(0,245,255,0.5),0 0 32px rgba(0,245,255,0.2);transition:transform 0.15s,box-shadow 0.15s;padding:0;font-family:inherit;}'
      +'#vt-toggle-btn:hover{transform:scale(1.1);box-shadow:0 0 24px rgba(0,245,255,0.8),0 0 46px rgba(0,245,255,0.35);}'
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
