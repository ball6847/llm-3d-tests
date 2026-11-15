/* =========================================================================
   3D scene bench. Shared behavior for index.html and view.html.
   Classic script, no modules, so everything works over file:// too.

   URL state:
   - http(s): query string (?v=<collection>&model=slug) via pushState, Back works.
   - file://: Chrome forbids pushState with a changed URL on null origins,
     so state moves to the hash (#v=<collection>&model=slug) instead. Query params
     are still read on load, so shared links work in both directions.

   A collection is identified by its slug. The slug is also the folder name
   under collections/ and the thumbnail prefix. collections.js holds the list.
   ========================================================================= */

(function () {
  'use strict';

  var COLLECTIONS = window.COLLECTIONS || [];
  var MANIFEST = window.MANIFEST || {};

  var KB = new Intl.NumberFormat('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

  function fmtBytes(b) { return KB.format(b / 1024) + ' KB'; }

  function collectionBySlug(slug) {
    for (var i = 0; i < COLLECTIONS.length; i++) if (COLLECTIONS[i].slug === slug) return COLLECTIONS[i];
    return null;
  }

  /* Accept the old numbered keys so links made before the rename still work. */
  function resolveSlug(value) {
    if (!value) return null;
    if (collectionBySlug(value)) return value;
    for (var i = 0; i < COLLECTIONS.length; i++) {
      if (String(COLLECTIONS[i].legacy) === String(value)) return COLLECTIONS[i].slug;
    }
    return null;
  }

  function collectionIndex(slug) {
    for (var i = 0; i < COLLECTIONS.length; i++) if (COLLECTIONS[i].slug === slug) return i;
    return 0;
  }

  function defaultSlug() {
    return COLLECTIONS.length ? COLLECTIONS[0].slug : '';
  }

  function modelsOf(slug) { return MANIFEST[slug] || []; }

  function findModel(slug, model) {
    var list = modelsOf(slug);
    for (var i = 0; i < list.length; i++) if (list[i].slug === model) return list[i];
    return null;
  }

  /* The other collection, when the same model was run there too. */
  function otherVersion(slug, model) {
    for (var i = 0; i < COLLECTIONS.length; i++) {
      if (COLLECTIONS[i].slug === slug) continue;
      if (findModel(COLLECTIONS[i].slug, model)) return COLLECTIONS[i].slug;
    }
    return null;
  }

  function scenePath(slug, model) { return 'collections/' + slug + '/' + model + '.html'; }
  function viewerHref(slug, model) {
    return 'view.html?v=' + encodeURIComponent(slug) + '&model=' + encodeURIComponent(model);
  }
  function thumbPath(slug, model) { return 'thumbs/' + slug + '-' + model + '.png'; }

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
    var collectionSelect = document.getElementById('collection-select');
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

    if (collectionSelect) {
      collectionSelect.innerHTML = '';
      COLLECTIONS.forEach(function (c) {
        var o = document.createElement('option');
        o.value = c.slug;
        o.textContent = c.label;
        collectionSelect.appendChild(o);
      });
    }

    function apply() {
      var state = readState();
      var slug = resolveSlug(state.v) || defaultSlug();
      if (slug === lastKey) return;
      lastKey = slug;

      var collection = collectionBySlug(slug);
      var label = collection ? collection.label : slug;

      if (collectionSelect) {
        collectionSelect.value = slug;
        collectionSelect.setAttribute('data-index', String(collectionIndex(slug)));
      }
      heading.textContent = label;
      fileLabel.textContent = 'prompts.js · ' + slug;
      document.title = label + ' · 3D scene bench';

      var prompts = window.PROMPTS || {};
      promptText.textContent = prompts[slug] ||
        '[prompts.js missing] Add prompts.js next to index.html with a string per collection.';
      /* Thai has no monospaced face, so a Thai prompt reads better in the
         proportional face than with Latin words set in mono beside it. */
      promptText.classList.toggle('is-thai', /[\u0E00-\u0E7F]/.test(promptText.textContent));

      buildGrid(slug);
      var n = modelsOf(slug).length;
      count.textContent = n + (n === 1 ? ' model' : ' models');
    }

    function buildGrid(slug) {
      var models = modelsOf(slug);
      if (!models.length) {
        grid.innerHTML = '<li class="grid-empty">No results for this collection yet. Drop the model HTML files into ' +
          'collections/' + slug + '/ and run the sync skill.</li>';
        return;
      }
      var html = models.map(function (m, i) {
        var other = otherVersion(slug, m.slug);
        var otherLabel = other ? (collectionBySlug(other) || {}).short : '';
        var alt = other
          ? '<a class="card-alt" data-index="' + collectionIndex(other) + '" href="' + viewerHref(other, m.slug) + '" ' +
            'aria-label="Open the ' + otherLabel + ' render of ' + m.slug + '" title="' + otherLabel + ' render">' +
            otherLabel + ' ' + ARROW_NE + '</a>'
          : '';
        return '<li class="card" style="animation-delay:' + Math.min(i * 24, 280) + 'ms">' +
          '<a class="card-link" href="' + viewerHref(slug, m.slug) + '">' +
            '<span class="thumb">' +
              '<img src="' + thumbPath(slug, m.slug) + '" width="960" height="540" loading="lazy" ' +
                'alt="Rendered preview of ' + m.slug + ' for ' + slug + '">' +
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

      Array.prototype.slice.call(grid.querySelectorAll('img')).forEach(function (img) {
        img.addEventListener('error', function () {
          img.hidden = true;
          img.nextElementSibling.hidden = false;
        });
      });
    }

    if (collectionSelect) {
      collectionSelect.addEventListener('change', function () {
        writeState(new URLSearchParams({ v: collectionSelect.value }), false);
        apply();
      });
    }

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
    var collectionChip = document.getElementById('viewer-collection');
    var collectionSelect = document.getElementById('collection-select');
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
    var currentSlug = defaultSlug();
    var currentSrc = null;
    var selectVersion = null;
    var loadTimer = null;
    var isHttp = location.protocol === 'http:' || location.protocol === 'https:';

    if (collectionSelect) {
      collectionSelect.innerHTML = '';
      COLLECTIONS.forEach(function (c) {
        var o = document.createElement('option');
        o.value = c.slug;
        o.textContent = c.label;
        collectionSelect.appendChild(o);
      });
    }

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

    function fillSelect(slug, selected) {
      if (selectVersion !== slug) {
        selectVersion = slug;
        select.innerHTML = '';
        var placeholder = document.createElement('option');
        placeholder.value = '';
        placeholder.textContent = 'Choose a model';
        select.appendChild(placeholder);
        modelsOf(slug).forEach(function (m) {
          var o = document.createElement('option');
          o.value = m.slug;
          o.textContent = m.slug;
          select.appendChild(o);
        });
      }
      if (selected && findModel(slug, selected)) {
        select.value = selected;
      } else {
        select.value = '';
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
    function showError(title, detailParts, chips, slug) {
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

      errorBack.href = 'index.html?v=' + encodeURIComponent(slug);
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

    function modelChips(slug) {
      return modelsOf(slug).map(function (m) {
        return { href: viewerHref(slug, m.slug), label: m.slug };
      });
    }

    function collectionChips() {
      return COLLECTIONS.map(function (c) {
        return {
          href: 'index.html?v=' + encodeURIComponent(c.slug),
          label: c.label + ' · ' + modelsOf(c.slug).length + ' models'
        };
      });
    }

    function apply() {
      var state = readState();
      var slug = resolveSlug(state.v);
      var badVersion = state.v !== null && !slug;
      var model = state.model || '';
      var key = (slug || '?') + '/' + model + (badVersion ? '/badv' : '');
      if (key === lastKey) return;
      lastKey = key;
      currentSlug = slug || defaultSlug();

      backLink.href = 'index.html?v=' + encodeURIComponent(currentSlug);
      var collection = collectionBySlug(currentSlug);
      collectionChip.textContent = collection ? collection.short : currentSlug;
      collectionChip.setAttribute('data-index', String(collectionIndex(currentSlug)));
      collectionChip.title = collection ? collection.label : currentSlug;
      if (collectionSelect) {
        collectionSelect.value = currentSlug;
        collectionSelect.setAttribute('data-index', String(collectionIndex(currentSlug)));
      }
      fillSelect(currentSlug, model);

      if (badVersion) {
        modelName.textContent = '';
        showError(
          'Unknown collection',
          ['There is no collection ', codeNode(state.v), '. Pick one to browse its results.'],
          collectionChips(),
          currentSlug
        );
        return;
      }

      if (!model) {
        modelName.textContent = '';
        showError(
          'Pick a model',
          ['This viewer shows one result at a time. Choose a ' + currentSlug + ' result, or go back to the grid.'],
          modelChips(currentSlug),
          currentSlug
        );
        return;
      }

      if (!findModel(currentSlug, model)) {
        modelName.textContent = model;
        modelName.title = model;
        showError(
          'Model not found',
          ['No result named ', codeNode(model), ' exists for ' + currentSlug + '. It may belong to the other collection, or the name is misspelled.'],
          modelChips(currentSlug),
          currentSlug
        );
        return;
      }

      /* Valid result */
      errorPanel.hidden = true;
      frame.hidden = false;
      modelName.textContent = model;
      modelName.title = model;
      document.title = model + ' · ' + currentSlug + ' · 3D scene bench';
      rawLink.href = scenePath(currentSlug, model);
      frame.title = 'Rendered scene: ' + model + ', ' + currentSlug;

      var src = scenePath(currentSlug, model);
      if (currentSrc !== src) {
        showStatus('Loading scene…');
        frameNavigate(src);
      }
    }

    select.addEventListener('change', function () {
      if (!select.value) return;
      if (isHttp) {
        writeState(new URLSearchParams({ v: currentSlug, model: select.value }), false);
        apply();
      } else {
        /* file://: a full navigation keeps Back/Forward correct, since an
           in-place iframe src swap would add joint-history entries that
           Back would undo before the top-level state. */
        location.assign(viewerHref(currentSlug, select.value));
      }
    });

    if (collectionSelect) {
      collectionSelect.addEventListener('change', function () {
        var next = collectionSelect.value;
        if (!next || next === currentSlug) return;
        var model = select.value || (readState().model || '');
        /* Keep the same model when the other collection ran it too, otherwise
           send the visitor to that collection's grid. */
        location.assign(findModel(next, model)
          ? viewerHref(next, model)
          : 'index.html?v=' + encodeURIComponent(next));
      });
    }

    window.addEventListener('popstate', apply);
    window.addEventListener('hashchange', apply);
    /* Chrome restores form-control values when navigating Back/Forward to a
       reloaded document (the file:// path). Re-assert the select so it always
       matches the model actually on screen. */
    window.addEventListener('pageshow', function () {
      var st = readState();
      var slug = resolveSlug(st.v) || defaultSlug();
      if (st.model && findModel(slug, st.model)) select.value = st.model;
    });
    apply();
  }

  /* ----------------------------------------------------------------- boot */

  var page = document.body.getAttribute('data-page');
  if (page === 'index') initIndex();
  else if (page === 'viewer') initViewer();
})();
