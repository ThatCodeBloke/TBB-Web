/* ThatBishBloke — redesign preview: the live bits (same sources as the current site's live.js)
   - Sketches + hero polaroid: his latest TikToks (covers, captions), played in a pop-up
   - Merch: live products & prices from shop.thatbishbloke.com
   - Live: a banner, the nav pill and the stream box change when he's live on TikTok or Twitch
   - Counts: followers / likes / subscribers on every platform
   - Discord: members, who's online, upcoming events
   If a source can't be reached, the page keeps what's written in index.html. */
(function () {
  'use strict';
  var FEED_URL = 'https://jade.is-a.dev/api/public/creator';
  var SHOP_URL = 'https://shop.thatbishbloke.com';
  var PRODUCT_TAGS = { 'youre-a-knobhead-unisex-hoodie': 'Best seller' };
  var LINES = { hoodie: 'Say it without saying it.', mug: 'That’s someone’s present sorted.', mat: 'On your desk now. Good luck.', sticker: 'Stick it on something.', tee: 'Wear the catchphrase.' };

  function $(id) { return document.getElementById(id); }
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function isNum(n) { return typeof n === 'number' && isFinite(n); }
  function short(n) {
    if (!isNum(n)) return null;
    if (n >= 1e6) return (Math.floor(n / 1e5) / 10).toString().replace(/\.0$/, '') + 'M+';
    if (n >= 1e4) return Math.floor(n / 1e3) + 'K+';
    return n.toLocaleString('en-GB') + '+';
  }
  function set(id, text) { var e = $(id); if (e && text != null) e.textContent = text; }
  function ago(ts) {
    if (!ts) return null;
    var m = Math.round((Date.now() - ts) / 60000);
    if (m < 2) return 'just now'; if (m < 60) return m + ' min ago';
    var h = Math.round(m / 60); if (h < 24) return h === 1 ? 'an hour ago' : h + ' hours ago';
    var d = Math.round(h / 24); return d === 1 ? 'yesterday' : d + ' days ago';
  }
  function caption(t) { return String(t || '').replace(/#\S+/g, '').replace(/\s+/g, ' ').trim(); }
  function getJSON(url, ms) {
    var c = window.AbortController ? new AbortController() : null;
    var t = c ? setTimeout(function () { c.abort(); }, ms || 8000) : null;
    return fetch(url, c ? { signal: c.signal } : {}).then(function (r) { if (t) clearTimeout(t); if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); });
  }
  function bg(node, url) { if (node && url) { node.style.backgroundImage = 'url("' + String(url).replace(/"/g, '') + '")'; node.classList.remove('cutout'); } }

  // ---------- menu ----------
  var menu = $('menu-btn'), links = $('nav-links');
  if (menu) menu.addEventListener('click', function () { var open = links.classList.toggle('open'); menu.setAttribute('aria-expanded', String(open)); });
  if (links) links.addEventListener('click', function (e) { if (e.target.tagName === 'A') { links.classList.remove('open'); menu.setAttribute('aria-expanded', 'false'); } });

  // ---------- the pop-up player ----------
  var dlg = $('player'), frame = $('player-frame');
  function play(v) {
    if (!dlg || !dlg.showModal) return false;
    frame.src = 'https://www.tiktok.com/player/v1/' + v.id + '?autoplay=1&music_info=1&description=1&rel=0';
    $('player-out').href = v.url || 'https://www.tiktok.com/@thatbishbloke/video/' + v.id;
    dlg.showModal();
    return true;
  }
  if (dlg) {
    $('player-x').addEventListener('click', function () { dlg.close(); });
    dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); });
    dlg.addEventListener('close', function () { frame.src = 'about:blank'; });
  }

  // ---------- 1. sketches + hero ----------
  var heroV = null, spare = [], shownCards = [];
  function setHero(v) {
    heroV = v;
    bg($('hero-img'), v.cover);
    set('hero-cap', (caption(v.title) || 'His latest sketch') + ' ↗');
    $('hero-shot').href = v.url || 'https://www.tiktok.com/@thatbishbloke/video/' + v.id;
  }
  // every minute: a newer video goes up top, and the cards rotate through his latest ten as they are now
  function refreshVideos(videos) {
    if (!videos || !videos.length) return;
    if (!heroV) return sketches(videos);
    if (videos[0].id !== heroV.id) setHero(videos[0]);
    var showing = {}; shownCards.forEach(function (a) { if (a._v) showing[a._v.id] = true; });
    spare = videos.slice(1).filter(function (v) { return !showing[v.id]; })
      .map(function (v) { return [Math.random(), v]; }).sort(function (a, b) { return a[0] - b[0]; }).map(function (x) { return x[1]; });
  }
  function sketches(videos) {
    if (!videos || !videos.length) return;
    setHero(videos[0]);
    $('hero-shot').addEventListener('click', function (e) { if (heroV && play(heroV)) e.preventDefault(); });
    // The three cards: a random mix of his other recent sketches (the newest is up in the hero), and every
    // few seconds one card swaps for one that isn't showing — so each visit (and each minute) shows different ones.
    var pool = videos.slice(1);
    if (!pool.length) pool = videos.slice();
    var box = $('sketches');
    box.innerHTML = '';
    var order = pool.map(function (v) { return [Math.random(), v]; }).sort(function (a, b) { return a[0] - b[0]; }).map(function (x) { return x[1]; });
    var shown = order.slice(0, Math.min(3, order.length));
    var cards = shown.map(function () {
      var a = el('a', 'sketch'); a.target = '_blank'; a.rel = 'noopener';
      a.appendChild(el('span', 'sk-img')); a.appendChild(el('span', 'sk-play', '▶'));
      var cap = el('span', 'sk-cap'); cap.appendChild(el('small')); cap.appendChild(el('b')); a.appendChild(cap);
      a.addEventListener('click', function (e) { if (a._v && play(a._v)) e.preventDefault(); });
      box.appendChild(a);
      return a;
    });
    function fill(a, v) {
      a._v = v; a.href = v.url || 'https://www.tiktok.com/@thatbishbloke/video/' + v.id;
      bg(a.querySelector('.sk-img'), v.cover);
      a.querySelector('small').textContent = 'TikTok' + (v.postedAt ? ' · ' + ago(v.postedAt) : '') + ' ↗';
      a.querySelector('b').textContent = caption(v.title) || 'Watch on TikTok';
    }
    cards.forEach(function (a, i) { fill(a, shown[i]); });
    var slot = 0, paused = false;
    spare = order.slice(cards.length); shownCards = cards;
    var still = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    box.addEventListener('mouseenter', function () { paused = true; });
    box.addEventListener('mouseleave', function () { paused = false; });
    if (!still) setInterval(function () {
      if (paused || document.hidden || (dlg && dlg.open) || !spare.length) return;
      var a = cards[slot % cards.length]; slot++;
      var next = spare.shift(); spare.push(a._v);
      a.classList.add('swap');
      setTimeout(function () { fill(a, next); a.classList.remove('swap'); }, 450);
    }, 6000);
  }

  // ---------- 2. merch, live from the shop ----------
  function kind(t) { t = t.toLowerCase(); return /hoodie/.test(t) ? 'hoodie' : /mug/.test(t) ? 'mug' : /mat|mouse ?pad/.test(t) ? 'mat' : /sticker/.test(t) ? 'sticker' : /shirt|tee|neck/.test(t) ? 'tee' : null; }
  function money(n) { return '£' + Number(n).toFixed(2); }
  function shop() {
    var grid = $('products'); if (!grid) return;
    getJSON(SHOP_URL + '/products.json?limit=250', 10000).then(function (d) {
      var month = Date.now() - 30 * 86400000;
      var items = (d.products || []).map(function (p) {
        var vs = (p.variants || []).filter(function (v) { return v.available !== false; });
        if (!vs.length) return null;
        var prices = vs.map(function (v) { return Number(v.price); }).filter(isFinite);
        var cmp = vs.map(function (v) { return Number(v.compare_at_price); }).filter(function (n) { return isFinite(n) && n > 0; });
        var min = Math.min.apply(null, prices), max = Math.max.apply(null, prices);
        var published = Date.parse(p.published_at || p.created_at) || 0;
        return {
          title: p.title, handle: p.handle, published: published, kind: kind(p.title),
          price: (min !== max ? 'from ' : '') + money(min),
          was: cmp.length && Math.max.apply(null, cmp) > min ? money(Math.max.apply(null, cmp)) : null,
          image: p.images && p.images[0] ? p.images[0].src + (p.images[0].src.indexOf('?') > -1 ? '&' : '?') + 'width=700' : null,
          tag: PRODUCT_TAGS[p.handle] || (published > month ? 'New' : null),
          rank: PRODUCT_TAGS[p.handle] ? 2 : published > month ? 1 : 0,
        };
      }).filter(Boolean);
      if (!items.length) return;
      items.sort(function (a, b) { return (b.rank - a.rank) || (b.published - a.published); });
      // a good mix for the front page: no more than two of one kind in the first six
      var seen = {}, pick = [];
      items.forEach(function (p) { var k = p.kind || p.handle; if (pick.length < 6 && (seen[k] || 0) < 2) { seen[k] = (seen[k] || 0) + 1; pick.push(p); } });
      grid.innerHTML = '';
      pick.forEach(function (p, i) {
        var a = el('a', 'product'); a.href = SHOP_URL + '/products/' + encodeURIComponent(p.handle); a.target = '_blank'; a.rel = 'noopener';
        var box = el('span', 'p-img t' + ((i % 6) + 1));
        if (p.tag) box.appendChild(el('span', 'p-tag' + (p.rank === 2 ? ' hot' : ''), p.tag));
        if (p.image) { var img = el('img'); img.src = p.image; img.alt = p.title; img.loading = 'lazy'; box.appendChild(img); }
        a.appendChild(box);
        var row = el('span', 'p-row'); row.appendChild(el('b', null, p.title));
        var pr = el('span', null, p.price); if (p.was) { pr.appendChild(document.createTextNode(' ')); pr.appendChild(el('s', null, p.was)); }
        row.appendChild(pr); a.appendChild(row);
        a.appendChild(el('span', 'p-sub', LINES[p.kind] || 'Straight from the Bish-Verse.'));
        grid.appendChild(a);
      });
      set('shop-all', 'The whole stash (' + items.length + ') ↗');
    }).catch(function () { /* keep the three written in index.html */ });
  }

  // ---------- 3. live ----------
  var liveDefaults = null;
  function live(feed) {
    var tt = feed.tiktok || {}, tw = feed.twitch || {};
    var on = tt.live && tt.live.live ? { where: 'TikTok', url: tt.live.url || 'https://www.tiktok.com/@thatbishbloke/live', title: tt.live.title, viewers: tt.live.viewers, at: tt.live.startedAt }
      : tw.live && tw.live.live ? { where: 'Twitch', url: 'https://www.twitch.tv/thatbishbloke', title: tw.live.title, viewers: tw.live.viewers, at: tw.live.startedAt } : null;
    var box = document.querySelector('.stream-box'), stats = $('live-stats');
    if (!liveDefaults) liveDefaults = { kicker: ($('live-kicker') || {}).textContent, heading: ($('live-heading') || {}).innerHTML, text: ($('live-text') || {}).textContent, link: ($('tt-live-link') || {}).textContent, href: ($('tt-live-link') || {}).href };
    // the "meet Bish" badge: its own link, over the photo; live right now, or when he last was
    var chip = $('meet-live');
    if (chip) {
      chip.hidden = false; chip.innerHTML = '';
      chip.appendChild(el('i'));
      chip.classList.toggle('on', !!on);
      chip.href = on ? on.url : 'https://www.tiktok.com/@thatbishbloke/live';
      chip.appendChild(document.createTextNode(on ? 'Live on ' + on.where + ' right now — come say hiya' : tt.lastLiveAt ? 'Not live right now · last live on TikTok ' + ago(tt.lastLiveAt) : 'Not live right now'));
    }
    var ts = $('tw-status'); if (ts) { ts.classList.toggle('live', !!(tw.live && tw.live.live)); if (tw.live && tw.live.live) ts.textContent = '● live right now'; }
    var pill = $('nav-live'), b = $('live-banner');
    if (pill) pill.hidden = !on;
    if (b) b.hidden = !on;
    if (box) box.classList.toggle('is-live', !!on);
    if (stats) stats.innerHTML = '';
    if (!on) {
      set('live-kicker', liveDefaults.kicker); if ($('live-heading')) $('live-heading').innerHTML = liveDefaults.heading;
      set('live-text', liveDefaults.text); set('tt-live-link', liveDefaults.link); if ($('tt-live-link')) $('tt-live-link').href = liveDefaults.href;
    }
    if (on) {
      pill.href = on.url; pill.target = '_blank';
      set('live-banner-text', 'Bish is live on ' + on.where + ' right now' + (on.title ? ': ' + on.title : '.'));
      $('live-banner-go').href = on.url;
      box.classList.add('is-live');
      set('live-kicker', '● Live right now');
      $('live-heading').innerHTML = 'He’s on.<br>Get in here.';
      set('live-text', (on.title ? '“' + on.title + '” — ' : '') + 'live on ' + on.where + (isNum(on.viewers) && on.viewers > 0 ? ' with ' + on.viewers.toLocaleString('en-GB') + ' watching' : '') + (on.at ? ', started ' + ago(on.at) : '') + '.');
      $('tt-live-link').href = on.url; set('tt-live-link', 'Join the live on ' + on.where + ' ↗');
      return;
    }
    function stat(v, label) { if (v == null) return; var d = el('div'); d.appendChild(el('strong', null, v)); d.appendChild(el('span', null, label)); stats.appendChild(d); }
    stat(tt.lastLiveAt ? ago(tt.lastLiveAt) : null, 'last live on TikTok');
    stat(isNum(tt.livesLast30Days) && tt.livesLast30Days > 0 ? String(tt.livesLast30Days) : null, 'lives this month');
    stat(isNum(tt.liveHoursLast30Days) && tt.liveHoursLast30Days >= 1 ? String(Math.round(tt.liveHoursLast30Days)) : null, 'hours live this month');
  }

  // ---------- 4. counts ----------
  function counts(feed) {
    var t = feed.totals || {}, tt = feed.tiktok || {}, yt = feed.youtube || {};
    if (isNum(t.followers)) set('hl-followers', t.followers.toLocaleString('en-GB') + '+');
    set('hl-likes', short(t.likes));
    set('tt-followers', short(tt.followers)); set('tt-likes', short(tt.likes)); set('tt-likes-m', short(tt.likes));
    set('yt-subs', short(yt.subscribers)); set('yt-videos', short(yt.videos)); set('hl-sketches', short(yt.videos));
    set('ig-followers', short((feed.instagram || {}).followers)); set('ig-posts', short((feed.instagram || {}).posts));
    set('fb-followers', short((feed.facebook || {}).followers));
    set('tw-followers', short((feed.twitch || {}).followers));
    set('th-followers', short((feed.threads || {}).followers));
  }

  // ---------- 5. discord ----------
  function discord(d) {
    if (!d || !isNum(d.members)) return;
    set('dc-members', d.members.toLocaleString('en-GB'));
    if (isNum(d.online)) set('dc-online', d.online.toLocaleString('en-GB'));
    if (d.invite) $('dc-join').href = d.invite;
    var ev = $('dc-events'); if (ev) { ev.hidden = true; ev.innerHTML = ''; }
    if (d.events && d.events.length && ev) {
      ev.hidden = false;
      ev.appendChild(el('span', 'eyebrow', 'Coming up in the server'));
      d.events.slice(0, 3).forEach(function (e) {
        var row = el('div'); row.appendChild(el('strong', null, e.name));
        row.appendChild(el('span', null, e.live ? 'Happening now' : new Date(e.start).toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })));
        ev.appendChild(row);
      });
    }
  }

  // ---------- 6. the ticker: enough copies that the loop never runs out ----------
  function ticker() {
    var row = $('ticker-in'); if (!row) return;
    var sets = row.querySelectorAll('.ticker-set'); if (!sets.length) return;
    var w = sets[0].getBoundingClientRect().width; if (!w) return;
    var half = Math.max(1, Math.ceil(window.innerWidth / w) + 1); // (half the strip is wider than the screen)
    while (row.children.length > 1) row.removeChild(row.lastChild);
    for (var i = 1; i < half * 2; i++) row.appendChild(sets[0].cloneNode(true));
    row.style.setProperty('--tick-time', (34 * half) + 's'); // (the same speed however many copies: 34s a set)
  }
  var tickerTimer = null;
  window.addEventListener('resize', function () { clearTimeout(tickerTimer); tickerTimer = setTimeout(ticker, 200); });

  var lastFeed = null;
  function load() {
    return getJSON(FEED_URL, 8000).then(function (feed) {
      lastFeed = feed;
      refreshVideos(feed.tiktok && feed.tiktok.videos);
      live(feed); counts(feed); discord(feed.discord);
    }).catch(function () { /* feed unreachable: keep what's showing */ });
  }
  function init() {
    shop();
    ticker(); if (document.fonts && document.fonts.ready) document.fonts.ready.then(ticker);
    load();
    // live: every minute while the page is open (and straight away when you come back to it)
    setInterval(function () { if (!document.hidden) load(); }, 60000);
    document.addEventListener('visibilitychange', function () { if (!document.hidden) load(); });
    setInterval(function () { if (lastFeed && !document.hidden) live(lastFeed); }, 30000); // ("x min ago")
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
