/* Cab radio: header controls + persistent Bandcamp dock.
   Include on a page with <script src="radio.js"></script> after the header.
   The page supplies the list: radio.setList([{title,kind,id}, ...]).
   Bandcamp embeds cannot be driven by code, so the radio tunes releases;
   Play/pause happens on the embed itself inside the dock. */
(function () {
  var top = document.querySelector('.top');
  if (!top || window.radio) return;

  var css = '\
.radio{display:flex;align-items:center;gap:.3rem;height:2.4rem;padding:0 .35rem 0 .5rem;border-radius:2rem;background:#fff;border:2px solid var(--ink)}\
.rled{flex:none;width:.6rem;height:.6rem;margin:0 .25rem 0 0;border-radius:50%;background:#fff;border:2px solid var(--ink);box-sizing:border-box}\
.radio.live .rled,.rdock.live .rled{background:var(--blue);border-color:var(--blue);box-shadow:0 0 0 3px rgba(0,61,165,.2)}\
.rb{appearance:none;font:700 .72rem/1 var(--sans);letter-spacing:.06em;color:#fff;background:var(--ink);border:0;border-radius:2rem;height:1.7rem;min-width:1.9rem;padding:0 .7rem;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:.35rem;transition:background .25s,transform .08s}\
.rb:hover{background:var(--blue)}\
.rb:active{transform:translateY(1px)}\
.rb svg{width:.75rem;height:.75rem;flex:none}\
.rb.tune{background:var(--blue);min-width:2.4rem}.rb.tune:hover,.rb.tune[aria-expanded="true"]{background:var(--ink)}.rb.tune svg{width:.85rem;height:.85rem}\
.rb:disabled{opacity:.45;cursor:default}\
.rdock{position:fixed;z-index:60;top:calc(var(--hdr) + 10px);right:var(--pad);width:min(27rem,calc(100vw - 1.5rem));max-height:calc(100dvh - var(--hdr) - 1.5rem);overflow:auto;padding:.7rem;border-radius:1.1rem;background:#fff;border:2px solid var(--ink);box-shadow:0 16px 36px -12px rgba(0,0,0,.4);transition:transform .35s cubic-bezier(.2,.7,.2,1),opacity .25s}\
.rdock.stow{transform:translateY(-140%);opacity:0;pointer-events:none}\
.rhead{display:flex;align-items:center;gap:.5rem}\
.rscr{flex:1;min-width:0;display:flex;align-items:center;background:#0b0c0d;border-radius:.5rem;height:2.4rem;padding:0 .7rem;box-shadow:inset 0 0 0 2px #2a2e31;font:1rem var(--dots);letter-spacing:.06em;color:#ffb347;text-shadow:0 0 6px rgba(255,170,60,.6);text-transform:uppercase;white-space:nowrap;overflow:hidden}\
.rscr span{overflow:hidden;text-overflow:ellipsis}\
.rkeys{display:flex;gap:.4rem;margin-top:.6rem}.rkeys .rb{flex:1}\
.rdock iframe{display:block;width:100%;height:0;border:0;margin-top:.6rem;border-radius:.4rem;background:#fff}\
.rdock.live iframe{margin-top:.6rem}\
.rdock .rled{margin:0 .15rem}\
@media(max-width:46rem){.radio .rb.step{display:none}}\
@media(max-width:34rem){.radio .rled{display:none}.radio{padding:0 .35rem}}\
@media print{.radio,.rdock{display:none!important}}';
  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  var I = {
    prev: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M20 5v14L9 12zM8 5v14H5V5z"/></svg>',
    next: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M4 5v14l11-7zM16 5v14h3V5z"/></svg>',
    play: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 4.5v15l13-7.5z"/></svg>',
    off: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6" y="6" width="12" height="12" rx="1"/></svg>'
  };

  var bar = document.createElement('div');
  bar.className = 'radio'; bar.setAttribute('role', 'group'); bar.setAttribute('aria-label', 'Cab radio');
  bar.innerHTML = '<i class="rled" aria-hidden="true"></i>' +
    '<button class="rb step" type="button" data-a="prev" aria-label="Previous release">' + I.prev + '</button>' +
    '<button class="rb tune" type="button" data-a="tune" aria-expanded="false" aria-controls="rdock" aria-label="Play: open the cab radio">' + I.play + '</button>' +
    '<button class="rb step" type="button" data-a="next" aria-label="Next release">' + I.next + '</button>';
  var anchor = top.querySelector('.snd') || top.querySelector('.mbtn');
  top.insertBefore(bar, anchor);

  var dock = document.createElement('section');
  dock.className = 'rdock stow'; dock.id = 'rdock'; dock.setAttribute('aria-label', 'Cab radio player'); dock.setAttribute('inert', '');
  dock.innerHTML = '<div class="rhead"><i class="rled" aria-hidden="true"></i><div class="rscr" aria-live="polite"><span>No signal</span></div></div>' +
    '<iframe title="Bandcamp player" allow="autoplay" seamless></iframe>' +
    '<div class="rkeys">' +
    '<button class="rb" type="button" data-a="prev">' + I.prev + 'CH</button>' +
    '<button class="rb" type="button" data-a="next">CH' + I.next + '</button>' +
    '<button class="rb" type="button" data-a="off">' + I.off + 'Off</button>' +
    '<button class="rb" type="button" data-a="stow">Stow</button></div>';
  document.body.appendChild(dock);

  var frame = dock.querySelector('iframe'), scr = dock.querySelector('.rscr span');
  var tuneBtn = bar.querySelector('.tune');
  var list = [], cur = -1;

  function embed(r) {
    var b = 'https://bandcamp.com/EmbeddedPlayer/' + r.kind + '=' + r.id + '/size=large/bgcol=ffffff/linkcol=003da5/';
    return b + (r.kind === 'album' ? 'tracklist=true/artwork=small/transparent=true/' : 'tracklist=false/artwork=small/transparent=true/');
  }
  function setOpen(o) {
    dock.classList.toggle('stow', !o);
    if (o) dock.removeAttribute('inert'); else dock.setAttribute('inert', '');
    tuneBtn.setAttribute('aria-expanded', o ? 'true' : 'false');
  }
  function live(l) { bar.classList.toggle('live', l); dock.classList.toggle('live', l) }
  function tune(i) {
    if (!list.length) return;
    cur = ((i % list.length) + list.length) % list.length;
    var r = list[cur];
    frame.src = embed(r);
    frame.style.height = r.kind === 'album' ? '472px' : '120px';
    scr.textContent = 'Tuned  ' + r.title;
    live(true); setOpen(true);
  }
  function off() { frame.src = 'about:blank'; frame.style.height = '0'; scr.textContent = 'No signal'; cur = -1; live(false); setOpen(false) }

  function act(a) {
    if (a === 'tune') { if (cur < 0 && list.length) tune(0); else setOpen(dock.classList.contains('stow')) }
    else if (a === 'prev') tune(cur < 0 ? 0 : cur - 1);
    else if (a === 'next') tune(cur < 0 ? 0 : cur + 1);
    else if (a === 'off') off();
    else if (a === 'stow') { setOpen(false); tuneBtn.focus() }
  }
  [bar, dock].forEach(function (n) {
    n.addEventListener('click', function (e) { var b = e.target.closest('[data-a]'); if (b) act(b.dataset.a) });
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !dock.classList.contains('stow') && document.getElementById('menu').hidden !== false) act('stow') });

  window.radio = {
    setList: function (l) { list = l },
    tune: tune, off: off,
    open: function () { setOpen(true) }, stow: function () { setOpen(false) }
  };
})();
