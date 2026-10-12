/*! Arass Tech Persian · Mirror engine v0.2.0 · (c) Arass Tech
 *  Reads the page's own stylesheets once and writes an RTL counterpart for every rule
 *  that is tied to a side (left/right). Runs only for Persian users. */
(function (w, d) {
    'use strict';
    var SCOPE = 'html.atp-rtl';
    var PAIRS = [
        ['margin-left', 'margin-right', '0'],
        ['padding-left', 'padding-right', '0'],
        ['left', 'right', 'auto'],
        ['border-left-width', 'border-right-width', '0'],
        ['border-left-style', 'border-right-style', null],
        ['border-left-color', 'border-right-color', null],
        ['border-top-left-radius', 'border-top-right-radius', '0'],
        ['border-bottom-left-radius', 'border-bottom-right-radius', '0']
    ];
    var SWAP_WORD = { left: 'right', right: 'left' };
    var outputs = typeof WeakMap !== 'undefined' ? new WeakMap() : null;
    var pending = [];
    var timer = 0;
    var active = false;

    /* ---------- selectors ---------- */
    function splitList(sel) {
        var out = [], depth = 0, start = 0, q = null;
        for (var i = 0; i < sel.length; i++) {
            var c = sel.charAt(i);
            if (q) { if (c === q && sel.charAt(i - 1) !== '\\') { q = null; } continue; }
            if (c === '"' || c === "'") { q = c; } else if (c === '(' || c === '[') { depth++; } else if (c === ')' || c === ']') { depth--; } else if (c === ',' && depth === 0) {
                out.push(sel.slice(start, i)); start = i + 1;
            }
        }
        out.push(sel.slice(start));
        return out;
    }

    function scope(sel) {
        var parts = splitList(sel), res = [];
        for (var i = 0; i < parts.length; i++) {
            var s = parts[i].trim();
            if (!s) { continue; }
            if (/^html(?![\w-])/i.test(s)) { res.push(SCOPE + s.slice(4)); } else if (/^:root/i.test(s)) { res.push(':root.atp-rtl' + s.slice(5)); } else { res.push(SCOPE + ' ' + s); }
        }
        return res.join(', ');
    }

    /* ---------- values ---------- */
    function flipWord(v) {
        var t = v.trim().toLowerCase();
        return SWAP_WORD[t] || null;
    }

    function flipBgX(v) {
        var layers = splitList(v), changed = false;
        for (var i = 0; i < layers.length; i++) {
            var t = layers[i].trim(), m, r = t;
            if (t === 'left') { r = 'right'; } else if (t === 'right') { r = 'left'; } else if (t === '0' || t === '0px' || t === '0%') { r = '100%'; } else if (t === '100%') { r = '0%'; } else if ((m = /^(-?[\d.]+)%$/.exec(t))) { r = (100 - parseFloat(m[1])) + '%'; } else if ((m = /^(left|right)\s+(.+)$/.exec(t))) { r = SWAP_WORD[m[1]] + ' ' + m[2]; } else if (/^-?[\d.]+(px|em|rem)$/.test(t)) { r = 'right ' + t; }
            if (r !== t) { changed = true; }
            layers[i] = r;
        }
        return changed ? layers.join(', ') : null;
    }

    var BOX = ['margin', 'padding', 'border-width', 'border-style', 'border-color', 'inset', 'border-radius'];
    function splitWords(v) {
        var out = [], depth = 0, cur = '';
        for (var i = 0; i < v.length; i++) {
            var c = v.charAt(i);
            if (c === '(') { depth++; } else if (c === ')') { depth--; }
            if (/\s/.test(c) && depth === 0) { if (cur) { out.push(cur); cur = ''; } } else { cur += c; }
        }
        if (cur) { out.push(cur); }
        return out;
    }

    var NUM = /^\s*-?[\d.]+(px|%|em|rem|vw|vh)?\s*$/;
    function neg(v) {
        v = v.trim();
        if (!NUM.test(v)) { return null; }
        if (/^-?0+(\.0+)?[a-z%]*$/.test(v)) { return v; }
        return v.charAt(0) === '-' ? v.slice(1) : '-' + v;
    }

    function flipTransform(t) {
        var changed = false;
        var r = t.replace(/translateX\(([^()]*)\)/g, function (m, a) {
            var n = neg(a); if (n === null) { return m; } changed = true; return 'translateX(' + n + ')';
        }).replace(/translate(3d)?\(([^(),]*)(,[^()]*)?\)/g, function (m, d3, a, rest) {
            var n = neg(a); if (n === null) { return m; } changed = true; return 'translate' + (d3 || '') + '(' + n + (rest || '') + ')';
        });
        return changed ? r : null;
    }

    /* ---------- rules ---------- */
    function mirrorDecls(st) {
        if (!st || !st.length) { return ''; }
        var out = [], i, p;
        function val(n) { return st.getPropertyValue(n); }
        function imp(n) { return st.getPropertyPriority(n) ? ' !important' : ''; }
        /* left:50% / right:50% is centering (with a negative margin or translateX(-50%) that is often set inline), not a side */
        var centered = (val('left').trim() === '50%' && !val('right')) || (val('right').trim() === '50%' && !val('left'));
        for (i = 0; i < PAIRS.length; i++) {
            var a = PAIRS[i][0], b = PAIRS[i][1], reset = PAIRS[i][2];
            if (centered && (a === 'left' || a === 'margin-left')) { continue; }
            var va = val(a), vb = val(b);
            if (!va && !vb) { continue; }
            if (va && vb) {
                /* re-assert even when equal, so the mirrored layer keeps the original cascade order */
                out.push(a + ':' + vb + imp(b), b + ':' + va + imp(a));
            } else if (va) {
                out.push(b + ':' + va + imp(a));
                if (reset !== null) { out.push(a + ':' + reset + imp(a)); }
            } else {
                out.push(a + ':' + vb + imp(b));
                if (reset !== null) { out.push(b + ':' + reset + imp(b)); }
            }
        }
        /* shorthands that contain var(): the browser keeps them unexpanded, so their longhands read empty */
        var bl = val('border-left'), br = val('border-right');
        if ((bl || br) && !val('border-left-width') && !val('border-right-width') && /var\(/.test(bl + br)) {
            out.push('border-left:' + (br || 'none') + (br ? imp('border-right') : imp('border-left')));
            out.push('border-right:' + (bl || 'none') + (bl ? imp('border-left') : imp('border-right')));
        }
        for (i = 0; i < BOX.length; i++) {
            p = BOX[i];
            var sv = val(p);
            if (!sv || !/var\(/.test(sv)) { continue; }
            var parts = splitWords(sv);
            if (p === 'border-radius') {
                if (sv.indexOf('/') >= 0 || parts.length < 2) { continue; }
                /* expand to tl tr br bl, then swap left and right */
                var q = parts.length === 2 ? [parts[0], parts[1], parts[0], parts[1]]
                    : parts.length === 3 ? [parts[0], parts[1], parts[2], parts[1]] : parts.slice(0, 4);
                if (q[0] !== q[1] || q[2] !== q[3]) { out.push(p + ':' + [q[1], q[0], q[3], q[2]].join(' ') + imp(p)); }
            } else if (parts.length === 4 && parts[1] !== parts[3]) {
                out.push(p + ':' + [parts[0], parts[3], parts[2], parts[1]].join(' ') + imp(p));
            }
        }
        var simple = ['float', 'clear', 'text-align'];
        for (i = 0; i < simple.length; i++) {
            p = simple[i];
            var v = val(p);
            if (v) { out.push(p + ':' + (flipWord(v) || v) + imp(p)); }
        }
        var tf = centered ? '' : val('transform');
        if (tf && (val('left') || val('right'))) {
            var ft = flipTransform(tf);
            if (ft) { out.push('transform:' + ft + imp('transform')); }
        }
        var bx = val('background-position-x');
        if (bx) { out.push('background-position-x:' + (flipBgX(bx) || bx) + imp('background-position-x')); }
        return out.join(';');
    }

    function walk(rules, buf) {
        for (var i = 0; i < rules.length; i++) {
            var r = rules[i];
            try {
                if (r.type === 1) {
                    var sel = r.selectorText;
                    if (!sel || /rtl|dir=|\[dir|CodeMirror|ace_|monaco|[.#]atp-/i.test(sel)) { continue; }
                    var body = mirrorDecls(r.style);
                    if (body) { buf.push(scope(sel) + '{' + body + '}'); }
                } else if (r.type === 4 || r.type === 12) {
                    var inner = [];
                    walk(r.cssRules, inner);
                    if (inner.length) {
                        var cond = r.type === 4 ? r.media.mediaText : r.conditionText;
                        buf.push((r.type === 4 ? '@media ' : '@supports ') + cond + '{' + inner.join('\n') + '}');
                    }
                } else if (r.type === 3 && r.styleSheet) {
                    var sub = rulesOf(r.styleSheet);
                    if (sub) { walk(sub, buf); }
                }
            } catch (e) { /* skip unreadable rule */ }
        }
    }

    function rulesOf(sheet) {
        try { return sheet.cssRules; } catch (e) { return null; }
    }

    function isOurs(node) {
        return !!(node && node.getAttribute && (node.hasAttribute('data-atp-mirror') || node.id === 'atp-preview'));
    }

    function render(sheet) {
        var owner = sheet.ownerNode;
        if (!owner || isOurs(owner)) { return; }
        var key = owner.tagName === 'LINK' && owner.href ? CACHE + owner.href : null;
        var text = key ? cacheGet(key) : null;
        if (text === null) {
            var rules = rulesOf(sheet);
            if (!rules) { return; }
            var buf = [];
            walk(rules, buf);
            text = buf.join('\n');
            if (key && rules.length) { cachePut(key, text); }
        }
        var out = outputs && outputs.get(sheet);
        if (!text && !out) { return; }
        if (!out) {
            out = d.createElement('style');
            out.setAttribute('data-atp-mirror', '');
            (d.head || d.documentElement).appendChild(out);
            if (outputs) { outputs.set(sheet, out); }
        }
        if (out.textContent !== text) { out.textContent = text; }
    }

    /* ---------- cache: mirrored CSS per stylesheet URL (batch URLs carry a content hash) ---------- */
    var CACHE = 'atp-m4:';
    var cacheTidied = false;
    function tidyCache() {
        /* drop entries of older engine versions and keep the cache small: batch URLs change with every upgrade */
        if (cacheTidied) { return; }
        cacheTidied = true;
        try {
            var mine = [], i, n;
            for (i = w.localStorage.length - 1; i >= 0; i--) {
                n = w.localStorage.key(i);
                if (!n || n.indexOf('atp-m') !== 0) { continue; }
                if (n.indexOf(CACHE) !== 0) { w.localStorage.removeItem(n); } else { mine.push(n); }
            }
            if (mine.length > 60) { for (i = 0; i < mine.length; i++) { w.localStorage.removeItem(mine[i]); } }
        } catch (e) { /* storage unavailable */ }
    }
    function cacheGet(k) {
        tidyCache();
        try { return w.localStorage.getItem(k); } catch (e) { return null; }
    }
    function cachePut(k, v) {
        try { w.localStorage.setItem(k, v); } catch (e) {
            try {
                for (var i = w.localStorage.length - 1; i >= 0; i--) {
                    var n = w.localStorage.key(i);
                    if (n && n.indexOf('atp-m') === 0) { w.localStorage.removeItem(n); }
                }
                w.localStorage.setItem(k, v);
            } catch (e2) { /* storage unavailable: fine, we just recompute next time */ }
        }
    }

    function schedule(sheet) {
        if (pending.indexOf(sheet) < 0) { pending.push(sheet); }
        if (!timer) {
            timer = w.setTimeout(function () {
                timer = 0;
                var list = pending; pending = [];
                for (var i = 0; i < list.length; i++) { render(list[i]); }
            }, 30);
        }
    }

    function scanAll() {
        var sheets = d.styleSheets;
        for (var i = 0; i < sheets.length; i++) { render(sheets[i]); }
    }

    function watch() {
        var proto = w.CSSStyleSheet && w.CSSStyleSheet.prototype;
        if (proto && !proto.__atp) {
            var ins = proto.insertRule, del = proto.deleteRule;
            proto.insertRule = function () {
                var r = ins.apply(this, arguments);
                if (active && !isOurs(this.ownerNode)) { schedule(this); }
                return r;
            };
            proto.deleteRule = function () {
                var r = del.apply(this, arguments);
                if (active && !isOurs(this.ownerNode)) { schedule(this); }
                return r;
            };
            proto.__atp = true;
        }
        if (!w.MutationObserver) { return; }
        new MutationObserver(function (muts) {
            for (var i = 0; i < muts.length; i++) {
                var m = muts[i], nodes = m.addedNodes;
                if (m.target && m.target.tagName === 'STYLE' && m.target.sheet && !isOurs(m.target)) {
                    schedule(m.target.sheet);
                }
                for (var j = 0; j < nodes.length; j++) {
                    var n = nodes[j];
                    if (n.nodeType !== 1 || isOurs(n)) { continue; }
                    if (n.tagName === 'STYLE' && n.sheet) { schedule(n.sheet); }
                    if (n.tagName === 'LINK' && /stylesheet/i.test(n.rel)) {
                        if (n.sheet && rulesOf(n.sheet)) { schedule(n.sheet); }
                        n.addEventListener('load', function () { if (this.sheet) { schedule(this.sheet); } });
                    }
                }
            }
        }).observe(d.documentElement, { childList: true, subtree: true });
    }

    w.ATP = w.ATP || {};
    w.ATP.mirror = {
        start: function () {
            if (active) { return; }
            active = true;
            watch();
            scanAll();
            w.addEventListener('load', scanAll);
        },
        rescan: scanAll
    };
})(window, document);
