/* ==========================================================================
   ManakMitra — Shared Runtime
   UI helpers, dark mode, global state-driven chrome (sidebar active state,
   topbar search, new analysis, notifications).
   Include AFTER data.js on every page.
   ========================================================================== */

(function (global) {
  'use strict';
  var Data = global.ManakData;

  /* ------------------------------ Helpers ------------------------------ */
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function el(htmlOrTag, attrs, html) {
    if (typeof htmlOrTag === 'string' && !/^<[a-z]/.test(htmlOrTag)) {
      var node = document.createElement(htmlOrTag);
      if (attrs) for (var k in attrs) if (Object.prototype.hasOwnProperty.call(attrs, k)) node.setAttribute(k, attrs[k]);
      if (html != null) node.innerHTML = html;
      return node;
    }
    var tpl = document.createElement('template');
    tpl.innerHTML = htmlOrTag.trim();
    return tpl.content.firstElementChild;
  }
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function toast(message, type) {
    var t = el('<div class="toast"></div>');
    t.textContent = message;
    if (type) t.classList.add('toast-' + type);
    (global.__toastRoot || document.body).appendChild(t);
    requestAnimationFrame(function () { t.classList.add('show'); });
    setTimeout(function () {
      t.classList.remove('show');
      setTimeout(function () { t.remove(); }, 300);
    }, type === 'error' ? 5000 : 2800);
  }

  /* ----------------------- Loading / Empty / Error --------------------- */
  function skeleton(count) {
    count = count || 3;
    var html = '';
    for (var i = 0; i < count; i++) {
      html += '<div class="skeleton-card"><div class="skeleton-line" style="width:35%"></div>' +
        '<div class="skeleton-line"></div><div class="skeleton-line" style="width:70%"></div></div>';
    }
    return html;
  }
  function stateBlock(kind, title, message, actionHtml) {
    var icon = kind === 'error' ? 'error' : (kind === 'empty' ? 'inbox' : 'sync');
    var color = kind === 'error' ? 'text-danger' : (kind === 'empty' ? 'text-text-muted' : 'text-primary');
    return el(
      '<div class="state-block ' + kind + ' flex flex-col items-center justify-center text-center gap-2 p-8">' +
      '<span class="material-symbols-outlined text-[32px] ' + color + '">' + icon + '</span>' +
      '<p class="font-body-sm text-body-sm font-semibold text-on-surface">' + esc(title) + '</p>' +
      (message ? '<p class="font-body-sm text-body-sm text-text-muted max-w-sm">' + esc(message) + '</p>' : '') +
      (actionHtml || '') + '</div>'
    );
  }

  /* ------------------------------ Dark mode ---------------------------- */
  function applyDark(dark) {
    var root = document.documentElement;
    if (dark) root.classList.add('dark'); else root.classList.remove('dark');
    $$('[data-dark-icon]').forEach(function (b) {
      b.textContent = dark ? 'light_mode' : 'dark_mode';
    });
  }
  function toggleDark() {
    var dark = !Data.get('dark');
    Data.set('dark', dark);
    applyDark(dark);
  }

  /* ------------------------------ Routing ------------------------------ */
  var ROUTES = {
    '': 'index.html',
    'home': 'index.html',
    'assistant': 'assistant.html',
    'analyzer': 'analyzer.html',
    'standards': 'standards.html',
    'labs': 'labs.html',
    'roadmaps': 'roadmaps.html',
    'admin': 'admin.html'
  };
  var NAV_LABELS = {
    '': 'home', 'home': 'home', 'assistant': 'assistant',
    'analyzer': 'analyzer', 'standards': 'standards', 'labs': 'labs',
    'roadmaps': 'roadmaps', 'admin': 'admin'
  };
  function routeFor(key, params) {
    var f = ROUTES[key] || ROUTES.home;
    var base = f.replace('.html', '');
    var q = [];
    if (params) for (var k in params) if (Object.prototype.hasOwnProperty.call(params, k) && params[k] != null) q.push(encodeURIComponent(k) + '=' + encodeURIComponent(params[k]));
    return base + '.' + 'html' + (q.length ? '?' + q.join('&') : '');
  }
  function param(name) {
    return new URLSearchParams(global.location.search).get(name);
  }
  /* Maps a route key to the current page's nav item index */
  function navKeyForCurrentPage() {
    var page = global.location.pathname.split('/').pop();
    if (page === 'admin.html') return 'admin';
    if (page === 'assistant.html') return 'assistant';
    if (page === 'analyzer.html') return 'analyzer';
    if (page === 'standards.html') return 'standards';
    if (page === 'labs.html') return 'labs';
    if (page === 'roadmaps.html') return 'roadmaps';
    return 'home';
  }

  /* ----------------------- Wire shared chrome --------------------------- */
  function wireChrome() {
    var active = navKeyForCurrentPage();

    // Sidebar nav items -> real routes
    var navMap = {
      'Home': 'home', 'BIS Assistant': 'assistant', 'Product Analyzer': 'analyzer',
      'Standards Discovery': 'standards', 'Lab Finder': 'labs',
      'My Roadmaps': 'roadmaps', 'Admin Dashboard': 'admin',
      'Settings': null, 'Support': null
    };
    $$('a[data-nav]').forEach(function (a) {
      var label = a.getAttribute('data-nav');
      var key = navMap[label];
      if (key) a.setAttribute('href', routeFor(key));
      if (key === active) {
        a.classList.add('nav-active');
        a.classList.remove('text-text-secondary', 'dark:text-on-surface-variant');
        a.classList.add('bg-primary-light', 'dark:bg-primary-container', 'text-primary', 'dark:text-on-primary-container');
        var ic = $('.material-symbols-outlined', a);
        if (ic && !ic.classList.contains('filled') && !ic.classList.contains('fill') && !ic.hasAttribute('data-weight')) ic.setAttribute('data-weight', 'fill');
      }
    });

    // "New Analysis" CTA
    $$('[data-new-analysis]').forEach(function (b) {
      b.setAttribute('href', routeFor('analyzer', { new: '1' }));
    });

    // Dark mode toggle buttons
    $$('[data-dark-icon]').forEach(function (b) {
      b.addEventListener('click', function (e) { e.preventDefault(); toggleDark(); });
    });

    // Language button -> informational toast
    $$('[data-lang]').forEach(function (b) {
      b.addEventListener('click', function () { toast('Language: English (India)'); });
    });

    // Notifications button
    $$('[data-notifications]').forEach(function (b) {
      b.addEventListener('click', function () {
        toast(Data.get('roadmaps').some(function (r) { return r.status === 'in_progress'; })
          ? '1 roadmap update: QCO Check is in progress.' : 'You are all caught up.');
      });
    });

    // Support button
    $$('[data-support]').forEach(function (a) {
      a.addEventListener('click', function (e) { e.preventDefault(); toast('Support: help@manakmitra.in · +91 1800 22 1234'); });
    });

    // Global Search redirect to RAG Assistant
    $$('input[placeholder*="Search"], input[data-global-search]').forEach(function (inp) {
      inp.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' && inp.value.trim()) {
          e.preventDefault();
          global.location.href = routeFor('assistant') + '?q=' + encodeURIComponent(inp.value.trim());
        }
      });
    });

    applyDark(!!Data.get('dark'));
  }

  /* ------------------------- RAG API (shared) --------------------------- */
  /* Every page that needs an "AI" answer calls this — it always hits the
     real FastAPI + Chroma + Ollama strict-RAG backend (/api/query). There
     is no local/hardcoded fallback: on failure the callback receives an
     Error and callers must surface that, never fabricate an answer. */
  var RAG_BASE_URLS = (function () {
    var urls = ['http://127.0.0.1:8080', 'http://localhost:8080', 'http://127.0.0.1:8000', 'http://localhost:8000'];
    if (global.location.origin.indexOf('http') === 0) urls.unshift(global.location.origin);
    return urls;
  })();

  function ragQuery(question, topK, callback) {
    if (typeof topK === 'function') { callback = topK; topK = 5; }
    var payload = { question: question, top_k: topK || 5 };
    var tried = 0;

    function tryNext() {
      if (tried >= RAG_BASE_URLS.length) {
        callback(new Error('Could not reach the BIS RAG API on any known port (8080/8000). Run `python main.py`.'));
        return;
      }
      var url = RAG_BASE_URLS[tried++] + '/api/query';
      var xhr = new XMLHttpRequest();
      xhr.open('POST', url, true);
      xhr.setRequestHeader('Content-Type', 'application/json');
      xhr.timeout = 45000;
      xhr.onload = function () {
        if (xhr.status >= 200 && xhr.status < 300) {
          try { callback(null, JSON.parse(xhr.responseText)); }
          catch (e) { callback(e); }
        } else {
          tryNext();
        }
      };
      xhr.onerror = tryNext;
      xhr.ontimeout = tryNext;
      xhr.send(JSON.stringify(payload));
    }
    tryNext();
  }

  function ragHealth(callback) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', RAG_BASE_URLS[0] + '/health', true);
    xhr.timeout = 4000;
    xhr.onload = function () { callback(xhr.status === 200, xhr.status === 200 ? JSON.parse(xhr.responseText) : null); };
    xhr.onerror = function () { callback(false, null); };
    xhr.ontimeout = function () { callback(false, null); };
    xhr.send();
  }

  /* Expose helpers */
  var App = {
    $: $, $$: $$, el: el, esc: esc, toast: toast,
    skeleton: skeleton, stateBlock: stateBlock,
    wireChrome: wireChrome, applyDark: applyDark, toggleDark: toggleDark,
    routeFor: routeFor, param: param, navKey: navKeyForCurrentPage, ROUTES: ROUTES,
    ragQuery: ragQuery, ragHealth: ragHealth, RAG_BASE_URLS: RAG_BASE_URLS
  };
  global.ManakApp = App;
})(window);

document.addEventListener('DOMContentLoaded', function () {
  if (window.ManakApp) window.ManakApp.wireChrome();
});
