/* Readable type for standalone pages — same treatment as the home sections:
   condensed display fonts -> Inter, nothing under ~13-14px, no glow on text.
   <html data-keep-display> keeps headline fonts (e.g. PokeMe-Dex theme) and only fixes body text. */
(function(){
  if (!document.querySelector('link[href*="family=Inter"]')) {
    var l = document.createElement('link'); l.rel = 'stylesheet';
    l.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap';
    document.head.appendChild(l);
  }
  var css = '.vx-body{font-family:Inter,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif!important;font-weight:500;line-height:1.6!important;letter-spacing:0!important}'
    + '.vx-label{font-family:Inter,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif!important;font-weight:700!important;letter-spacing:.02em!important;line-height:1.3!important}'
    + '.vx-head{font-family:Inter,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif!important;font-weight:800!important;letter-spacing:-.01em!important;line-height:1.2!important}'
    + '.vx-glow{text-shadow:none!important}';
  if (!document.querySelector('script[src*="pro.js"]')) { var px = document.createElement('script'); px.src = 'pro.js?v=1'; document.head.appendChild(px); }
  var s = document.createElement('style'); s.id = 'vx-css'; s.textContent = css; document.head.appendChild(s);
  var keepDisplay = document.documentElement.hasAttribute('data-keep-display');
  var DISPLAY = /Bebas|Orbitron|Share Tech|Monoton|Bangers|Press Start/i, BODY = /Rajdhani|Barlow/i;
  function fix(root){
    var els = (root || document.body).querySelectorAll('*');
    for (var i = 0; i < els.length; i++){
      var e = els[i];
      if (e.__vx) continue; e.__vx = true;
      if (e.closest('svg, canvas, video, iframe, [data-vt-skip], [data-vx-skip]')) continue;
      var hasText = false;
      for (var n = e.firstChild; n; n = n.nextSibling){ if (n.nodeType === 3 && n.textContent.trim().length > 1){ hasText = true; break; } }
      if (!hasText) continue;
      var c = getComputedStyle(e), fam = c.fontFamily, fs = parseFloat(c.fontSize);
      if (DISPLAY.test(fam)) { if (!keepDisplay) e.classList.add(fs >= 22 ? 'vx-head' : 'vx-label'); }
      else if (BODY.test(fam)) e.classList.add('vx-body');
      if (fs < 13.5) e.style.setProperty('font-size', (fs < 11 ? 13 : 14) + 'px', 'important');
      if (!keepDisplay && c.textShadow && c.textShadow !== 'none') e.classList.add('vx-glow');
    }
  }
  function run(){ fix(); var p = null; new MutationObserver(function(){ if (p) return; p = setTimeout(function(){ p = null; fix(); }, 250); }).observe(document.body, { childList:true, subtree:true }); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function(){ setTimeout(run, 50); }); else setTimeout(run, 50);
})();
