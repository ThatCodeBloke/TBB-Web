/* ============================================================
   ThatBishBloke — live bits of the site
   - Featured clip: his latest TikToks, newest first
   - The Stash: live products & prices from shop.thatbishbloke.com
   - Live Hub: shows when he's live on TikTok (or Twitch), otherwise how often he goes live
   - Watch & Stream / community numbers: live follower counts
   - Discord: a card with members, who's online and upcoming events

   Data: the shop is read directly (Shopify allows it). Everything else comes
   from J.A.D.E. (the Discord bot) at FEED_URL, which gathers it every 10 minutes.
   If either can't be reached, the page simply keeps what's written in index.html.
   ============================================================ */
(function () {
  'use strict';

  var FEED_URL = 'https://jade.is-a.dev/api/public/creator';
  var SHOP_URL = 'https://shop.thatbishbloke.com';
  var SHOP_SHOW = 6;              // products shown in The Stash
  var ROTATE_MS = 25000;          // featured clip changes every 25s until someone interacts
  // Tags you control: product handle → label shown on its card.
  var PRODUCT_TAGS = { 'youre-a-knobhead-unisex-hoodie': 'BEST SELLER' };

  // ---------- helpers ----------
  function $(id) { return document.getElementById(id); }
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function isNum(n) { return typeof n === 'number' && isFinite(n); }
  function count(n) {
    if (!isNum(n)) return null;
    if (n >= 1e6) return (Math.floor(n / 1e5) / 10).toString().replace(/\.0$/, '') + 'M+';
    return n.toLocaleString('en-GB') + '+';
  }
  function setText(id, text) { var e = $(id); if (e && text != null) e.textContent = text; }
  function ago(ts) {
    if (!ts) return null;
    var m = Math.round((Date.now() - ts) / 60000);
    if (m < 2) return 'just now';
    if (m < 60) return m + ' minutes ago';
    var h = Math.round(m / 60); if (h < 24) return h === 1 ? 'an hour ago' : h + ' hours ago';
    var d = Math.round(h / 24); return d === 1 ? 'yesterday' : d + ' days ago';
  }
  function getJSON(url, ms) {
    var ctrl = window.AbortController ? new AbortController() : null;
    var t = ctrl ? setTimeout(function () { ctrl.abort(); }, ms || 8000) : null;
    return fetch(url, ctrl ? { signal: ctrl.signal } : {}).then(function (r) {
      if (t) clearTimeout(t);
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    });
  }

  // ---------- 1. Featured clip: latest TikToks ----------
  function featuredClips(videos) {
    var player = $('tt-player'), nav = $('tt-nav'), dots = $('tt-dots');
    if (!player || !videos || !videos.length) return;
    var i = 0, timer = null, stopped = false;
    function src(id) { return 'https://www.tiktok.com/player/v1/' + id + '?music_info=1&description=1&rel=0&native_context_menu=0'; }
    function show(n) {
      i = (n + videos.length) % videos.length;
      player.src = src(videos[i].id);
      player.title = videos[i].title ? 'TikTok: ' + videos[i].title : 'Latest TikTok from ThatBishBloke';
      Array.prototype.forEach.call(dots.children, function (d, k) { d.setAttribute('aria-current', k === i ? 'true' : 'false'); });
    }
    function stop() { stopped = true; if (timer) clearInterval(timer); }
    dots.innerHTML = '';
    videos.forEach(function (v, k) {
      var b = el('button', 'tt-dot'); b.type = 'button';
      b.setAttribute('aria-label', 'Clip ' + (k + 1) + (v.title ? ': ' + v.title : ''));
      b.addEventListener('click', function () { stop(); show(k); });
      dots.appendChild(b);
    });
    nav.querySelectorAll('[data-dir]').forEach(function (b) {
      b.addEventListener('click', function () { stop(); show(i + Number(b.getAttribute('data-dir'))); });
    });
    nav.hidden = videos.length < 2;
    show(0);
    if (videos.length > 1) timer = setInterval(function () { if (!stopped && !document.hidden) show(i + 1); }, ROTATE_MS);
    // Someone pressed play → never switch the video under them.
    window.addEventListener('message', function (e) {
      if (!/tiktok\.com$/.test(String(e.origin).replace(/^https?:\/\//, ''))) return;
      var d = e.data; if (typeof d === 'string') { try { d = JSON.parse(d); } catch (x) { return; } }
      if (d && d.type === 'onStateChange' && d.value === 1) stop();
    });
    setText('tt-caption', 'His latest TikToks, straight from @thatbishbloke.');
  }

  // ---------- 2. The Stash: live shop ----------
  function ctaFor(title) {
    var t = title.toLowerCase();
    if (/hoodie|t-shirt|tee|shirt|neck/.test(t)) return 'GET THE THREADS';
    if (/mug/.test(t)) return 'GRAB A BREW';
    if (/mat|mouse ?pad/.test(t)) return 'UPGRADE YOUR DESK';
    if (/sticker/.test(t)) return 'STICK IT ON SOMETHING';
    return 'GET IT';
  }
  function money(n) { return '£' + Number(n).toFixed(2); }
  function loadShop() {
    var grid = $('product-grid'); if (!grid) return;
    getJSON(SHOP_URL + '/products.json?limit=250', 10000).then(function (data) {
      var month = Date.now() - 30 * 86400000;
      var items = (data.products || []).map(function (p) {
        var vs = (p.variants || []).filter(function (v) { return v.available !== false; });
        if (!vs.length) return null;
        var prices = vs.map(function (v) { return Number(v.price); }).filter(isFinite);
        var compare = vs.map(function (v) { return Number(v.compare_at_price); }).filter(function (n) { return isFinite(n) && n > 0; });
        var min = Math.min.apply(null, prices), max = Math.max.apply(null, prices);
        var sizeOpt = (p.options || []).filter(function (o) { return /size/i.test(o.name); })[0];
        var published = Date.parse(p.published_at || p.created_at) || 0;
        return {
          title: p.title, handle: p.handle, published: published,
          price: (min !== max ? 'From ' : '') + money(min),
          was: compare.length && Math.max.apply(null, compare) > min ? money(Math.max.apply(null, compare)) : null,
          options: sizeOpt && sizeOpt.values.length > 1 ? 'Available in ' + sizeOpt.values.length + ' sizes' : vs.length > 1 ? vs.length + ' options' : 'One size',
          image: p.images && p.images[0] ? p.images[0].src + (p.images[0].src.indexOf('?') > -1 ? '&' : '?') + 'width=600' : null,
          tag: PRODUCT_TAGS[p.handle] || (published > month ? 'NEW' : null),
          rank: PRODUCT_TAGS[p.handle] ? 2 : published > month ? 1 : 0,
        };
      }).filter(Boolean);
      if (!items.length) return;
      // Your own tags (PRODUCT_TAGS) first, then new this month, then newest.
      items.sort(function (a, b) { return (b.rank - a.rank) || (b.published - a.published); });
      grid.innerHTML = '';
      items.slice(0, SHOP_SHOW).forEach(function (p) {
        var card = el('div', 'product-card');
        if (p.tag) card.appendChild(el('div', 'product-tag', p.tag));
        var wrap = el('div', 'product-img-wrap');
        if (p.image) { var img = el('img'); img.src = p.image; img.alt = p.title; img.loading = 'lazy'; wrap.appendChild(img); }
        card.appendChild(wrap);
        var info = el('div', 'product-info');
        info.appendChild(el('h3', null, p.title));
        var price = el('p', 'price', p.price);
        if (p.was) { var s = el('s', 'price-was', p.was); price.appendChild(document.createTextNode(' ')); price.appendChild(s); }
        info.appendChild(price);
        info.appendChild(el('p', 'product-options', p.options));
        var a = el('a', 'btn-buy', ctaFor(p.title)); a.href = SHOP_URL + '/products/' + encodeURIComponent(p.handle); a.target = '_blank'; a.rel = 'noopener';
        info.appendChild(a);
        card.appendChild(info);
        grid.appendChild(card);
      });
      setText('shop-all', 'VIEW FULL COLLECTION (' + items.length + ')');
    }).catch(function () { /* keep the products written in index.html */ });
  }

  // ---------- 3. Live Hub ----------
  var twitchStarted = false;
  function startTwitch() {
    var box = $('live-player'); if (!box || twitchStarted) return;
    twitchStarted = true;
    box.innerHTML = '<div id="twitch-embed"></div>';
    var go = function () {
      if (!window.Twitch || !window.Twitch.Embed) return; // blocked (e.g. an ad-blocker): the buttons still work
      new window.Twitch.Embed('twitch-embed', {
        width: '100%', height: 600, channel: 'thatbishbloke', layout: 'video-with-chat',
        autoplay: false, muted: true, theme: 'dark',
        parent: ['thatbishbloke.com', 'www.thatbishbloke.com', location.hostname].filter(function (h, k, a) { return h && a.indexOf(h) === k; }),
      });
    };
    if (window.Twitch && window.Twitch.Embed) return go();
    var s = document.createElement('script'); s.src = 'https://embed.twitch.tv/embed/v1.js'; s.onload = go; document.body.appendChild(s);
  }
  function liveHub(feed) {
    var box = $('live-player'); if (!box) return;
    var tt = feed.tiktok || {}, tw = feed.twitch || {};
    var badge = $('nav-live');
    if (tt.live && tt.live.live) {
      setText('live-tag', '● LIVE RIGHT NOW');
      setText('live-heading', "Bish is live on TikTok!");
      box.innerHTML = '';
      var card = el('a', 'tt-live-now'); card.href = tt.live.url; card.target = '_blank'; card.rel = 'noopener';
      card.appendChild(el('span', 'tt-live-pill', '● LIVE ON TIKTOK'));
      card.appendChild(el('strong', 'tt-live-title', tt.live.title || 'Live now on TikTok'));
      var bits = [];
      if (isNum(tt.live.viewers) && tt.live.viewers > 0) bits.push(tt.live.viewers.toLocaleString('en-GB') + ' watching');
      if (tt.live.startedAt) bits.push('started ' + ago(tt.live.startedAt));
      if (bits.length) card.appendChild(el('span', 'tt-live-meta', bits.join(' · ')));
      card.appendChild(el('span', 'btn primary tt-live-join', 'JOIN THE LIVE →'));
      box.appendChild(card);
      if (badge) { badge.hidden = false; badge.href = tt.live.url; }
      return;
    }
    if (tw.live && tw.live.live) {
      setText('live-tag', '● LIVE RIGHT NOW');
      setText('live-heading', 'Bish is live on Twitch!');
      if (badge) { badge.hidden = false; badge.href = '#live-hub'; badge.removeAttribute('target'); }
      return startTwitch();
    }
    // Offline: how active he is, instead of an empty player.
    box.innerHTML = '';
    var off = el('div', 'live-offline');
    off.appendChild(el('span', 'live-offline-kicker', 'NOT LIVE THIS SECOND'));
    var stats = el('div', 'live-offline-stats');
    function stat(value, label) { if (value == null) return; var s = el('div', 'live-offline-stat'); s.appendChild(el('strong', null, value)); s.appendChild(el('span', null, label)); stats.appendChild(s); }
    stat(tt.lastLiveAt ? ago(tt.lastLiveAt) : null, 'last live on TikTok');
    stat(isNum(tt.livesLast30Days) && tt.livesLast30Days > 0 ? String(tt.livesLast30Days) : null, tt.livesLast30Days === 1 ? 'live in the last 30 days' : 'lives in the last 30 days');
    stat(isNum(tt.liveHoursLast30Days) && tt.liveHoursLast30Days >= 1 ? String(Math.round(tt.liveHoursLast30Days)) : null, 'hours live this month');
    if (stats.children.length) off.appendChild(stats);
    off.appendChild(el('p', null, 'Follow on TikTok and you’ll get a notification the moment he goes live.'));
    var follow = el('a', 'btn primary', 'FOLLOW ON TIKTOK'); follow.href = (tt.url || 'https://www.tiktok.com/@thatbishbloke'); follow.target = '_blank'; follow.rel = 'noopener';
    off.appendChild(follow);
    box.appendChild(off);
  }

  // ---------- 4. Follower counts ----------
  function counts(feed) {
    var tt = feed.tiktok || {}, yt = feed.youtube || {}, tw = feed.twitch || {};
    setText('yt-subs', count(yt.subscribers)); setText('yt-videos', count(yt.videos));
    setText('tt-followers', count(tt.followers)); setText('tt-likes', count(tt.likes));
    setText('ig-followers', count((feed.instagram || {}).followers)); setText('ig-posts', count((feed.instagram || {}).posts));
    setText('fb-followers', count((feed.facebook || {}).followers));
    setText('tw-followers', count(tw.followers));
    setText('th-followers', count((feed.threads || {}).followers));
    if (tw.live && tw.live.live) { setText('tw-live', 'LIVE'); setText('tw-live-label', 'Right now'); }
    var t = feed.totals || {};
    setText('hl-followers', count(t.followers)); setText('hl-likes', count(t.likes));
  }

  // ---------- 5. Discord card ----------
  function discord(d) {
    var box = $('discord-card'); if (!box || !d || !isNum(d.members)) return;
    box.innerHTML = '';
    var card = el('div', 'dc-card');
    var banner = el('div', 'dc-banner'); if (d.banner) banner.style.backgroundImage = 'url("' + d.banner.replace(/"/g, '') + '")';
    card.appendChild(banner);
    var body = el('div', 'dc-body');
    var head = el('div', 'dc-head');
    if (d.icon) { var ic = el('img', 'dc-icon'); ic.src = d.icon; ic.alt = ''; ic.width = 72; ic.height = 72; head.appendChild(ic); }
    var nm = el('div'); nm.appendChild(el('h3', 'dc-name', d.name || 'ThatBishCommunity'));
    if (d.boosts > 0) nm.appendChild(el('span', 'dc-boost', '💎 ' + d.boosts + ' boost' + (d.boosts === 1 ? '' : 's') + (d.boostTier ? ' · level ' + d.boostTier : '')));
    head.appendChild(nm); body.appendChild(head);
    var stats = el('div', 'dc-stats');
    if (isNum(d.online)) { var on = el('span', 'dc-stat'); on.appendChild(el('i', 'dc-dot on')); on.appendChild(document.createTextNode(d.online.toLocaleString('en-GB') + ' online')); stats.appendChild(on); }
    var mem = el('span', 'dc-stat'); mem.appendChild(el('i', 'dc-dot')); mem.appendChild(document.createTextNode(d.members.toLocaleString('en-GB') + ' members')); stats.appendChild(mem);
    body.appendChild(stats);
    if (d.events && d.events.length) {
      var ev = el('div', 'dc-events'); ev.appendChild(el('span', 'dc-events-title', 'Coming up'));
      d.events.forEach(function (e) {
        var row = el('div', 'dc-event');
        row.appendChild(el('strong', null, e.name));
        row.appendChild(el('span', null, e.live ? 'Happening now' : new Date(e.start).toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })));
        ev.appendChild(row);
      });
      body.appendChild(ev);
    }
    var join = el('a', 'btn primary btn-full', 'JOIN THE SERVER'); join.href = d.invite || 'https://discord.gg/HPK7kQ459s'; join.target = '_blank'; join.rel = 'noopener noreferrer';
    body.appendChild(join);
    body.appendChild(el('p', 'dc-note', 'Kept in order by J.A.D.E., the server’s resident AI. Say hi.'));
    card.appendChild(body);
    box.appendChild(card);
  }

  // ---------- go ----------
  function init() {
    loadShop();
    getJSON(FEED_URL, 8000).then(function (feed) {
      if (feed.tiktok && feed.tiktok.videos) featuredClips(feed.tiktok.videos);
      liveHub(feed);
      counts(feed);
      discord(feed.discord);
    }).catch(function () { startTwitch(); /* feed unreachable: behave like before */ });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
