/* vpn-chipmenu.js — turns a row of chips (jump links / filters / tags) into one tidy dropdown menu.
   The original chips stay in the page (hidden) and still do the real work: picking an item clicks its chip.
   Usage: vpnChipMenu(rowElement, { label:'Jump to a section', kind:'jump' | 'filter' | 'tags' })          */
(function(){
  if (window.vpnChipMenu) return;

  var css = ''
    + '.cm-hidden{display:none !important;}'
    + '.cm{position:relative;display:inline-block;max-width:100%;margin:6px 0;font-family:"Inter",system-ui,-apple-system,"Segoe UI",sans-serif;z-index:30;}'
    + '.cm[open]{z-index:80;}'
    + '.cm > summary{list-style:none;display:inline-flex;align-items:center;gap:10px;min-height:44px;max-width:100%;box-sizing:border-box;padding:0 16px;border-radius:12px;cursor:pointer;'
    + 'background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.16);color:#f1f2fa;font-weight:700;font-size:14px;line-height:1.2;user-select:none;}'
    + '.cm > summary::-webkit-details-marker{display:none;}'
    + '.cm > summary:hover,.cm[open] > summary{border-color:#ff2fa8;background:rgba(255,47,168,0.10);}'
    + '.cm .cm-l{color:rgba(214,220,240,0.7);font-weight:600;white-space:nowrap;}'
    + '.cm .cm-v{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}'
    + '.cm .cm-chev{font-size:11px;opacity:0.8;transition:transform .2s;flex:0 0 auto;}'
    + '.cm[open] .cm-chev{transform:rotate(180deg);}'
    + '.cm .cm-list{position:absolute;left:0;top:calc(100% + 6px);min-width:260px;max-width:min(92vw,420px);max-height:min(60vh,440px);overflow:auto;padding:6px;box-sizing:border-box;'
    + 'background:#121025;border:1px solid rgba(255,255,255,0.16);border-radius:14px;box-shadow:0 20px 40px -12px rgba(0,0,0,0.85);}'
    + '.cm .cm-item{display:flex;align-items:center;gap:8px;width:100%;min-height:44px;padding:8px 12px;border:0;border-radius:10px;background:transparent;color:#e9e7f5;'
    + 'font:600 14px/1.3 "Inter",system-ui,sans-serif;text-align:left;cursor:pointer;}'
    + '.cm .cm-item:hover,.cm .cm-item:focus-visible{background:rgba(255,255,255,0.08);outline:none;}'
    + '.cm .cm-item.on{background:rgba(255,47,168,0.16);color:#fff;}'
    + '.cm .cm-item.on::after{content:"✓";margin-left:auto;color:#ff7ac6;}'
    + '.cm .cm-item small{margin-left:auto;opacity:0.65;font-weight:700;}'
    + '.cm .cm-item.on small{margin-left:0;}'
    + 'html[data-theme="light"] .cm > summary{background:#fff;color:#14112a;border-color:rgba(0,0,0,0.15);}'
    + 'html[data-theme="light"] .cm .cm-list{background:#fff;border-color:rgba(0,0,0,0.12);}'
    + 'html[data-theme="light"] .cm .cm-item{color:#14112a;}'
    /* the site styles details/buttons broadly, so the menu states its own look firmly */
    + 'html body details.cm > summary::after,html body details.cm > summary::before{display:none !important;content:none !important;}'
    + 'html body details.cm:not([open]) > .cm-list{display:none !important;}'
    + 'html body details.cm[open] > .cm-list{display:block !important;}'
    + 'html body details.cm .cm-list button.cm-item{display:flex !important;align-items:center !important;width:100% !important;min-height:44px !important;margin:0 !important;padding:8px 12px !important;'
    + 'border:0 !important;border-radius:10px !important;background:transparent !important;box-shadow:none !important;color:#e9e7f5 !important;-webkit-text-fill-color:currentColor !important;'
    + 'font:600 14px/1.3 "Inter",system-ui,sans-serif !important;letter-spacing:0 !important;text-transform:none !important;text-shadow:none !important;text-align:left !important;animation:none !important;}'
    + 'html body details.cm .cm-list button.cm-item:hover{background:rgba(255,255,255,0.08) !important;}'
    + 'html body details.cm .cm-list button.cm-item.on{background:rgba(255,47,168,0.16) !important;color:#fff !important;}'
    + 'html body details.cm > summary{font-family:"Inter",system-ui,sans-serif !important;text-transform:none !important;letter-spacing:0 !important;text-shadow:none !important;}'
    + 'html[data-theme="light"] body details.cm .cm-list button.cm-item{color:#14112a !important;}'
    /* inside page headers and pinned bars (which may clip), the list opens in place */
    + '.view-hero .cm .cm-list,.lp-hero .cm .cm-list,.cm.cm-inline .cm-list{position:static;margin-top:6px;max-height:none;width:100%;}'
    + '.vsn .cm{flex:1;min-width:0;margin:0;}.vsn .cm > summary{min-height:36px;padding:0 12px;font-size:13px;}'
    + '@media(max-width:640px){.cm{display:block;}.cm > summary{width:100%;}.cm .cm-list{min-width:0;width:100%;max-width:none;}}';
  var st = document.createElement('style'); st.id = 'vpn-chipmenu-css'; st.textContent = css;
  (document.head || document.documentElement).appendChild(st);

  var ACTIVE = /(^|\s)(on|active|qg-active|is-active|sel|selected|vpn-active)(\s|$)/;
  function chipsOf(row){
    return [].slice.call(row.querySelectorAll('button, a, [role="button"], .vh2-go, .vpn-stag, .qg-filter'))
      .filter(function(c, i, arr){ return arr.indexOf(c) === i && !c.closest('.cm') && c.textContent.trim().length > 0 && !(c.parentElement && c.parentElement.closest('button, a, [role="button"]') && c.parentElement.closest('button, a, [role="button"]') !== c); });
  }
  function isOn(c){ return ACTIVE.test(c.className) || c.getAttribute('aria-pressed') === 'true' || c.getAttribute('aria-current') === 'true' || c.getAttribute('aria-current') === 'page'; }
  function textParts(c){
    var t = c.textContent.replace(/\s+/g, ' ').trim();
    var m = t.match(/^(.*?)(?:\s*\(?(\d+)\)?)$/);                 /* trailing count like "Retatrutide 10" or "All (31)" */
    return m && m[1] && m[2] ? { t:m[1].trim(), n:m[2] } : { t:t, n:'' };
  }

  window.vpnChipMenu = function(row, opts){
    if (!row || row.__cm) return row && row.__cm;
    opts = opts || {};
    var kind = opts.kind || 'jump';
    var menu = document.createElement('details'); menu.className = 'cm cm-' + kind;
    menu.innerHTML = '<summary><span class="cm-l"></span><span class="cm-v"></span><span class="cm-chev" aria-hidden="true">▼</span></summary><div class="cm-list" role="menu"></div>';
    menu.querySelector('.cm-l').textContent = opts.label || (kind === 'filter' ? 'Show:' : kind === 'tags' ? 'Popular searches' : 'Jump to a section');
    var list = menu.querySelector('.cm-list'), val = menu.querySelector('.cm-v');
    row.parentNode.insertBefore(menu, row);
    row.classList.add('cm-hidden');
    row.__cm = menu;

    function rebuild(){
      var chips = chipsOf(row);
      menu.style.display = chips.length ? '' : 'none';
      list.innerHTML = '';
      var current = '';
      chips.forEach(function(c){
        var p = textParts(c), b = document.createElement('button');
        b.type = 'button'; b.className = 'cm-item' + (isOn(c) ? ' on' : ''); b.setAttribute('role', 'menuitem');
        b.textContent = p.t;
        if (p.n) { var s = document.createElement('small'); s.textContent = p.n; b.appendChild(s); }
        if (isOn(c)) current = p.t;
        b.addEventListener('click', function(){
          menu.open = false;
          c.click();
          setTimeout(rebuild, 60);
        });
        list.appendChild(b);
      });
      val.textContent = kind === 'filter' ? (current || (chips[0] ? textParts(chips[0]).t : '')) : (opts.hint || '');
      if (kind !== 'filter' && !opts.hint) val.style.display = 'none';
    }
    rebuild();
    /* the page may redraw or re-count its chips; keep the menu in step */
    var t = 0;
    new MutationObserver(function(){ if (t) return; t = setTimeout(function(){ t = 0; rebuild(); }, 60); })
      .observe(row, { childList:true, subtree:true, attributes:true, attributeFilter:['class', 'aria-pressed', 'aria-current'], characterData:true });
    return menu;
  };

  /* close any open menu when tapping elsewhere or pressing Escape */
  document.addEventListener('click', function(e){
    document.querySelectorAll('details.cm[open]').forEach(function(m){ if (!m.contains(e.target)) m.open = false; });
  });
  document.addEventListener('keydown', function(e){
    if (e.key === 'Escape') document.querySelectorAll('details.cm[open]').forEach(function(m){ m.open = false; });
  });
})();
