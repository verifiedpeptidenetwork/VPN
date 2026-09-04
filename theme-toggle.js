/* VPN site-wide light/dark toggle. Include:
   1) in <head>, as early as possible:
      <script>(function(){try{if(localStorage.getItem('vpn_theme')==='light')document.documentElement.setAttribute('data-theme','light');}catch(e){}})();</script>
      <style>html[data-theme="light"]{filter:invert(1) hue-rotate(180deg);background:#fff;}html{transition:filter .25s ease;}@media (prefers-reduced-motion:reduce){html{transition:none!important;}}</style>
   2) before </body>:
      <script src="theme-toggle.js" defer></script>
*/
(function(){
  var KEY='vpn_theme';
  function current(){ return document.documentElement.getAttribute('data-theme')||'dark'; }
  function apply(theme){
    if(theme==='light') document.documentElement.setAttribute('data-theme','light');
    else document.documentElement.removeAttribute('data-theme');
    try{localStorage.setItem(KEY,theme);}catch(e){}
    var btn=document.getElementById('vt-toggle-btn');
    if(btn){
      btn.textContent = theme==='light' ? '🌙' : '☀️';
      btn.setAttribute('aria-pressed', theme==='light' ? 'true' : 'false');
    }
  }
  function injectStyle(){
    if(document.getElementById('vt-toggle-style')) return;
    var css =
      '#vt-toggle-btn{position:fixed;bottom:1.5rem;left:1rem;z-index:2147483647;width:48px;height:48px;border-radius:50%;border:2px solid #00f5ff;background:#0a001a;color:#00f5ff;font-size:1.4rem;line-height:1;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 0 16px rgba(0,245,255,0.5),0 0 32px rgba(0,245,255,0.2);transition:transform 0.15s,box-shadow 0.15s;padding:0;font-family:inherit;}'
      + '#vt-toggle-btn:hover{transform:scale(1.1);box-shadow:0 0 24px rgba(0,245,255,0.8),0 0 46px rgba(0,245,255,0.35);}'
      + '#vt-toggle-btn:active{transform:scale(0.94);}'
      + 'html[data-theme="light"] #vt-toggle-btn{filter:invert(1) hue-rotate(180deg);}'
      + '@media print{#vt-toggle-btn{display:none!important;}}';
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
  function init(){ injectStyle(); injectButton(); }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
