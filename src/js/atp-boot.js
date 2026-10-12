/*! Arass Tech Persian for Jira Service Management · v1.2.0 · (c) Arass Tech */
(function (w, d) {
    'use strict';
    var root = d.documentElement;
    if (!root || root.getAttribute('data-atp')) { return; }
    root.setAttribute('data-atp', '1.2.0');
    root.classList.add('atp');

    /* ---------- settings (saved by admins on the Arass Tech Persian settings page) ---------- */
    var DATA_KEY = 'ir.arasstech.persian.jsm:atp-ui.settings';
    var DEFAULTS = {
        rtlAgent: true,        /* right-to-left layout for agents/admins using Persian */
        rtlPortal: true,       /* right-to-left layout on the customer portal */
        font: 'vazirmatn',     /* 'vazirmatn' | 'system' */
        fontEveryone: true,    /* Persian glyphs in Vazirmatn for every user, whatever their language */
        smartBidi: true,       /* each paragraph of user content follows its own direction */
        editorRtl: true,       /* rich-text editors start right-to-left for Persian users */
        jalali: true,          /* show dates in the Jalali calendar */
        jalaliPicker: true,    /* Jalali date picker */
        dateDigits: 'fa',      /* 'fa' | 'latin' digits in dates */
        theme: 'arass'         /* 'arass' (Arass Light) | 'jira' (Jira's own look) */
    };

    var CHOICES = { font: ['vazirmatn', 'system'], dateDigits: ['fa', 'latin'], theme: ['arass', 'jira'] };

    function readSettings() {
        var s = null, raw;
        try {
            if (w.WRM && w.WRM.data && typeof w.WRM.data.claim === 'function') { s = w.WRM.data.claim(DATA_KEY); }
        } catch (e) { s = null; }
        if (!s) {
            try {
                raw = w.WRM && w.WRM._unparsedData && w.WRM._unparsedData[DATA_KEY];
                if (raw) { s = typeof raw === 'string' ? JSON.parse(raw) : raw; }
            } catch (e2) { s = null; }
        }
        if (s && typeof s === 'object') {
            try { w.localStorage.setItem('atp-settings', JSON.stringify(s)); } catch (e3) { /* private mode */ }
        } else {
            try { s = JSON.parse(w.localStorage.getItem('atp-settings') || 'null'); } catch (e4) { s = null; }
        }
        var out = {}, k;
        TEXT = (s && s.text && typeof s.text === 'object') ? s.text : null;
        for (k in DEFAULTS) { if (DEFAULTS.hasOwnProperty(k)) { out[k] = DEFAULTS[k]; } }
        if (s && typeof s === 'object') {
            for (k in s) {
                if (s.hasOwnProperty(k) && DEFAULTS.hasOwnProperty(k) && typeof s[k] === typeof DEFAULTS[k] &&
                        (!CHOICES[k] || CHOICES[k].indexOf(s[k]) >= 0)) { out[k] = s[k]; }
            }
        }
        return out;
    }

    var TEXT = null;                 /* default Persian text -> administrator's text, for texts built into scripts */
    var S = readSettings();
    w.ATP = w.ATP || {};
    w.ATP.settings = S;
    w.ATP.version = '1.2.0';

    var isFa = false;
    var isPortal = /\/servicedesk\/customer\//.test(w.location.pathname);
    var FRAMED = (function () { try { return w.top !== w; } catch (e) { return true; } })();   /* dashboard gadgets run in frames */

    function userLocale() {
        var meta = d.querySelector('meta[name="ajs-user-locale"]');
        var v = (meta && meta.getAttribute('content')) || root.getAttribute('lang') || '';
        if (!v) {
            var s = d.querySelector('script[src*="locale="]');
            var m = s && /[?&]locale=([a-zA-Z_-]+)/.exec(s.getAttribute('src'));
            v = m ? m[1] : '';
        }
        return v.toLowerCase().replace('-', '_');
    }

    /* ---------- rich-text editors live in iframes: give them the font and smart direction ---------- */
    var FONT_STACK = '"ATP Vazirmatn", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif';
    var fontFaceCss = null;

    function findFontFace() {
        if (fontFaceCss !== null) { return fontFaceCss; }
        fontFaceCss = '';
        for (var i = 0; i < d.styleSheets.length; i++) {
            var rules;
            try { rules = d.styleSheets[i].cssRules; } catch (e) { continue; }
            if (!rules) { continue; }
            for (var j = 0; j < rules.length; j++) {
                var r = rules[j];
                if (r.type === 5 && /ATP Vazirmatn/.test(r.cssText)) { fontFaceCss = r.cssText; return fontFaceCss; }
            }
        }
        return fontFaceCss;
    }

    function editorCss() {
        var useFont = S.font !== 'system' && (isFa || S.fontEveryone);
        return (useFont ? findFontFace() + 'body{font-family:' + FONT_STACK + '}' : '') +
            (isFa && S.editorRtl ? 'body{direction:rtl}' : '') +
            (S.smartBidi || isFa ? 'p,li,h1,h2,h3,h4,h5,h6,td,th,blockquote,dd,dt,div{unicode-bidi:plaintext;text-align:start}' : '') +
            'pre,code,kbd,samp{direction:ltr;text-align:left;font-family:monospace}';
    }

    function decorateFrame(f) {
        var doc;
        try { doc = f.contentDocument; } catch (e) { return; }           /* cross-origin: leave it */
        if (!doc || !doc.head || !doc.body || doc.getElementById('atp-editor')) { return; }
        var st = doc.createElement('style');
        st.id = 'atp-editor';
        st.textContent = editorCss();
        doc.head.appendChild(st);
    }

    var FRAMES = 'iframe.tox-edit-area__iframe, iframe[id$="_ifr"], .rte-container iframe';
    var scanQueued = false;
    function scanFrames() {
        scanQueued = false;
        var list = d.querySelectorAll(FRAMES);
        for (var i = 0; i < list.length; i++) {
            var f = list[i];
            decorateFrame(f);                                               /* idempotent */
            if (!f.getAttribute('data-atp')) {
                f.setAttribute('data-atp', '1.2.0');
                f.addEventListener('load', function () { decorateFrame(this); });   /* editors may rewrite the frame */
            }
        }
    }
    function queueScan() {
        if (scanQueued) { return; }
        scanQueued = true;
        (w.requestAnimationFrame || w.setTimeout)(scanFrames, 120);
    }

    function watchFrames() {
        if (!w.MutationObserver || !d.body) { return; }
        new MutationObserver(function (muts) {
            for (var i = 0; i < muts.length; i++) {
                if (muts[i].addedNodes.length) { queueScan(); return; }
            }
        }).observe(d.body, { childList: true, subtree: true });
        queueScan();
    }

    /* ---------- texts that third-party libraries hard-code in English (react-select, AUI's responsive header, …) ---------- */
    var BUILTIN = {
        'Select...': 'انتخاب کنید…',
        'Select…': 'انتخاب کنید…',
        'No options': 'گزینه‌ای وجود ندارد',
        'Loading...': 'در حال بارگذاری…',
        'Add': 'افزودن',
        'Delete': 'حذف',
        'Update': 'به‌روزرسانی',
        'Cancel': 'لغو',
        'Boards': 'بوردها',
        'View all boards': 'مشاهده‌ی همه‌ی بوردها',
        'More': 'بیشتر',
        'Plans': 'برنامه‌ها',
        'View all plans': 'مشاهده‌ی همه‌ی برنامه‌ها',
        'Customer Portal': 'پورتال مشتریان',
        'System Dashboard': 'داشبورد سیستم',
        'About Jira': 'درباره‌ی Jira',
        'Report a problem': 'گزارش مشکل',
        'Project Management Software': 'نرم‌افزار مدیریت پروژه',
        /* Jira Service Management's own fields and SLAs: Jira stores their names in English when the app is installed */
        'Request participants': 'شرکت‌کنندگان درخواست',
        'Organizations': 'سازمان‌ها',
        'Customer Request Type': 'نوع درخواست مشتری',
        'Approvers': 'تأییدکنندگان',
        'Satisfaction': 'رضایت',
        'Time to first response': 'زمان تا اولین پاسخ',
        'Time to resolution': 'زمان تا حل',
        'Time to close after resolution': 'زمان تا بستن پس از حل',
        'Time to approve normal change': 'زمان تا تأیید تغییر عادی',
        "Can't log in?": 'نمی‌توانید وارد شوید؟',
        "Welcome to the help center - we're here to help! Raise a request from the options provided.": 'به مرکز راهنما خوش آمدید؛ ما اینجا هستیم تا کمکتان کنیم! درخواست خود را از میان گزینه‌های زیر ثبت کنید.'
    };
    /* ---------- AUI's own words (Add, Delete, Update…): AUI fills AJS.I18n.keys with English, so Persian users get ours ---------- */
    var AUI_FA = {"aui.landmarks.site": "سایت", "aui.landmarks.sidebar": "نوار کناری", "aui.landmarks.page": "صفحه", "aui.landmarks.main": "اصلی", "aui.header.home.link": "رفتن به صفحه‌ی اصلی", "aui.dropdown.async.error": "خطا در بارگذاری منوی کشویی", "aui.dropdown.async.loading": "در حال بارگذاری منوی کشویی", "aui.words.expand": "باز کردن", "aui.words.collapse": "جمع کردن", "aui.words.add": "افزودن", "aui.words.update": "به‌روزرسانی", "aui.words.delete": "حذف", "aui.words.remove": "برداشتن", "aui.words.cancel": "لغو", "aui.words.loading": "در حال بارگذاری", "aui.words.close": "بستن", "aui.enter.value": "وارد کردن مقدار", "aui.words.more": "بیشتر", "aui.words.moreitem": "بیشتر…", "aui.keyboard.shortcut.type.x": "تایپ «{0}»", "aui.keyboard.shortcut.then.x": "سپس «{0}»", "aui.keyboard.shortcut.or.x": "یا «{0}»", "aui.sidebar.expand.tooltip": "باز کردن نوار کناری ( [ )", "aui.sidebar.collapse.tooltip": "جمع کردن نوار کناری ( [ )", "aui.validation.message.maxlength": "باید حداکثر {0} کاراکتر باشد", "aui.validation.message.minlength": "باید حداقل {0} کاراکتر باشد", "aui.validation.message.exactlength": "باید دقیقاً {0} کاراکتر باشد", "aui.validation.message.matchingfield": "{0} و {1} مطابقت ندارند.", "aui.validation.message.matchingfield-novalue": "این فیلدها مطابقت ندارند.", "aui.validation.message.doesnotcontain": "عبارت {0} را در این فیلد وارد نکنید", "aui.validation.message.pattern": "این فیلد با قالب موردنیاز مطابقت ندارد", "aui.validation.message.required": "این فیلد الزامی است", "aui.validation.message.validnumber": "لطفاً یک عدد معتبر وارد کنید", "aui.validation.message.min": "مقداری بزرگ‌تر یا مساوی {0} وارد کنید", "aui.validation.message.max": "مقداری کوچک‌تر یا مساوی {0} وارد کنید", "aui.validation.message.dateformat": "تاریخ معتبر وارد کنید", "aui.validation.message.minchecked": "حداقل {0,choice,0#۰ چک‌باکس|1#۱ چک‌باکس|1<{0,number} چک‌باکس} را علامت بزنید.", "aui.validation.message.maxchecked": "حداکثر {0,choice,0#۰ چک‌باکس|1#۱ چک‌باکس|1<{0,number} چک‌باکس} را علامت بزنید.", "aui.checkboxmultiselect.clear.selected": "پاک کردن موارد انتخاب‌شده", "aui.select.no.suggestions": "بدون پیشنهاد", "aui.select.number.suggestions": "{0,choice,0#۰ گزینه|1#۱ گزینه|1<{0,number} گزینه} پیدا شد.", "aui.select.new.suggestions": "پیشنهادهای جدید اضافه شد. برای انتخاب از کلیدهای جهت بالا و پایین استفاده کنید.", "aui.select.new.value": "مقدار جدید", "aui.toggle.on": "روشن", "aui.toggle.off": "خاموش", "aui.messagecomponent.error.label": "خطا", "aui.messagecomponent.warning.label": "هشدار", "aui.messagecomponent.info.label": "اطلاعات", "aui.messagecomponent.confirmation.label": "تأیید", "aui.messagecomponent.change.label": "تغییر", "aui.flag.default-aria-label.info": "پیام اطلاعاتی جدید", "aui.flag.default-aria-label.success": "پیام تأیید جدید", "aui.flag.default-aria-label.warning": "پیام هشدار جدید", "aui.flag.default-aria-label.error": "پیام خطای جدید"};
    function patchAui() {
        try {
            var keys = w.AJS && w.AJS.I18n && w.AJS.I18n.keys;
            if (!keys) { return false; }
            for (var k in AUI_FA) { if (AUI_FA.hasOwnProperty(k)) { keys[k] = AUI_FA[k]; } }
            return true;
        } catch (e) { return false; }
    }

    /* portal texts that Jira saved in English when the project was created (they carry the project's name) */
    var PATTERNS = [
        [/^Welcome! You can raise an? (.{1,120}) request from the options provided\.$/, 'خوش آمدید! درخواست خود را برای $1 از میان گزینه‌های زیر ثبت کنید.']
    ];

    /* ---------- administrator's own wording for texts compiled into scripts (server-side texts are already replaced) ---------- */
    var ATTRS = ['placeholder', 'title', 'aria-label', 'data-tooltip', 'original-title'];
    var SKIP = { SCRIPT: 1, STYLE: 1, TEXTAREA: 1, CODE: 1, PRE: 1, NOSCRIPT: 1 };
    var textQueue = [], textQueued = false;

    function swapText(node) {
        var v = node.nodeValue, t, r;
        if (!v || v.length > 300) { return; }
        t = v.trim();
        if (!t) { return; }
        if (TEXT.hasOwnProperty(t)) { r = TEXT[t]; }
        else if (t.charAt(t.length - 1) === ':' && TEXT.hasOwnProperty(t.slice(0, -1))) { r = TEXT[t.slice(0, -1)] + ':'; }   /* field labels */
        else {
            if (t.charCodeAt(0) > 127 || !/^Welcome/.test(t)) { return; }
            for (var i = 0; i < PATTERNS.length && r === undefined; i++) {
                if (PATTERNS[i][0].test(t)) { r = t.replace(PATTERNS[i][0], PATTERNS[i][1]); }
            }
            if (r === undefined) { return; }
        }
        node.nodeValue = v.replace(t, function () { return r; });
    }
    function swapAttrs(el) {
        for (var i = 0; i < ATTRS.length; i++) {
            var a = el.getAttribute(ATTRS[i]);
            if (a && TEXT.hasOwnProperty(a.trim())) { el.setAttribute(ATTRS[i], TEXT[a.trim()]); }
        }
        if (el.tagName === 'INPUT' && /^(button|submit|reset)$/i.test(el.type) && el.value && TEXT.hasOwnProperty(el.value.trim())) {
            el.value = TEXT[el.value.trim()];
        }
    }
    function swapTree(rootNode) {
        if (!rootNode) { return; }
        if (rootNode.nodeType === 3) { if (rootNode.parentNode && !SKIP[rootNode.parentNode.nodeName] && !rootNode.parentNode.isContentEditable) { swapText(rootNode); } return; }
        if (rootNode.nodeType !== 1 || SKIP[rootNode.nodeName] || rootNode.isContentEditable) { return; }
        swapAttrs(rootNode);
        var tw = d.createTreeWalker(rootNode, 5 /* elements + text */, {
            acceptNode: function (n) {
                if (n.nodeType === 1) { return (SKIP[n.nodeName] || n.isContentEditable) ? 2 /* reject subtree */ : 1; }
                return 1;
            }
        }), n;
        while ((n = tw.nextNode())) { if (n.nodeType === 3) { swapText(n); } else { swapAttrs(n); } }
    }
    function flushText() {
        textQueued = false;
        var q = textQueue; textQueue = [];
        for (var i = 0; i < q.length; i++) { swapTree(q[i]); }
    }
    function queueText(n) {
        textQueue.push(n);
        if (!textQueued) { textQueued = true; (w.requestAnimationFrame || w.setTimeout)(flushText, 16); }
    }
    function watchText() {
        if (!isFa || !d.body) { return; }
        var merged = {}, k0;
        for (k0 in BUILTIN) { if (BUILTIN.hasOwnProperty(k0)) { merged[k0] = BUILTIN[k0]; } }
        if (TEXT) { for (k0 in TEXT) { if (TEXT.hasOwnProperty(k0)) { merged[k0] = TEXT[k0]; } } }
        TEXT = merged;
        var any = false, k, clean = {};
        for (k in TEXT) {                                  /* drop chains/loops (A→B, B→A): they would flip forever */
            if (TEXT.hasOwnProperty(k) && typeof TEXT[k] === 'string' && !TEXT.hasOwnProperty(TEXT[k])) { clean[k] = TEXT[k]; any = true; }
        }
        TEXT = clean;
        if (!any) { return; }
        swapTree(d.body);
        if (!w.MutationObserver) { return; }
        new MutationObserver(function (muts) {
            for (var i = 0; i < muts.length; i++) {
                var m = muts[i];
                if (m.type === 'characterData') { queueText(m.target); }
                else if (m.type === 'attributes') { if (m.target.nodeType === 1) { swapAttrs(m.target); } }
                else { for (var j = 0; j < m.addedNodes.length; j++) { queueText(m.addedNodes[j]); } }
            }
        }).observe(d.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS });
    }

    /* ---------- AUI responsive header in right-to-left ----------
       AUI measures free space as  secondaryNav.offset().left − (logo.offset().left + logo width).
       In RTL the logo sits on the right and the secondary nav on the left, so the result goes negative and every
       menu item is folded into "More". Reading those two offsets as if the header were mirrored fixes the sum. */
    var headerPatched = false;
    function patchHeader() {
        var $ = w.jQuery;
        if (headerPatched || !$ || !$.fn || !$.fn.offset) { return; }
        headerPatched = true;
        var orig = $.fn.offset;
        $.fn.offset = function () {
            var r = orig.apply(this, arguments);
            if (arguments.length || !r || !this[0] || root.getAttribute('dir') !== 'rtl') { return r; }
            var el = this[0];
            if (!el.closest || !(el.id === 'logo' || (el.matches && el.matches('.aui-header-secondary .aui-nav')))) { return r; }
            var h = el.closest('.aui-header[data-aui-responsive], aui-header[data-aui-responsive]');
            if (!h) { return r; }
            var hr = h.getBoundingClientRect(), er = el.getBoundingClientRect();
            return { top: r.top, left: hr.left + hr.right - er.right + (w.pageXOffset || 0) };
        };
        var nudge = function () { try { w.dispatchEvent(new Event('resize')); } catch (e) { /* very old browsers */ } };
        nudge();
        setTimeout(nudge, 600);
        if (d.fonts && d.fonts.ready) { d.fonts.ready.then(nudge); }
    }

    /* ---------- the tab title carries the same hard-coded names ---------- */
    function swapTitle() {
        if (!isFa || !TEXT) { return; }
        var t = d.title || '', cut = t.indexOf(' - '), head = cut > 0 ? t.slice(0, cut) : t;
        if (TEXT.hasOwnProperty(head)) { d.title = TEXT[head] + (cut > 0 ? t.slice(cut) : ''); }
    }

    /* ---------- a gadget frame grows when the Persian font arrives: let the dashboard re-measure it ---------- */
    function fitGadget() {
        if (!FRAMED) { return; }
        var fit = function () {
            try { if (w.gadgets && w.gadgets.window && typeof w.gadgets.window.adjustHeight === 'function') { w.gadgets.window.adjustHeight(); } } catch (e) { /* not a gadget */ }
        };
        if (d.fonts && d.fonts.ready) { d.fonts.ready.then(fit); }
        setTimeout(fit, 400);
        setTimeout(fit, 1500);
    }

    /* ---------- classes that switch the CSS layers on ---------- */
    function apply() {
        isFa = userLocale().indexOf('fa') === 0;
        root.classList.toggle('atp-theme', S.theme === 'arass');
        root.classList.toggle('atp-frame', FRAMED);
        if (d.body) {
            d.body.classList.toggle('atp-login', /\/(login\.jsp|secure\/admin\/WebSudoAuthenticate|secure\/ForgotLoginDetails)/.test(w.location.pathname));
        }
        root.classList.toggle('atp-fa', isFa);
        if (isFa) { patchAui(); }
        root.classList.toggle('atp-font', S.font !== 'system' && (isFa || S.fontEveryone));
        root.classList.toggle('atp-bidi', !!S.smartBidi || isFa);
        var rtl = isFa && (isPortal ? S.rtlPortal : S.rtlAgent);
        if (rtl) {
            root.classList.add('atp-rtl');
            root.setAttribute('dir', 'rtl');
            if (w.ATP.mirror) { w.ATP.mirror.start(); }
        }
    }

    apply();
    if (d.readyState === 'loading') {
        d.addEventListener('DOMContentLoaded', function () { apply(); watchFrames(); watchText(); swapTitle(); fitGadget(); if (isFa) { patchHeader(); } });
    } else {
        apply();
        watchFrames();
        watchText();
        swapTitle();
        fitGadget();
        if (isFa) { patchHeader(); }
    }
    w.addEventListener('load', function () { if (isFa) { patchHeader(); } });
})(window, document);
