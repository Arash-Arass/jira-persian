/*! Arass Tech Persian · settings page v1.2.0 · (c) Arass Tech */
(function (w, d) {
    'use strict';
    if (w.ATP_ADMIN_LOADED) { return; }
    w.ATP_ADMIN_LOADED = true;
    function boot() {
    var root = d.getElementById('atp-admin');
    if (!root || root.getAttribute('data-ready')) { return; }
    root.setAttribute('data-ready', '1');
    var CTX = root.getAttribute('data-ctx') || '';
    var VERSION = root.getAttribute('data-version') || '';
    var API = CTX + '/plugins/servlet/atp/api/';
    var DICT = {"status":{"Open":"باز","In Progress":"در حال انجام","Reopened":"بازگشایی‌شده","Resolved":"حل‌شده","Closed":"بسته‌شده","Done":"انجام‌شده","To Do":"برای انجام","Declined":"ردشده","Waiting for customer":"در انتظار مشتری","Waiting for support":"در انتظار پشتیبانی","Pending":"معلق","Canceled":"لغوشده","Cancelled":"لغوشده","Escalated":"ارجاع‌شده","Waiting for approval":"در انتظار تأیید","Work in progress":"در حال انجام کار","Backlog":"بک‌لاگ","Selected for Development":"انتخاب‌شده برای توسعه","In Review":"در حال بازبینی","Under review":"در دست بازبینی","Review":"بازبینی","Planning":"برنامه‌ریزی","Awaiting implementation":"در انتظار اجرا","Implementing":"در حال اجرا","Awaiting CAB approval":"در انتظار تأیید CAB","Peer review / change manager approval":"بازبینی همتا / تأیید مدیر تغییر","Completed":"تکمیل‌شده","Failed":"ناموفق","Investigating":"در حال بررسی","Under investigation":"در دست بررسی","Approved":"تأییدشده","Rejected":"ردشده","Blocked":"مسدود","On Hold":"در حالت تعلیق","New":"جدید","Assigned":"واگذارشده","Testing":"در حال آزمون","Waiting":"در انتظار","Triage":"اولویت‌بندی اولیه","Withdrawn":"منصرف‌شده","Waiting for triage":"در انتظار اولویت‌بندی"},"priority":{"Highest":"بسیار بالا","High":"بالا","Medium":"متوسط","Low":"پایین","Lowest":"بسیار پایین","Blocker":"مسدودکننده","Critical":"بحرانی","Major":"عمده","Minor":"جزئی","Trivial":"ناچیز","Urgent":"فوری","Normal":"عادی"},"resolution":{"Done":"انجام‌شده","Won't Do":"انجام نمی‌شود","Duplicate":"تکراری","Cannot Reproduce":"قابل بازتولید نیست","Fixed":"رفع‌شده","Won't Fix":"رفع نمی‌شود","Incomplete":"ناقص","Declined":"ردشده","Known Error":"خطای شناخته‌شده","Hardware failure":"خرابی سخت‌افزار","Software failure":"خرابی نرم‌افزار","Resolved":"حل‌شده","Answered":"پاسخ داده شد","Satisfied":"رضایت‌بخش","Withdrawn":"منصرف‌شده","Completed":"تکمیل‌شده","Work around":"راه‌حل موقت","Workaround":"راه‌حل موقت"},"issuetype":{"Task":"وظیفه","Sub-task":"زیرمسئله","Subtask":"زیرمسئله","Bug":"باگ","Story":"استوری","Epic":"اپیک","Improvement":"بهبود","New Feature":"قابلیت جدید","Service Request":"درخواست خدمت","Service Request with Approvals":"درخواست خدمت با تأیید","Incident":"رخداد","Problem":"مشکل","Change":"تغییر","Post-incident review":"بازبینی پس از رخداد","IT Help":"کمک فناوری اطلاعات","Purchase":"خرید","Support":"پشتیبانی","Question":"پرسش","Emailed request":"درخواست ایمیلی","General request":"درخواست عمومی","Access":"دسترسی","Onboarding":"ورود کارمند جدید","Offboarding":"خروج کارمند"}};
    var TYPES = [
        { id: 'status', title: 'وضعیت‌ها' },
        { id: 'priority', title: 'اولویت‌ها' },
        { id: 'resolution', title: 'نتیجه‌ها' },
        { id: 'issuetype', title: 'انواع مسئله' }
    ];

    /* ---------------- helpers ---------------- */
    function el(tag, attrs, kids) {
        var n = d.createElement(tag), k;
        attrs = attrs || {};
        for (k in attrs) {
            if (!attrs.hasOwnProperty(k)) { continue; }
            if (k === 'text') { n.textContent = attrs[k]; } else if (k === 'html') { n.innerHTML = attrs[k]; } else if (k.indexOf('on') === 0) { n.addEventListener(k.slice(2), attrs[k]); } else if (attrs[k] !== null && attrs[k] !== undefined && attrs[k] !== false) { n.setAttribute(k, attrs[k] === true ? '' : attrs[k]); }
        }
        (kids || []).forEach(function (c) { if (c) { n.appendChild(typeof c === 'string' ? d.createTextNode(c) : c); } });
        return n;
    }
    function api(method, path, body) {
        var opts = { method: method, credentials: 'same-origin', headers: { 'Accept': 'application/json', 'X-ATP-Request': '1', 'X-Atlassian-Token': 'no-check' } };
        if (body !== undefined) { opts.headers['Content-Type'] = 'application/json'; opts.body = JSON.stringify(body); }
        return fetch(API + path, opts).then(function (r) {
            return r.text().then(function (t) {
                var j = null;
                try { j = t ? JSON.parse(t) : null; } catch (e) { j = null; }
                if (!r.ok) {
                    var err = new Error((j && j.error) || ('HTTP ' + r.status));
                    err.status = r.status; err.body = j;
                    throw err;
                }
                return j;
            });
        });
    }
    var msgBox;
    function say(kind, text) {
        msgBox.className = 'atp-msg is-' + kind;
        msgBox.textContent = text;
        if (kind === 'ok') { setTimeout(function () { if (msgBox.textContent === text) { msgBox.className = 'atp-msg'; } }, 5000); }
        msgBox.scrollIntoView({ block: 'nearest' });
    }
    function failed(e) {
        if (e && e.status === 401 && e.body && e.body.websudo) {
            say('info', 'برای ذخیره، جیرا تأیید دوباره‌ی رمز مدیر را می‌خواهد. در حال انتقال به صفحه‌ی تأیید…');
            setTimeout(function () {
                w.location.href = CTX + '/secure/admin/WebSudoAuthenticate!default.jspa?webSudoDestination=' + encodeURIComponent('/plugins/servlet/atp/admin');
            }, 1200);
            return;
        }
        say('err', 'ذخیره انجام نشد: ' + (e && e.message ? e.message : 'خطای ناشناخته'));
    }
    function sw(checked, onchange) {
        var input = el('input', { type: 'checkbox' });
        input.checked = !!checked;
        input.addEventListener('change', onchange);
        return { node: el('label', { 'class': 'atp-switch' }, [input, el('span')]), input: input };
    }

    /* ---------------- layout ---------------- */
    var hero = el('div', { 'class': 'atp-hero' }, [
        el('img', { src: CTX + '/download/resources/ir.arasstech.persian.jsm/images/plugin-logo.png', alt: '' }),
        el('div', {}, [
            el('h1', { text: 'Arass Tech Persian' }),
            el('p', { text: 'فارسی‌ساز حرفه‌ای Jira Service Management' }),
            el('div', { 'class': 'atp-bar' })
        ]),
        el('div', { 'class': 'atp-ver', text: 'v' + VERSION })
    ]);
    msgBox = el('div', { 'class': 'atp-msg', role: 'status' });
    var tabs = el('div', { 'class': 'atp-tabs', role: 'tablist' });
    var panes = {};
    root.appendChild(hero);
    root.appendChild(msgBox);
    root.appendChild(tabs);
    function addTab(id, title, build) {
        var b = el('button', { 'class': 'atp-tab', role: 'tab', type: 'button', 'aria-selected': 'false', text: title });
        var pane = el('div', { 'class': 'atp-hidden', role: 'tabpanel' });
        var built = false;
        b.addEventListener('click', function () {
            Object.keys(panes).forEach(function (k) { panes[k].pane.classList.add('atp-hidden'); panes[k].btn.setAttribute('aria-selected', 'false'); });
            pane.classList.remove('atp-hidden');
            b.setAttribute('aria-selected', 'true');
            if (!built) { built = true; build(pane); }
            try { w.history.replaceState(null, '', '#' + id); } catch (e) { /* ignore */ }
        });
        panes[id] = { btn: b, pane: pane };
        tabs.appendChild(b);
        root.appendChild(pane);
    }

    /* ---------------- tab 1: general ---------------- */
    var SETTINGS_UI = [
        { group: 'پوسته', items: [
            { key: 'theme', type: 'select', label: 'ظاهر جیرا', help: 'پوسته‌ی روشن و یکدست آراس برای همه‌ی صفحه‌ها، پورتال مشتری و صفحه‌ی ورود. کاربرانی که حالت تیره‌ی جیرا را انتخاب کرده‌اند دست نمی‌خورند.', options: [['arass', 'Arass Light (پیشنهادی)'], ['jira', 'ظاهر پیش‌فرض جیرا']] }
        ] },
        { group: 'ظاهر و جهت', items: [
            { key: 'rtlAgent', label: 'چیدمان راست‌به‌چپ برای کارشناسان و مدیران', help: 'برای کاربرانی که زبان پروفایلشان فارسی است.' },
            { key: 'rtlPortal', label: 'چیدمان راست‌به‌چپ در پورتال مشتریان', help: 'مرکز راهنما، فرم‌های ثبت درخواست و صفحه‌ی درخواست‌ها.' },
            { key: 'editorRtl', label: 'ویرایشگر متن راست‌به‌چپ', help: 'ویرایشگر توضیحات و نظرها برای کاربران فارسی از راست شروع می‌شود.' },
            { key: 'smartBidi', label: 'جهت هوشمند متن‌های کاربران', help: 'هر پاراگراف بر اساس اولین حرفش راست‌چین یا چپ‌چین می‌شود؛ برای همه‌ی کاربران.' }
        ] },
        { group: 'فونت', items: [
            { key: 'font', type: 'select', label: 'فونت فارسی', help: 'وزیرمتن داخل افزونه است و به اینترنت نیاز ندارد.', options: [['vazirmatn', 'وزیرمتن (پیشنهادی)'], ['system', 'فونت پیش‌فرض سیستم']] },
            { key: 'fontEveryone', label: 'فونت فارسی برای همه‌ی کاربران', help: 'حتی کاربرانی که جیرا را انگلیسی می‌بینند، متن‌های فارسی را با وزیرمتن می‌بینند.' }
        ] },
        { group: 'تاریخ', items: [
            { key: 'jalali', label: 'نمایش تاریخ شمسی', help: 'برای کاربران فارسی؛ با نگه‌داشتن ماوس روی تاریخ، معادل میلادی دیده می‌شود.' },
            { key: 'jalaliPicker', label: 'تقویم انتخاب تاریخ شمسی', help: 'تاریخ با فرمتی ذخیره می‌شود که سرور جیرا می‌پذیرد؛ داده‌ها میلادی می‌مانند.' },
            { key: 'dateDigits', type: 'select', label: 'ارقام تاریخ', options: [['fa', 'فارسی (۱۴۰۵)'], ['latin', 'لاتین (1405)']] }
        ] }
    ];

    function buildGeneral(pane) {
        pane.appendChild(el('div', { 'class': 'atp-loading', text: 'در حال بارگذاری تنظیمات…' }));
        api('GET', 'settings').then(function (s) {
            pane.innerHTML = '';
            var current = s || {};
            var grid = el('div', { 'class': 'atp-grid2' });
            var cols = [el('div', { 'class': 'atp-col' }), el('div', { 'class': 'atp-col' })];   /* two independent columns: no ragged row heights */
            cols.forEach(function (c) { grid.appendChild(c); });
            SETTINGS_UI.forEach(function (g, gi) {
                var card = el('div', { 'class': 'atp-card' }, [el('h2', { text: g.group })]);
                g.items.forEach(function (it) {
                    var control;
                    if (it.type === 'select') {
                        control = el('select', { 'aria-label': it.label });
                        it.options.forEach(function (o) {
                            var op = el('option', { value: o[0], text: o[1] });
                            if (current[it.key] === o[0]) { op.selected = true; }
                            control.appendChild(op);
                        });
                        control.addEventListener('change', function () { current[it.key] = control.value; });
                    } else {
                        var s2 = sw(current[it.key] !== false, function () { current[it.key] = s2.input.checked; });
                        s2.input.setAttribute('aria-label', it.label);
                        control = s2.node;
                    }
                    card.appendChild(el('div', { 'class': 'atp-row' }, [
                        el('div', {}, [el('span', { 'class': 'atp-label', text: it.label }), it.help ? el('span', { 'class': 'atp-help', text: it.help }) : null]),
                        control
                    ]));
                });
                cols[gi < 2 ? 0 : 1].appendChild(card);
            });
            pane.appendChild(grid);
            var save = el('button', { 'class': 'atp-btn is-primary', type: 'button', text: 'ذخیره‌ی تنظیمات' });
            save.addEventListener('click', function () {
                save.disabled = true;
                api('PUT', 'settings', current).then(function () {
                    try { w.localStorage.removeItem('atp-settings'); } catch (e) { /* ignore */ }
                    say('ok', 'تنظیمات ذخیره شد. صفحه‌های جیرا از بارگذاری بعدی با این تنظیمات نمایش داده می‌شوند.');
                }).catch(failed).then(function () { save.disabled = false; });
            });
            pane.appendChild(el('div', { 'class': 'atp-actions' }, [save, el('span', { 'class': 'atp-muted', text: 'تنظیمات برای همه‌ی کاربران اعمال می‌شود.' })]));
        }).catch(function (e) { pane.innerHTML = ''; failed(e); });
    }

    /* ---------------- tab 2: translations ---------------- */
    function loadCatalog() {
        if (w.ATP_CATALOG) { return Promise.resolve(w.ATP_CATALOG); }
        return new Promise(function (resolve, reject) {
            var s = d.createElement('script');
            s.src = CTX + '/download/resources/ir.arasstech.persian.jsm:atp-catalog/atp-catalog.js?v=' + encodeURIComponent(VERSION);
            s.onload = function () { resolve(w.ATP_CATALOG || []); };
            s.onerror = function () { reject(new Error('فهرست ترجمه‌ها بارگذاری نشد')); };
            d.head.appendChild(s);
        });
    }
    /* MessageFormat argument heads such as {0} or {1,number}: an override must keep exactly the same ones */
    function heads(s) {
        var re = /\{\s*(\d+)\s*(?:,\s*([a-zA-Z]+))?/g, m, out = [];
        while ((m = re.exec(String(s || '')))) { out.push(m[1] + ':' + (m[2] || '').toLowerCase()); }
        return out.sort().join('|');
    }
    /* where the source text goes through MessageFormat (it uses '' for an apostrophe), a lone ' would swallow the text after it */
    function fixQuotes(en, v) {
        if (String(en).indexOf("''") < 0 && !/\{\s*\d/.test(en)) { return v; }
        return v.replace(/''/g, '\u0000').replace(/'(?=\{|\})/g, '\u0001').replace(/'/g, "''").replace(/\u0000/g, "''").replace(/\u0001/g, "'");
    }
    function norm(s) { return String(s || '').toLowerCase().replace(/[‌‏‎]/g, '').replace(/ي/g, 'ی').replace(/ك/g, 'ک'); }

    function buildTranslations(pane) {
        pane.appendChild(el('div', { 'class': 'atp-loading', text: 'در حال بارگذاری فهرست ترجمه‌ها…' }));
        Promise.all([loadCatalog(), api('GET', 'overrides')]).then(function (res) {
            var cat = res[0], overrides = res[1] || {}, edits = {};
            pane.innerHTML = '';
            var card = el('div', { 'class': 'atp-card' }, [
                el('h2', { text: 'ویرایش ترجمه‌ها' }),
                el('p', { 'class': 'atp-sub', text: 'هر متنی را با کلید، متن انگلیسی یا ترجمه‌ی فارسی جستجو کنید و ترجمه‌ی دلخواه خود را بنویسید. ترجمه‌های شما جایگزین ترجمه‌ی پیش‌فرض می‌شوند و با به‌روزرسانی افزونه از بین نمی‌روند.' })
            ]);
            var q = el('input', { type: 'search', placeholder: 'جستجو… (مثلاً: Create request یا ایجاد درخواست)', 'aria-label': 'جستجو' });
            var group = el('select', { 'aria-label': 'بخش' }, [
                el('option', { value: '', text: 'همه‌ی بخش‌ها' }), el('option', { value: 'jsm', text: 'سرویس‌دسک' }),
                el('option', { value: 'assets', text: 'دارایی‌ها' }), el('option', { value: 'jira', text: 'هسته‌ی Jira' }),
                el('option', { value: 'custom', text: 'کلیدهای افزوده' }), el('option', { value: '*', text: 'فقط ویرایش‌شده‌ها' })
            ]);
            var count = el('span', { 'class': 'atp-muted' });
            card.appendChild(el('div', { 'class': 'atp-toolbar' }, [q, group]));
            var table = el('table', {}, [el('thead', {}, [el('tr', {}, [
                el('th', { style: 'width:22%', text: 'کلید' }), el('th', { style: 'width:26%', text: 'انگلیسی' }),
                el('th', { style: 'width:22%', text: 'ترجمه‌ی پیش‌فرض' }), el('th', { text: 'ترجمه‌ی شما' })
            ])])]);
            var tbody = el('tbody');
            table.appendChild(tbody);
            card.appendChild(table);
            card.appendChild(el('div', { 'class': 'atp-actions' }, [count]));
            var save = el('button', { 'class': 'atp-btn is-primary', type: 'button', text: 'ذخیره‌ی ترجمه‌ها' });
            var exp = el('button', { 'class': 'atp-btn', type: 'button', text: 'خروجی گرفتن (JSON)' });
            var imp = el('button', { 'class': 'atp-btn', type: 'button', text: 'ورود از فایل' });
            var file = el('input', { type: 'file', accept: 'application/json,.json', 'class': 'atp-hidden' });
            card.appendChild(el('div', { 'class': 'atp-actions' }, [save, exp, imp, file,
                el('span', { 'class': 'atp-muted', text: 'تغییرات از بارگذاری بعدی هر صفحه برای همه‌ی کاربران فارسی اعمال می‌شود.' })]));
            /* any other key — e.g. texts of other apps — can be given Persian wording too */
            var addKey = el('input', { type: 'text', placeholder: 'کلید متن (مثلاً com.example.button.save)', dir: 'ltr', 'aria-label': 'کلید متن' });
            var addVal = el('input', { type: 'text', placeholder: 'متن فارسی', dir: 'auto', 'aria-label': 'متن فارسی' });
            var addBtn = el('button', { 'class': 'atp-btn', type: 'button', text: 'افزودن' });
            card.appendChild(el('div', { 'class': 'atp-card atp-add' }, [
                el('h2', { text: 'افزودن متن با کلید' }),
                el('p', { 'class': 'atp-sub', text: 'برای متن‌هایی که در فهرست نیستند (مثلاً متن افزونه‌های دیگر)، کلید ترجمه‌ی آن را بنویسید. کلید هر متن را می‌توانید با افزودن \u2066?i18ntranslate=on\u2069 به آدرس صفحه در Jira ببینید.' }),
                el('div', { 'class': 'atp-toolbar' }, [addKey, addVal, addBtn])
            ]));
            pane.appendChild(card);

            var byKey = {};
            cat.forEach(function (r) { byKey[r[0]] = r; });
            function ensureRow(k) {
                if (byKey[k]) { return; }
                var r = [k, '', '', 'custom'];
                cat.push(r);
                byKey[k] = r;
            }
            Object.keys(overrides).forEach(ensureRow);
            addBtn.addEventListener('click', function () {
                var k = addKey.value.trim(), v = addVal.value.trim();
                if (!/^[A-Za-z0-9_.\-'\/:@$]{1,255}$/.test(k)) { say('err', 'کلید معتبر نیست: فقط حروف لاتین، عدد و . - _ مجاز است.'); return; }
                if (!v) { say('err', 'متن فارسی را بنویسید.'); return; }
                ensureRow(k);
                edits[k] = v;
                save.disabled = false;
                addKey.value = ''; addVal.value = '';
                group.value = '*'; q.value = ''; render();
                say('info', 'اضافه شد. برای اعمال، «ذخیره‌ی ترجمه‌ها» را بزنید.');
            });

            function render() {
                var term = norm(q.value.trim()), g = group.value, out = [], i, r;
                for (i = 0; i < cat.length && out.length < 60; i++) {
                    r = cat[i];
                    if (g === '*') { if (!overrides.hasOwnProperty(r[0]) && !edits.hasOwnProperty(r[0])) { continue; } } else if (g && r[3] !== g) { continue; }
                    if (term && norm(r[0]).indexOf(term) < 0 && norm(r[1]).indexOf(term) < 0 && norm(r[2]).indexOf(term) < 0 &&
                        norm(overrides[r[0]] || '').indexOf(term) < 0) { continue; }
                    out.push(r);
                }
                tbody.innerHTML = '';
                if (!term && !g) {
                    tbody.appendChild(el('tr', {}, [el('td', { colspan: '4', 'class': 'atp-muted', text: 'برای شروع، عبارتی را جستجو کنید. (' + cat.length.toLocaleString('fa-IR') + ' متن در فهرست)' })]));
                    count.textContent = Object.keys(overrides).length ? Object.keys(overrides).length.toLocaleString('fa-IR') + ' متن ویرایش‌شده' : '';
                    return;
                }
                out.forEach(function (row) {
                    var key = row[0];
                    var val = edits.hasOwnProperty(key) ? edits[key] : (overrides[key] || '');
                    var input = el('input', { type: 'text', value: val, placeholder: row[2], dir: 'auto' });
                    var tr = el('tr', { 'class': (overrides.hasOwnProperty(key) ? 'is-overridden' : '') + (edits.hasOwnProperty(key) ? ' is-changed' : '') }, [
                        el('td', {}, [el('div', { 'class': 'atp-key', text: key })]),
                        el('td', {}, [el('div', { 'class': 'atp-en', text: row[1] || '—' })]),
                        el('td', { text: row[2] }),
                        el('td', {}, [input])
                    ]);
                    input.addEventListener('input', function () {
                        edits[key] = input.value;
                        tr.classList.add('is-changed');
                        save.disabled = false;
                    });
                    tbody.appendChild(tr);
                });
                if (!out.length) { tbody.appendChild(el('tr', {}, [el('td', { colspan: '4', 'class': 'atp-muted', text: 'نتیجه‌ای پیدا نشد.' })])); }
                count.textContent = (out.length >= 60 ? '۶۰ نتیجه‌ی اول نمایش داده می‌شود؛ جستجو را دقیق‌تر کنید.' : '') +
                    (Object.keys(overrides).length ? '  ' + Object.keys(overrides).length.toLocaleString('fa-IR') + ' متن ویرایش‌شده' : '');
            }
            var t = 0;
            q.addEventListener('input', function () { clearTimeout(t); t = setTimeout(render, 160); });
            group.addEventListener('change', render);
            save.disabled = true;
            save.addEventListener('click', function () {
                var next = {}, k;
                for (k in overrides) { if (overrides.hasOwnProperty(k)) { next[k] = overrides[k]; } }
                var bad = [];
                for (k in edits) {
                    if (!edits.hasOwnProperty(k)) { continue; }
                    var v = edits[k].trim();
                    if (v && byKey[k] && (byKey[k][1] || byKey[k][2])) {
                        var src = byKey[k][1] || byKey[k][2];
                        v = fixQuotes(src, v);
                        if (heads(v) !== heads(src)) { bad.push(k); continue; }
                    }
                    if (!v || (byKey[k] && v === byKey[k][2])) { delete next[k]; } else { next[k] = v; }
                }
                if (bad.length) {
                    group.value = '*'; render();
                    Array.prototype.forEach.call(tbody.querySelectorAll('tr'), function (tr) {
                        var kd = tr.querySelector('.atp-key');
                        if (kd && bad.indexOf(kd.textContent) >= 0) { tr.classList.add('is-invalid'); }
                    });
                    say('err', 'ذخیره نشد: در ' + bad.length.toLocaleString('fa-IR') + ' متن، جای‌نگهدارهایی مثل {0} با متن انگلیسی یکی نیست. ردیف‌های قرمز را اصلاح کنید: ' + bad.slice(0, 5).join('، '));
                    return;
                }
                save.disabled = true;
                api('PUT', 'overrides', next).then(function (saved) {
                    overrides = saved || next; edits = {};
                    say('ok', 'ترجمه‌ها ذخیره شد. برای برگرداندن یک متن به ترجمه‌ی پیش‌فرض، کادر آن را خالی کنید و دوباره ذخیره کنید.');
                    render();
                }).catch(function (e) { save.disabled = false; failed(e); });
            });
            exp.addEventListener('click', function () {
                var blob = new Blob([JSON.stringify(overrides, null, 2)], { type: 'application/json' });
                var a = el('a', { href: URL.createObjectURL(blob), download: 'arasstech-persian-translations.json' });
                d.body.appendChild(a); a.click(); a.remove();
            });
            imp.addEventListener('click', function () { file.click(); });
            file.addEventListener('change', function () {
                var f = file.files && file.files[0];
                if (!f) { return; }
                var rd = new FileReader();
                rd.onload = function () {
                    try {
                        var data = JSON.parse(rd.result), n = 0, k;
                        for (k in data) { if (data.hasOwnProperty(k) && typeof data[k] === 'string') { ensureRow(k); edits[k] = data[k]; n++; } }
                        save.disabled = false;
                        group.value = '*'; render();
                        say('info', n.toLocaleString('fa-IR') + ' ترجمه از فایل خوانده شد. برای اعمال، «ذخیره‌ی ترجمه‌ها» را بزنید.');
                    } catch (e) { say('err', 'فایل JSON معتبر نیست.'); }
                };
                rd.readAsText(f);
                file.value = '';
            });
            render();
            q.focus();
        }).catch(function (e) { pane.innerHTML = ''; failed(e); });
    }

    /* ---------------- tab 3: statuses, priorities, resolutions, issue types ---------------- */
    function suggestion(type, name) {
        var m = DICT[type] || {}, k;
        if (m[name]) { return m[name]; }
        for (k in m) { if (m.hasOwnProperty(k) && k.toLowerCase() === String(name).toLowerCase()) { return m[k]; } }
        return '';
    }
    /* Jira keys a translation by the admin's own wording of the type ("jira.translation.وضعیت…"), so the only
       reliable way to save is Jira's own Translations screen. We read and submit that form exactly as Jira does. */
    function trForm(type) {
        return fetch(CTX + '/secure/admin/ViewTranslations!default.jspa?issueConstantType=' + encodeURIComponent(type) + '&selectedLocale=fa_IR',
            { credentials: 'same-origin' }).then(function (r) { return r.text(); }).then(function (h) {
            var doc = new DOMParser().parseFromString(h, 'text/html');
            var f = Array.prototype.filter.call(doc.querySelectorAll('form'), function (x) { return /ViewTranslations\.jspa$/.test(x.getAttribute('action') || ''); })[0];
            if (!f) { var e = new Error('websudo'); e.websudo = true; throw e; }
            var map = {};
            Array.prototype.forEach.call(f.elements, function (x) {
                var m = (x.name || '').match(/\.(\d+)\.(name|desc)$/);
                if (m) { (map[m[1]] = map[m[1]] || {})[m[2]] = x.value || ''; }
            });
            return { form: f, map: map };
        });
    }
    function trSave(type, items) {
        var byId = {};
        items.forEach(function (i) { byId[i.id] = i; });
        return trForm(type).then(function (x) {
            var body = new URLSearchParams(), meta = d.querySelector('meta[name="atlassian-token"]');
            Array.prototype.forEach.call(x.form.elements, function (e) {
                if (!e.name || e.disabled) { return; }
                if ((e.type === 'submit' || e.type === 'button') && e.name !== 'update') { return; }
                var v = e.value, m = e.name.match(/\.(\d+)\.(name|desc)$/), it = m && byId[m[1]];
                if (it) {
                    if (m[2] === 'name') { v = it.fa; }
                    else { v = it.fa ? (it.faDesc || e.value || it.enDesc || it.fa) : ''; }   /* Jira wants both or neither */
                }
                body.append(e.name, v);
            });
            if (!body.has('update')) { body.append('update', 'update'); }
            if (!body.has('atl_token') && meta) { body.append('atl_token', meta.getAttribute('content')); }
            return fetch(CTX + '/secure/admin/ViewTranslations.jspa', { method: 'POST', credentials: 'same-origin',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: body.toString() });
        }).then(function () { return trForm(type); }).then(function (x) {
            var ok = 0, bad = [];
            items.forEach(function (i) { if (((x.map[i.id] || {}).name || '') === i.fa) { ok++; } else { bad.push(i.id); } });
            return { ok: ok, bad: bad };
        });
    }

    function buildConstants(pane) {
        pane.appendChild(el('div', { 'class': 'atp-loading', text: 'در حال خواندن وضعیت‌ها، اولویت‌ها، نتیجه‌ها و انواع مسئله…' }));
        api('GET', 'constants').then(function (data) {
            return Promise.all(TYPES.map(function (t) {
                return trForm(t.id).then(function (x) {
                    ((data && data[t.id]) || []).forEach(function (c) {
                        var j = x.map[c.id];
                        if (j) { c.fa = j.name || ''; c.faDesc = j.name && j.desc !== c.description ? (j.desc || '') : ''; }
                    });
                }).catch(function () { /* keep what the plugin read */ });
            })).then(function () { return data; });
        }).then(function (data) {
            pane.innerHTML = '';
            var inputs = [];
            pane.appendChild(el('div', { 'class': 'atp-card' }, [
                el('h2', { text: 'نام فارسی وضعیت‌ها، اولویت‌ها، نتیجه‌ها و انواع مسئله' }),
                el('p', { 'class': 'atp-sub', text: 'این نام‌ها در دیتابیس جیرا به زبان انگلیسی ذخیره شده‌اند. اینجا ترجمه‌ی فارسی هرکدام را در سیستم ترجمه‌ی خود جیرا ثبت می‌کنید؛ نام اصلی و جستجوهای JQL تغییری نمی‌کنند. پیشنهادهای Arass Tech از قبل پر شده‌اند.' })
            ]));
            TYPES.forEach(function (t) {
                var rows = (data && data[t.id]) || [];
                var tbody = el('tbody');
                rows.forEach(function (c) {
                    var proposed = c.fa || c.suggested || suggestion(t.id, c.name);
                    var input = el('input', { type: 'text', value: proposed, placeholder: 'ترجمه‌ی فارسی', dir: 'auto' });
                    var desc = el('input', { type: 'text', value: c.faDesc || '', placeholder: 'توضیح فارسی (اختیاری)', dir: 'auto' });
                    inputs.push({ type: t.id, id: c.id, name: input, desc: desc, had: c.fa || '', enDesc: c.description || '' });
                    tbody.appendChild(el('tr', { 'class': c.fa ? 'is-overridden' : '' }, [
                        el('td', {}, [el('div', { 'class': 'atp-en', text: c.name }), c.description ? el('div', { 'class': 'atp-muted atp-en', text: c.description }) : null]),
                        el('td', {}, [input]),
                        el('td', {}, [desc]),
                        el('td', {}, [c.fa ? el('span', { 'class': 'atp-pill is-on', text: 'ثبت‌شده' }) : el('span', { 'class': 'atp-pill', text: proposed ? 'پیشنهاد' : 'بدون ترجمه' })])
                    ]));
                });
                pane.appendChild(el('div', { 'class': 'atp-card' }, [
                    el('h2', { text: t.title + ' (' + rows.length.toLocaleString('fa-IR') + ')' }),
                    el('table', {}, [el('thead', {}, [el('tr', {}, [
                        el('th', { style: 'width:28%', text: 'نام در Jira' }), el('th', { style: 'width:28%', text: 'نام فارسی' }),
                        el('th', { text: 'توضیح فارسی' }), el('th', { style: 'width:90px', text: 'وضعیت' })
                    ])]), tbody])
                ]));
            });
            var apply = el('button', { 'class': 'atp-btn is-primary', type: 'button', text: 'ثبت ترجمه‌ها در Jira' });
            apply.addEventListener('click', function () {
                var payload = inputs.filter(function (x) { return x.name.value.trim() || x.had; }).map(function (x) {
                    return { type: x.type, id: x.id, fa: x.name.value.trim(), faDesc: x.desc.value.trim(), enDesc: x.enDesc };
                });
                apply.disabled = true;
                say('info', 'در حال ثبت ترجمه‌ها در Jira…');
                Promise.all(TYPES.map(function (t) {
                    var items = payload.filter(function (x) { return x.type === t.id; });
                    return items.length ? trSave(t.id, items) : { ok: 0, bad: [] };
                })).then(function (res) {
                    var ok = 0, bad = 0;
                    res.forEach(function (r) { ok += r.ok; bad += r.bad.length; });
                    if (bad) { say('err', bad.toLocaleString('fa-IR') + ' ترجمه ثبت نشد (' + ok.toLocaleString('fa-IR') + ' مورد ثبت شد). صفحه را تازه کنید و دوباره امتحان کنید.'); }
                    else {
                        say('ok', ok.toLocaleString('fa-IR') + ' ترجمه در Jira ثبت شد. کاربران فارسی از بارگذاری بعدی، نام‌های فارسی را می‌بینند.');
                        pane.innerHTML = ''; buildConstants(pane);                  /* show exactly what Jira now holds */
                    }
                    inputs.forEach(function (x) { x.had = x.name.value.trim(); });
                }).catch(function (e) {
                    if (e && e.websudo) { say('err', 'نشست امن مدیر منقضی شده است. صفحه را تازه کنید، رمز مدیر را وارد کنید و دوباره ذخیره کنید.'); }
                    else { failed(e); }
                }).then(function () { apply.disabled = false; });
            });
            pane.appendChild(el('div', { 'class': 'atp-actions' }, [apply, el('span', { 'class': 'atp-muted', text: 'کادر خالی یعنی ترجمه‌ی ثبت‌شده‌ی قبلی حذف شود.' })]));
        }).catch(function (e) { pane.innerHTML = ''; failed(e); });
    }

    /* ---------------- tab 4: about ---------------- */
    function buildAbout(pane) {
        pane.appendChild(el('div', { 'class': 'atp-card' }, [
            el('h2', { text: 'درباره‌ی Arass Tech Persian' }),
            el('p', { 'class': 'atp-sub', text: 'فارسی‌ساز کامل Jira Service Management و هسته‌ی Jira برای نسخه‌ی Data Center.' }),
            el('div', { 'class': 'atp-row' }, [el('span', { 'class': 'atp-label', text: 'نسخه' }), el('span', { 'class': 'atp-value', dir: 'ltr', text: VERSION })]),
            el('div', { 'class': 'atp-row' }, [el('span', { 'class': 'atp-label', text: 'سازنده' }), el('span', { 'class': 'atp-value', dir: 'ltr', text: 'Arass Tech' })]),
            el('div', { 'class': 'atp-row' }, [el('span', { 'class': 'atp-label', text: 'مجوز' }), el('span', { 'class': 'atp-value', text: 'رایگان و متن‌باز، با مجوز \u2066MIT\u2069' })]),
            el('div', { 'class': 'atp-row' }, [el('span', { 'class': 'atp-label', text: 'وب‌سایت' }), el('a', { href: 'https://arasstech.ir', target: '_blank', rel: 'noopener', dir: 'ltr', text: 'arasstech.ir' })]),
            el('div', { 'class': 'atp-row' }, [el('span', { 'class': 'atp-label', text: 'فعال‌سازی برای کاربر' }), el('span', { 'class': 'atp-value', text: 'پروفایل ← ترجیحات ← زبان: Persian (Iran)' })]),
            el('div', { 'class': 'atp-row' }, [el('span', { 'class': 'atp-label', text: 'نام درخواست‌ها و پورتال' }), el('span', { 'class': 'atp-value', text: 'تنظیمات پروژه ← پشتیبانی زبان ← افزودن زبان: Persian (Iran)' })]),
            el('div', { 'class': 'atp-row' }, [el('span', { 'class': 'atp-label', text: 'فونت' }), el('span', { 'class': 'atp-value', text: 'وزیرمتن، اثر صابر راستی‌کردار؛ مجوز \u2066SIL Open Font License 1.1\u2069' })])
        ]));
    }

    addTab('general', 'تنظیمات', buildGeneral);
    addTab('translations', 'ترجمه‌ها', buildTranslations);
    addTab('constants', 'وضعیت‌ها و اولویت‌ها', buildConstants);
    addTab('about', 'درباره', buildAbout);
    var start = (w.location.hash || '').replace('#', '');
    if (panes[start]) { panes[start].btn.click(); } else { panes.general.btn.click(); }
    }
    if (d.getElementById('atp-admin')) { boot(); } else { d.addEventListener('DOMContentLoaded', boot); }
})(window, document);
