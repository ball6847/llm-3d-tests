/* =========================================================================
   3D scene bench. Shared behavior for index.html and view.html.
   Classic script, no modules, so everything works over file:// too.

   URL state:
   - http(s): query string (?v=1&model=slug) via pushState, Back works.
   - file://: Chrome forbids pushState with a changed URL on null origins,
     so state moves to the hash (#v=1&model=slug) instead. Query params are
     still read on load, so shared links work in both directions.
   ========================================================================= */

(function () {
  'use strict';

  /* The model list lives in manifest.js, generated from the files in v1/ and
     v2/ by tools/sync-collection.mjs. Version + slug is the unique key; some
     models appear in both versions. */
  var MANIFEST = window.MANIFEST || { 1: [], 2: [] };

  var KB = new Intl.NumberFormat('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

  function fmtBytes(b) { return KB.format(b / 1024) + ' KB'; }

  function findModel(v, slug) {
    var list = MANIFEST[v] || [];
    for (var i = 0; i < list.length; i++) if (list[i].slug === slug) return list[i];
    return null;
  }

  function otherVersion(v, slug) {
    var other = v === '1' ? '2' : '1';
    return findModel(other, slug) ? other : null;
  }

  function scenePath(v, slug) { return 'v' + v + '/' + slug + '.html'; }
  function viewerHref(v, slug) { return 'view.html?v=' + v + '&model=' + encodeURIComponent(slug); }
  function thumbPath(v, slug) { return 'thumbs/v' + v + '-' + slug + '.png'; }

  /* ------------------------------------------------------------ URL state */

  function readState() {
    var p = new URLSearchParams(location.search);
    if (location.hash.length > 1) {
      new URLSearchParams(location.hash.slice(1)).forEach(function (val, key) { p.set(key, val); });
    }
    return { v: p.get('v'), model: p.get('model') };
  }

  function writeState(params, replace) {
    var qs = params.toString();
    if (location.protocol === 'http:' || location.protocol === 'https:') {
      var url = location.pathname + (qs ? '?' + qs : '');
      try {
        history[replace ? 'replaceState' : 'pushState'](null, '', url);
        return;
      } catch (e) { /* fall through to hash */ }
    }
    var target = '#' + qs;
    if (replace) {
      location.replace(target);
    } else if (location.hash !== target) {
      location.hash = target; /* same-document: fires hashchange, adds history entry */
    }
  }

  /* ---------------------------------------------------------------- icons */

  var ARROW_NE = '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 17 17 7"/><path d="M8 7h9v9"/></svg>';
  var KNOT = '<svg width="34" height="34" viewBox="0 0 24 24" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="1.4"><ellipse cx="12" cy="12" rx="9" ry="4"/><ellipse cx="12" cy="12" rx="9" ry="4" transform="rotate(60 12 12)"/><ellipse cx="12" cy="12" rx="9" ry="4" transform="rotate(120 12 12)"/></g></svg>';

  /* ============================================================ index page */

  function initIndex() {
    var radios = Array.prototype.slice.call(document.querySelectorAll('input[name="version"]'));
    var heading = document.getElementById('prompt-heading');
    var fileLabel = document.getElementById('prompt-file');
    var promptText = document.getElementById('prompt-text');
    var count = document.getElementById('result-count');
    var grid = document.getElementById('model-grid');
    var copyBtn = document.getElementById('copy-prompt');
    var copyLabel = document.getElementById('copy-label');
    var copyStatus = document.getElementById('copy-status');
    var lastKey = null;
    var copyTimer = null;

    function apply() {
      var state = readState();
      var v = state.v === '2' ? '2' : '1';
      if (v === lastKey) return;
      lastKey = v;

      radios.forEach(function (r) { r.checked = r.value === v; });
      heading.textContent = 'Prompt v' + v;
      fileLabel.textContent = 'prompt v' + v;
      document.title = 'Prompt v' + v + ' · 3D scene bench';

      var prompts = window.PROMPTS || {};
      promptText.textContent = prompts['v' + v] ||
        '[prompts.js missing] Add prompts.js next to index.html with PROMPT_V1 and PROMPT_V2.';

      buildGrid(v);
      var n = MANIFEST[v].length;
      count.textContent = n + (n === 1 ? ' model' : ' models');
    }

    function buildGrid(v) {
      if (!MANIFEST[v].length) {
        grid.innerHTML = '<li class="grid-empty">No results for this prompt version yet. Drop the model HTML files into v' + v + '/ and run the sync skill.</li>';
        return;
      }
      var html = MANIFEST[v].map(function (m, i) {
        var other = otherVersion(v, m.slug);
        var alt = other
          ? '<a class="card-alt" data-version="' + other + '" href="' + viewerHref(other, m.slug) + '" ' +
            'aria-label="Open the prompt v' + other + ' render of ' + m.slug + '">v' + other + ' render ' + ARROW_NE + '</a>'
          : '';
        return '<li class="card" style="animation-delay:' + Math.min(i * 24, 280) + 'ms">' +
          '<a class="card-link" href="' + viewerHref(v, m.slug) + '">' +
            '<span class="thumb">' +
              '<img src="' + thumbPath(v, m.slug) + '" width="960" height="540" loading="lazy" ' +
                'alt="Rendered preview of ' + m.slug + ' for prompt v' + v + '">' +
              '<span class="thumb-fallback" hidden>' + KNOT + '<span>No preview</span></span>' +
            '</span>' +
            '<span class="card-name" translate="no">' + m.slug + '</span>' +
          '</a>' +
          '<div class="card-meta">' +
            '<span class="card-size">' + fmtBytes(m.bytes) + '</span>' + alt +
          '</div>' +
        '</li>';
      }).join('');
      grid.innerHTML = html;

      Array.prototype.forEach.call(grid.querySelectorAll('img'), function (img) {
        img.addEventListener('error', function () {
          img.hidden = true;
          img.nextElementSibling.hidden = false;
        });
      });
    }

    radios.forEach(function (r) {
      r.addEventListener('change', function () {
        if (!r.checked) return;
        writeState(new URLSearchParams({ v: r.value }), false);
        apply();
      });
    });

    function copyDone(ok) {
      copyLabel.textContent = ok ? 'Copied' : 'Copy failed';
      if (ok) copyBtn.setAttribute('data-copied', ''); else copyBtn.removeAttribute('data-copied');
      copyStatus.textContent = ok ? 'Prompt copied to clipboard.' : 'Copy failed. Select the text and copy it manually.';
      clearTimeout(copyTimer);
      copyTimer = setTimeout(function () {
        copyLabel.textContent = 'Copy prompt';
        copyBtn.removeAttribute('data-copied');
        copyStatus.textContent = '';
      }, 2000);
    }

    function copyFallback(text) {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      var ok = false;
      try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
      ta.remove();
      copyDone(ok);
    }

    copyBtn.addEventListener('click', function () {
      var text = promptText.textContent;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(
          function () { copyDone(true); },
          function () { copyFallback(text); }
        );
      } else {
        copyFallback(text);
      }
    });

    window.addEventListener('popstate', apply);
    window.addEventListener('hashchange', apply);
    apply();
  }

  /* =========================================================== viewer page */

  function initViewer() {
    var backLink = document.getElementById('back-link');
    var versionChip = document.getElementById('viewer-version');
    var modelName = document.getElementById('viewer-model');
    var select = document.getElementById('model-select');
    var rawLink = document.getElementById('raw-link');
    var frame = document.getElementById('scene-frame');
    var status = document.getElementById('stage-status');
    var statusText = document.getElementById('stage-status-text');
    var errorPanel = document.getElementById('error-panel');
    var errorTitle = document.getElementById('error-title-text');
    var errorDetail = document.getElementById('error-detail');
    var errorActions = document.getElementById('error-actions');
    var errorBack = document.getElementById('error-back');

    var lastKey = null;
    var currentV = '1';
    var currentSrc = null;
    var selectV = null;
    var loadTimer = null;
    var isHttp = location.protocol === 'http:' || location.protocol === 'https:';

    /* Navigate the iframe without adding a joint-session-history entry.
       Same-origin (http) lets us use location.replace, so the browser Back
       button only ever sees top-level entries. On file:// the iframe is an
       opaque origin and location.replace is blocked; there we do a full
       top-level navigation for swaps instead (see the select handler), so
       Back still works. The first load uses src, which replaces the
       iframe's initial about:blank and adds no entry. */
    function frameNavigate(src) {
      currentSrc = src;
      if (isHttp) {
        try {
          frame.contentWindow.location.replace(src);
          return;
        } catch (e) { /* fall through */ }
      }
      frame.src = src;
    }

    function fillSelect(v, selected) {
      if (selectV !== v) {
        selectV = v;
        select.innerHTML = '';
        MANIFEST[v].forEach(function (m) {
          var o = document.createElement('option');
          o.value = m.slug;
          o.textContent = m.slug;
          select.appendChild(o);
        });
      }
      if (selected && findModel(v, selected)) {
        select.value = selected;
      } else {
        select.selectedIndex = -1;
      }
    }

    function showStatus(text) {
      statusText.textContent = text;
      status.hidden = false;
      clearTimeout(loadTimer);
      loadTimer = setTimeout(function () {
        if (!status.hidden) {
          statusText.textContent = 'Still loading. The scene fetches Three.js from a CDN.';
        }
      }, 15000);
    }

    frame.addEventListener('load', function () {
      clearTimeout(loadTimer);
      status.hidden = true;
    });

    /* Build the detail line with DOM nodes only. The slug comes from the
       URL, so it must never go through innerHTML. */
    function showError(title, detailParts, chips, v) {
      frame.hidden = true;
      currentSrc = 'about:blank';
      if (isHttp) {
        try { frame.contentWindow.location.replace('about:blank'); } catch (e) { frame.src = 'about:blank'; }
      } else {
        frame.src = 'about:blank';
      }
      status.hidden = true;
      clearTimeout(loadTimer);

      errorTitle.textContent = title;
      errorDetail.textContent = '';
      detailParts.forEach(function (part) {
        if (typeof part === 'string') {
          errorDetail.appendChild(document.createTextNode(part));
        } else {
          errorDetail.appendChild(part);
        }
      });

      errorActions.textContent = '';
      chips.forEach(function (chip) {
        var a = document.createElement('a');
        a.className = 'model-chip';
        a.href = chip.href;
        a.textContent = chip.label;
        a.setAttribute('translate', 'no');
        errorActions.appendChild(a);
      });

      errorBack.href = 'index.html?v=' + v;
      errorPanel.hidden = false;
      errorPanel.focus();
      document.title = title + ' · 3D scene bench';
    }

    function codeNode(text) {
      var c = document.createElement('code');
      c.textContent = text;
      c.setAttribute('translate', 'no');
      return c;
    }

    function modelChips(v) {
      return MANIFEST[v].map(function (m) {
        return { href: viewerHref(v, m.slug), label: m.slug };
      });
    }

    function apply() {
      var state = readState();
      var v = state.v === '2' ? '2' : '1';
      var badVersion = state.v !== null && state.v !== '1' && state.v !== '2';
      var slug = state.model || '';
      var key = v + '/' + slug + (badVersion ? '/badv' : '');
      if (key === lastKey) return;
      lastKey = key;
      currentV = v;

      backLink.href = 'index.html?v=' + v;
      versionChip.textContent = 'v' + v;
      versionChip.setAttribute('data-version', v);
      fillSelect(v, slug);

      if (badVersion) {
        modelName.textContent = '';
        showError(
          'Unknown prompt version',
          ['There is no prompt ', codeNode('v' + state.v), '. Pick a version to browse its results.'],
          [
            { href: 'index.html?v=1', label: 'Prompt v1 · ' + MANIFEST[1].length + ' models' },
            { href: 'index.html?v=2', label: 'Prompt v2 · ' + MANIFEST[2].length + ' models' }
          ],
          v
        );
        return;
      }

      if (!slug) {
        modelName.textContent = '';
        showError(
          'Pick a model',
          ['This viewer shows one result at a time. Choose a prompt v' + v + ' result, or go back to the grid.'],
          modelChips(v),
          v
        );
        return;
      }

      if (!findModel(v, slug)) {
        modelName.textContent = slug;
        modelName.title = slug;
        showError(
          'Model not found',
          ['No result named ', codeNode(slug), ' exists for prompt v' + v + '. It may belong to the other prompt version, or the name is misspelled.'],
          modelChips(v),
          v
        );
        return;
      }

      /* Valid result */
      errorPanel.hidden = true;
      frame.hidden = false;
      modelName.textContent = slug;
      modelName.title = slug;
      document.title = slug + ' · v' + v + ' · 3D scene bench';
      rawLink.href = scenePath(v, slug);
      frame.title = 'Rendered scene: ' + slug + ', prompt v' + v;

      var src = scenePath(v, slug);
      if (currentSrc !== src) {
        showStatus('Loading scene…');
        frameNavigate(src);
      }
    }

    select.addEventListener('change', function () {
      if (!select.value) return;
      if (isHttp) {
        writeState(new URLSearchParams({ v: currentV, model: select.value }), false);
        apply();
      } else {
        /* file://: a full navigation keeps Back/Forward correct, since an
           in-place iframe src swap would add joint-history entries that
           Back would undo before the top-level state. */
        location.assign(viewerHref(currentV, select.value));
      }
    });

    window.addEventListener('popstate', apply);
    window.addEventListener('hashchange', apply);
    /* Chrome restores form-control values when navigating Back/Forward to a
       reloaded document (the file:// path). Re-assert the select so it always
       matches the model actually on screen. */
    window.addEventListener('pageshow', function () {
      var st = readState();
      var v = st.v === '2' ? '2' : '1';
      if (st.model && findModel(v, st.model)) select.value = st.model;
    });
    apply();
  }

  /* ----------------------------------------------------------------- boot */

  var page = document.body.getAttribute('data-page');
  if (page === 'index') initIndex();
  else if (page === 'viewer') initViewer();
})();