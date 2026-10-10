/*! Arass Tech Persian · Jalali dates & date picker v0.6.0 · (c) Arass Tech
 *  For Persian users: shows dates in the Jalali (Shamsi) calendar and replaces Jira's date picker
 *  with a Jalali one. Values are still written in the exact Gregorian format Jira's server expects
 *  for the Persian locale, so nothing changes in the database. */
(function (w, d) {
    'use strict';

    /* ================= Jalali <-> Gregorian (Borkowski algorithm) ================= */
    function div(a, b) { return ~~(a / b); }
    function mod(a, b) { return a - ~~(a / b) * b; }
    var BREAKS = [-61, 9, 38, 199, 426, 686, 756, 818, 1111, 1181, 1210, 1635, 2060, 2097, 2192, 2262, 2324, 2394, 2456, 3178];

    function jalCal(jy) {
        var bl = BREAKS.length, gy = jy + 621, leapJ = -14, jp = BREAKS[0], jm, jump = 0, leap, leapG, march, n, i;
        for (i = 1; i < bl; i += 1) {
            jm = BREAKS[i]; jump = jm - jp;
            if (jy < jm) { break; }
            leapJ = leapJ + div(jump, 33) * 8 + div(mod(jump, 33), 4);
            jp = jm;
        }
        n = jy - jp;
        leapJ = leapJ + div(n, 33) * 8 + div(mod(n, 33) + 3, 4);
        if (mod(jump, 33) === 4 && jump - n === 4) { leapJ += 1; }
        leapG = div(gy, 4) - div((div(gy, 100) + 1) * 3, 4) - 150;
        march = 20 + leapJ - leapG;
        if (jump - n < 6) { n = n - jump + div(jump + 4, 33) * 33; }
        leap = mod(mod(n + 1, 33) - 1, 4);
        if (leap === -1) { leap = 4; }
        return { leap: leap, gy: gy, march: march };
    }
    function g2d(gy, gm, gd) {
        var x = div((gy + div(gm - 8, 6) + 100100) * 1461, 4) + div(153 * mod(gm + 9, 12) + 2, 5) + gd - 34840408;
        return x - div(div(gy + 100100 + div(gm - 8, 6), 100) * 3, 4) + 752;
    }
    function d2g(jdn) {
        var j = 4 * jdn + 139361631;
        j = j + div(div(4 * jdn + 183187720, 146097) * 3, 4) * 4 - 3908;
        var i = div(mod(j, 1461), 4) * 5 + 308;
        var gd = div(mod(i, 153), 5) + 1, gm = mod(div(i, 153), 12) + 1;
        return { gy: div(j, 1461) - 100100 + div(8 - gm, 6), gm: gm, gd: gd };
    }
    function j2d(jy, jm, jd) {
        var r = jalCal(jy);
        return g2d(r.gy, 3, r.march) + (jm - 1) * 31 - div(jm, 7) * (jm - 7) + jd - 1;
    }
    function d2j(jdn) {
        var gy = d2g(jdn).gy, jy = gy - 621, r = jalCal(jy), k = jdn - g2d(gy, 3, r.march);
        if (k >= 0) {
            if (k <= 185) { return { jy: jy, jm: 1 + div(k, 31), jd: mod(k, 31) + 1 }; }
            k -= 186;
        } else {
            jy -= 1; k += 179;
            if (r.leap === 1) { k += 1; }
        }
        return { jy: jy, jm: 7 + div(k, 30), jd: mod(k, 30) + 1 };
    }
    function toJalali(gy, gm, gd) { return d2j(g2d(gy, gm, gd)); }
    function toGregorian(jy, jm, jd) { return d2g(j2d(jy, jm, jd)); }
    function jMonthLength(jy, jm) { return jm <= 6 ? 31 : jm <= 11 ? 30 : (jalCal(jy).leap === 0 ? 30 : 29); }

    /* ================= Persian text helpers ================= */
    var FA_DIGITS = '۰۱۲۳۴۵۶۷۸۹';
    function opt(k, dflt) { var st = w.ATP && w.ATP.settings; return st && st.hasOwnProperty(k) ? st[k] : dflt; }
    function faNum(x) {
        if (opt('dateDigits', 'fa') === 'latin') { return String(x); }
        return String(x).replace(/[0-9]/g, function (c) { return FA_DIGITS.charAt(+c); });
    }
    function enNum(s) {
        return String(s).replace(/[۰-۹]/g, function (c) { return String(FA_DIGITS.indexOf(c)); })
                        .replace(/[٠-٩]/g, function (c) { return String(c.charCodeAt(0) - 0x0660); });
    }
    var J_MONTHS = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'];
    var WEEK_HEAD = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'];          /* Saturday first */

    /* What Java's DateFormatSymbols(fa_IR) uses — the server parses date input with exactly these. */
    var JAVA = {
        shortMonths: ['ژانویه', 'فوریه', 'مارس', 'آوریل', 'مه', 'ژوئن', 'ژوئیه', 'اوت', 'سپتامبر', 'اکتبر', 'نوامبر', 'دسامبر'],
        months: ['ژانویهٔ', 'فوریهٔ', 'مارس', 'آوریل', 'مهٔ', 'ژوئن', 'ژوئیهٔ', 'اوت', 'سپتامبر', 'اکتبر', 'نوامبر', 'دسامبر'],
        weekdays: ['یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه', 'شنبه'],
        ampm: ['قبل‌ازظهر', 'بعدازظهر']
    };
    var EN_DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    var EN_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    var EN_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    function pad(n) { return n < 10 ? '0' + n : String(n); }

    /* ================= strftime (Jira date picker formats) ================= */
    function strftime(fmt, dt) {
        var h = dt.getHours(), h12 = h % 12 || 12;
        return fmt.replace(/%([a-zA-Z%])/g, function (m, t) {
            switch (t) {
                case 'd': return pad(dt.getDate());
                case 'e': return String(dt.getDate());
                case 'b': case 'h': return EN_SHORT[dt.getMonth()];        /* Jira parses picker input with English month names */
                case 'B': return EN_LONG[dt.getMonth()];
                case 'm': return pad(dt.getMonth() + 1);
                case 'y': return pad(dt.getFullYear() % 100);
                case 'Y': return String(dt.getFullYear());
                case 'H': return pad(h);
                case 'k': return String(h);
                case 'I': return pad(h12);
                case 'l': return String(h12);
                case 'M': return pad(dt.getMinutes());
                case 'S': return pad(dt.getSeconds());
                case 'p': case 'P': return h < 12 ? 'AM' : 'PM';
                case 'a': case 'A': return EN_DAYS[dt.getDay()];
                case '%': return '%';
                default: return m;
            }
        });
    }

    /* Parse a value written in a picker format; accepts Persian/English digits and month names. */
    function monthIndex(s) {
        s = s.trim();
        var lists = [JAVA.shortMonths, JAVA.months, EN_SHORT, EN_LONG], i, j;
        for (i = 0; i < lists.length; i++) {
            for (j = 0; j < 12; j++) { if (lists[i][j].toLowerCase() === s.toLowerCase()) { return j; } }
        }
        return -1;
    }
    function strptime(fmt, value) {
        if (!value) { return null; }
        var v = enNum(value).trim(), keys = [], re = '';
        fmt.replace(/%([a-zA-Z%])|([^%]+)/g, function (m, t, lit) {
            if (lit) { re += lit.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+'); return m; }
            if (/[deHkIlMmSyY]/.test(t)) { re += '(\\d{1,4})'; keys.push(t); } else if (/[bBhaA]/.test(t)) { re += '([^\\s/\\-.,\\d]+)'; keys.push(t); } else if (/[pP]/.test(t)) { re += '(\\S+)'; keys.push(t); } else if (t === '%') { re += '%'; }
            return m;
        });
        var mm = new RegExp('^' + re + '$').exec(v);
        if (!mm) { return null; }
        var y = null, mo = null, da = null, hh = 0, mi = 0, pm = null;
        for (var i = 0; i < keys.length; i++) {
            var x = mm[i + 1];
            switch (keys[i]) {
                case 'd': case 'e': da = +x; break;
                case 'm': mo = +x - 1; break;
                case 'b': case 'h': case 'B': mo = monthIndex(x); break;
                case 'y': y = 2000 + (+x); break;
                case 'Y': y = +x; break;
                case 'H': case 'k': hh = +x; break;
                case 'I': case 'l': hh = +x; break;
                case 'M': mi = +x; break;
                case 'p': case 'P': pm = (x === JAVA.ampm[1] || /^pm$/i.test(x)); break;
            }
        }
        if (pm !== null) { hh = (hh % 12) + (pm ? 12 : 0); }
        if (y === null || mo === null || mo < 0 || da === null) { return null; }
        var dt = new Date(y, mo, da, hh, mi);
        return isNaN(dt) ? null : dt;
    }

    /* ================= keep Jira's own picker language in step with the server ================= */
    function patchCalendarLanguage() {
        var C = w.Calendar;
        if (!C || true) { return; }   /* 1.1.4: Jira's server only accepts English month names in date input — leave Jira's calendar text alone */
        C._MN = JAVA.months.slice();
        C._SMN = JAVA.shortMonths.slice();
        C._DN = [JAVA.weekdays[0], JAVA.weekdays[1], JAVA.weekdays[2], JAVA.weekdays[3], JAVA.weekdays[4], JAVA.weekdays[5], JAVA.weekdays[6], JAVA.weekdays[0]];
        C._SDN = ['ی', 'د', 'س', 'چ', 'پ', 'ج', 'ش', 'ی'];
        C._FD = 6;
        C._TT = C._TT || {};
        C._TT.AM = C._TT.am = JAVA.ampm[0];
        C._TT.PM = C._TT.pm = JAVA.ampm[1];
    }

    function isFa() { return d.documentElement.classList.contains('atp-fa'); }

    /* ================= Jalali picker ================= */
    var setups = {};          /* input id -> { ifFormat, showsTime } captured from Jira's Calendar.setup */
    var pop = null, state = null;

    function css() {
        if (d.getElementById('atp-jdp-css')) { return; }
        var s = d.createElement('style');
        s.id = 'atp-jdp-css';
        s.textContent =
            '.atp-jdp{position:absolute;z-index:10000;direction:rtl;width:268px;padding:12px;background:var(--ds-surface-overlay,#fff);' +
            'border-radius:8px;box-shadow:0 8px 24px rgba(9,30,66,.25),0 0 1px rgba(9,30,66,.31);font:14px/1.4 "ATP Vazirmatn",-apple-system,"Segoe UI",Roboto,sans-serif;color:var(--ds-text,#172b4d);user-select:none}' +
            '.atp-jdp-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:8px}' +
            '.atp-jdp-title{font-weight:600;font-size:15px}' +
            '.atp-jdp-nav{width:30px;height:30px;border:0;border-radius:6px;background:transparent;cursor:pointer;font-size:18px;color:inherit}' +
            '.atp-jdp-nav:hover,.atp-jdp-day:hover{background:var(--ds-background-neutral-hovered,#ebecf0)}' +
            '.atp-jdp-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:2px;text-align:center}' +
            '.atp-jdp-wd{font-size:12px;color:var(--ds-text-subtlest,#6b778c);padding:4px 0}' +
            '.atp-jdp-day{height:32px;border:0;border-radius:6px;background:transparent;cursor:pointer;font:inherit;color:inherit}' +
            '.atp-jdp-day.is-other{visibility:hidden}' +
            '.atp-jdp-day.is-fri{color:#de350b}' +
            '.atp-jdp-day.is-today{box-shadow:inset 0 0 0 1px var(--ds-border-selected,#0c66e4)}' +
            '.atp-jdp-day.is-sel{background:var(--ds-background-selected-bold,#0c66e4);color:#fff}' +
            '.atp-jdp-foot{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:10px;padding-top:10px;border-top:1px solid var(--ds-border,#ebecf0)}' +
            '.atp-jdp-btn{border:0;border-radius:4px;padding:5px 10px;cursor:pointer;font:inherit;background:var(--ds-background-neutral,#f4f5f7);color:inherit}' +
            '.atp-jdp-btn.is-primary{background:var(--ds-background-brand-bold,#0c66e4);color:#fff}' +
            '.atp-jdp-time{direction:ltr;width:72px;padding:4px;border:1px solid var(--ds-border-input,#dfe1e6);border-radius:4px;font:inherit;text-align:center}' +
            '.atp-jdp-hint{display:block;margin-top:2px;font-size:12px;color:var(--ds-text-subtlest,#6b778c)}' +
            'html.atp-jdp-on div.calendar{display:none!important}' +
            'input.atp-jdp-real{position:absolute!important;opacity:0!important;pointer-events:none!important;width:1px!important;height:1px!important;min-width:0!important;padding:0!important;border:0!important;margin:0!important;overflow:hidden!important}' +
            'input.atp-jdp-disp{direction:rtl;text-align:right}';
        (d.head || d.documentElement).appendChild(s);
    }

    function fieldFormat(input) {
        var s = setups[input.id];
        if (s && s.ifFormat) { return { fmt: s.ifFormat, time: !!s.showsTime }; }
        var df = input.getAttribute('data-ifformat');                 /* customer portal: settings live on the input */
        if (df) { return { fmt: df, time: input.getAttribute('data-showstime') === 'true' }; }
        var dt = /datetime|date-time/i.test(input.className + ' ' + (input.getAttribute('data-type') || '')) || /:/.test(enNum(input.value));
        return dt ? { fmt: '%e/%b/%y %I:%M %p', time: true } : { fmt: '%e/%b/%y', time: false };
    }

    function close() {
        if (pop && pop.parentNode) { pop.parentNode.removeChild(pop); }
        pop = null; state = null;
        d.documentElement.classList.remove('atp-jdp-on');
        d.removeEventListener('mousedown', outside, true);
        d.removeEventListener('keydown', onKey, true);
    }
    function outside(e) {
        if (!pop || pop.contains(e.target)) { return; }
        if (state && (e.target === state.input || e.target === state.input.__atpDisp || (state.anchor && state.anchor.contains && state.anchor.contains(e.target)))) { return; }
        close();
    }
    function onKey(e) { if (e.key === 'Escape') { close(); } }

    function render() {
        var s = state, today = new Date(), tj = toJalali(today.getFullYear(), today.getMonth() + 1, today.getDate());
        var first = toGregorian(s.jy, s.jm, 1), firstDow = new Date(first.gy, first.gm - 1, first.gd).getDay();
        var lead = (firstDow + 1) % 7, len = jMonthLength(s.jy, s.jm), html = [];
        html.push('<div class="atp-jdp-head"><button type="button" class="atp-jdp-nav" data-nav="-1" aria-label="ماه قبل">›</button>' +
            '<div class="atp-jdp-title">' + J_MONTHS[s.jm - 1] + ' ' + faNum(s.jy) + '</div>' +
            '<button type="button" class="atp-jdp-nav" data-nav="1" aria-label="ماه بعد">‹</button></div><div class="atp-jdp-grid">');
        for (var i = 0; i < 7; i++) { html.push('<div class="atp-jdp-wd">' + WEEK_HEAD[i] + '</div>'); }
        for (i = 0; i < lead; i++) { html.push('<button type="button" class="atp-jdp-day is-other" tabindex="-1"></button>'); }
        for (var day = 1; day <= len; day++) {
            var cls = 'atp-jdp-day';
            if ((lead + day - 1) % 7 === 6) { cls += ' is-fri'; }
            if (s.jy === tj.jy && s.jm === tj.jm && day === tj.jd) { cls += ' is-today'; }
            if (s.sel && s.sel.jy === s.jy && s.sel.jm === s.jm && s.sel.jd === day) { cls += ' is-sel'; }
            html.push('<button type="button" class="' + cls + '" data-day="' + day + '">' + faNum(day) + '</button>');
        }
        html.push('</div><div class="atp-jdp-foot"><button type="button" class="atp-jdp-btn" data-act="today">امروز</button>');
        if (s.time) { html.push('<input class="atp-jdp-time" type="time" value="' + pad(s.hh) + ':' + pad(s.mi) + '">'); }
        html.push('<button type="button" class="atp-jdp-btn" data-act="clear">پاک کردن</button></div>');
        pop.innerHTML = html.join('');
    }

    function commit(jy, jm, jd) {
        var s = state, g = toGregorian(jy, jm, jd), t = pop.querySelector('.atp-jdp-time');
        if (t && /^\d{1,2}:\d{2}$/.test(t.value)) { s.hh = +t.value.split(':')[0]; s.mi = +t.value.split(':')[1]; }
        var dt = new Date(g.gy, g.gm - 1, g.gd, s.time ? s.hh : 0, s.time ? s.mi : 0);
        setValue(s.input, strftime(s.fmt, dt));
        close();
    }

    function setValue(input, v) {
        input.value = v;
        try { input.dispatchEvent(new Event('input', { bubbles: true })); input.dispatchEvent(new Event('change', { bubbles: true })); } catch (e) { /* old browsers */ }
        if (w.jQuery) { try { w.jQuery(input).trigger('change'); } catch (e2) { /* ignore */ } }
        hint(input);
    }

    function open(input, anchor) {
        css(); close(); patchCalendarLanguage(); hideJiraCalendar();
        d.documentElement.classList.add('atp-jdp-on');
        var f = fieldFormat(input), cur = strptime(f.fmt, input.value) || strptime('%e/%b/%y', input.value), base = cur || new Date();
        var bj = toJalali(base.getFullYear(), base.getMonth() + 1, base.getDate());
        state = { input: input, anchor: anchor, fmt: f.fmt, time: f.time, jy: bj.jy, jm: bj.jm, sel: cur ? bj : null,
                  hh: cur ? cur.getHours() : 9, mi: cur ? cur.getMinutes() : 0 };
        pop = d.createElement('div');
        pop.className = 'atp-jdp';
        pop.setAttribute('role', 'dialog');
        pop.addEventListener('click', function (e) {
            var b = e.target.closest('button');
            if (!b) { return; }
            e.preventDefault();
            if (b.hasAttribute('data-nav')) {
                var m = state.jm + (+b.getAttribute('data-nav'));
                if (m < 1) { m = 12; state.jy--; } else if (m > 12) { m = 1; state.jy++; }
                state.jm = m; render();
            } else if (b.hasAttribute('data-day')) {
                commit(state.jy, state.jm, +b.getAttribute('data-day'));
            } else if (b.getAttribute('data-act') === 'today') {
                var t = new Date(), tj = toJalali(t.getFullYear(), t.getMonth() + 1, t.getDate());
                if (state.time) { state.hh = t.getHours(); state.mi = t.getMinutes(); }
                commit(tj.jy, tj.jm, tj.jd);
            } else if (b.getAttribute('data-act') === 'clear') {
                setValue(state.input, ''); close();
            }
        });
        render();
        d.body.appendChild(pop);
        var vis = input.__atpDisp || input;
        var r = (anchor || vis).getBoundingClientRect(), ir = vis.getBoundingClientRect();
        var top = ir.bottom + w.pageYOffset + 4, right = Math.max(ir.right, r.right);
        var left = right + w.pageXOffset - pop.offsetWidth;
        if (left < 8) { left = 8; }
        if (ir.bottom + pop.offsetHeight + 8 > w.innerHeight && ir.top > pop.offsetHeight) { top = ir.top + w.pageYOffset - pop.offsetHeight - 4; }
        pop.style.top = top + 'px';
        pop.style.left = left + 'px';
        setTimeout(function () {
            d.addEventListener('mousedown', outside, true);
            d.addEventListener('keydown', onKey, true);
        }, 0);
    }

    /* Small Jalali hint under every date input, so the stored Gregorian text is never confusing. */
    function hint(input) {
        if (!input || !input.parentNode) { return; }
        if (input.__atpDisp) { syncDisp(input); return; }
        var h = input.parentNode.querySelector('.atp-jdp-hint[data-for="' + input.id + '"]');
        var f = fieldFormat(input), dt = strptime(f.fmt, input.value) || strptime('%e/%b/%y', input.value);
        if (!dt) { if (h) { h.textContent = ''; } return; }
        if (!h) {
            h = d.createElement('span');
            h.className = 'atp-jdp-hint';
            h.setAttribute('data-for', input.id);
            input.parentNode.appendChild(h);
        }
        var j = toJalali(dt.getFullYear(), dt.getMonth() + 1, dt.getDate());
        h.textContent = faNum(j.jd) + ' ' + J_MONTHS[j.jm - 1] + ' ' + faNum(j.jy) +
            (f.time ? '، ساعت ' + faNum(pad(dt.getHours()) + ':' + pad(dt.getMinutes())) : '');
    }

    /* ===== Jalali text inside the field: Jira keeps its Gregorian value in the (hidden) real input,
       the person sees and types the Jalali date in a twin input on top of it. ===== */
    var pairs = [];
    function dispText(input) {
        var v = input.value;
        if (!v) { return ''; }
        var f = fieldFormat(input), dt = strptime(f.fmt, v) || strptime('%e/%b/%y', v);
        if (!dt) { return v; }
        var j = toJalali(dt.getFullYear(), dt.getMonth() + 1, dt.getDate());
        return faNum(j.jd) + ' ' + J_MONTHS[j.jm - 1] + ' ' + faNum(j.jy) +
            (f.time ? '، ساعت ' + faNum(pad(dt.getHours()) + ':' + pad(dt.getMinutes())) : '');
    }
    function syncDisp(input) {
        var disp = input.__atpDisp;
        if (!disp) { return; }
        var old = input.parentNode && input.parentNode.querySelector('.atp-jdp-hint[data-for="' + input.id + '"]');
        if (old) { old.parentNode.removeChild(old); }
        if (d.activeElement === disp && disp.__dirty) { return; }       /* do not fight someone typing */
        disp.value = dispText(input);
        input.__atpLast = input.value;
    }
    var MONTHS_BY_LEN = J_MONTHS.map(function (m, i) { return { m: m, i: i + 1 }; }).sort(function (a, b) { return b.m.length - a.m.length; });
    /* "۴ مهر ۱۴۰۵", "1405/7/4", "۴/۷/۱۴۰۵", optionally with "ساعت 09:30" */
    function parseJalali(txt) {
        var t = enNum(txt).replace(/[‌‏‎]/g, ' ').trim(), hh = null, mi = null, y, m, dd, i, x;
        var tm = t.match(/(\d{1,2})\s*:\s*(\d{2})/);
        if (tm) { hh = +tm[1]; mi = +tm[2]; t = t.replace(tm[0], ' ').replace(/ساعت|،|,/g, ' '); }
        if ((x = t.match(/^\s*(\d{4})\s*[\/.\-]\s*(\d{1,2})\s*[\/.\-]\s*(\d{1,2})\s*$/))) { y = +x[1]; m = +x[2]; dd = +x[3]; }
        else if ((x = t.match(/^\s*(\d{1,2})\s*[\/.\-]\s*(\d{1,2})\s*[\/.\-]\s*(\d{4})\s*$/))) { dd = +x[1]; m = +x[2]; y = +x[3]; }
        else {
            for (i = 0; i < MONTHS_BY_LEN.length; i++) {
                if (t.indexOf(MONTHS_BY_LEN[i].m) >= 0) { m = MONTHS_BY_LEN[i].i; t = t.replace(MONTHS_BY_LEN[i].m, ' '); break; }
            }
            var nums = t.match(/\d+/g) || [];
            if (m && nums.length === 2) {
                if (nums[0].length === 4) { y = +nums[0]; dd = +nums[1]; } else { dd = +nums[0]; y = +nums[1]; }
            }
        }
        if (!y || !m || !dd) { return null; }
        if (y < 100) { y += 1400; }
        if (y < 1200 || y > 1600 || m < 1 || m > 12 || dd < 1 || dd > jMonthLength(y, m)) { return null; }
        var g = toGregorian(y, m, dd);
        return new Date(g.gy, g.gm - 1, g.gd, hh === null ? 9 : hh, mi === null ? 0 : mi);
    }
    function commitTyped(input) {
        var disp = input.__atpDisp, raw = disp.value.trim(), f = fieldFormat(input);
        disp.__dirty = false;
        if (!raw) { if (input.value) { setValue(input, ''); } else { syncDisp(input); } return; }
        if (raw === dispText(input)) { return; }
        var dt = parseJalali(raw) || strptime(f.fmt, raw) || strptime('%e/%b/%y', raw);
        if (dt) {
            if (!f.time && !/:/.test(enNum(raw))) { dt.setHours(0, 0, 0, 0); }
            setValue(input, strftime(f.fmt, dt));
        } else {
            input.value = raw;                                         /* let Jira show its own "invalid date" message */
            try { input.dispatchEvent(new Event('change', { bubbles: true })); } catch (e) { /* ignore */ }
            input.__atpLast = input.value;
        }
    }
    function mirror(input) {
        if (input.__atpDisp || !input.parentNode || input.type === 'hidden' || !opt('jalaliPicker', true)) { return; }
        var disp = d.createElement('input');
        disp.type = 'text';
        disp.className = input.className.split(/\s+/).filter(function (c) {
            return c && ['datepicker-input', 'date-picker', 'trigger-date-picker', 'atp-jdp-real'].indexOf(c) < 0;
        }).concat('atp-jdp-disp').join(' ');
        disp.setAttribute('autocomplete', 'off');
        disp.setAttribute('dir', 'rtl');
        disp.placeholder = fieldFormat(input).time ? 'مثلاً ۴ مهر ۱۴۰۵، ساعت ۰۹:۳۰' : 'مثلاً ۴ مهر ۱۴۰۵';
        if (input.id) { disp.id = input.id + '-atp-jalali'; }
        ['aria-labelledby', 'aria-describedby', 'aria-required', 'aria-invalid', 'title', 'style'].forEach(function (a) {
            if (input.hasAttribute(a)) { disp.setAttribute(a, input.getAttribute(a)); }
        });
        if (input.disabled) { disp.disabled = true; }
        if (input.readOnly) { disp.readOnly = true; }
        input.parentNode.insertBefore(disp, input.nextSibling);
        input.classList.add('atp-jdp-real');
        input.setAttribute('tabindex', '-1');
        input.setAttribute('aria-hidden', 'true');
        /* a <label for="real"> should focus the twin */
        if (input.id) {
            var lbls = d.querySelectorAll('label[for="' + input.id + '"]');
            for (var i = 0; i < lbls.length; i++) { lbls[i].setAttribute('for', disp.id); }
        }
        input.__atpDisp = disp; disp.__atpReal = input;
        disp.addEventListener('input', function () { disp.__dirty = true; });
        disp.addEventListener('change', function () { commitTyped(input); });
        disp.addEventListener('blur', function () { if (disp.__dirty) { commitTyped(input); } });
        disp.addEventListener('keydown', function (e) { if (e.key === 'Enter' && disp.__dirty) { commitTyped(input); } });
        input.addEventListener('change', function () { syncDisp(input); });
        pairs.push(input);
        syncDisp(input);
    }
    /* Jira sometimes fills or resets the real input from script (edit forms, "clear", server errors) */
    setInterval(function () {
        for (var i = pairs.length - 1; i >= 0; i--) {
            var r = pairs[i];
            if (!r.isConnected) { pairs.splice(i, 1); continue; }
            if (r.value !== r.__atpLast) { syncDisp(r); }
            if (r.__atpDisp && r.__atpDisp.disabled !== r.disabled) { r.__atpDisp.disabled = r.disabled; }
        }
    }, 500);

    function hideJiraCalendar() {
        try { if (w.calendar && typeof w.calendar.hide === 'function') { w.calendar.hide(); } } catch (e) { /* ignore */ }
    }

    function isPortalDateInput(el) {
        return !!(el && el.tagName === 'INPUT' && (el.classList.contains('trigger-date-picker') ||
            (el.classList.contains('date-picker') && el.hasAttribute('data-ifformat'))));
    }

    function inputForTrigger(t) {
        if (t.__atpReal) { return t.__atpReal; }
        if (t.tagName === 'INPUT') { return t; }
        var id = t.id || '';
        if (/-trigger$/.test(id)) { var el = d.getElementById(id.replace(/-trigger$/, '')); if (el) { return el; } }
        if (/^trigger-/.test(id)) { var el2 = d.getElementById(id.replace(/^trigger-/, '')); if (el2) { return el2; } }   /* customer portal */
        for (var k in setups) {
            if (setups.hasOwnProperty(k) && setups[k].button === id) { return d.getElementById(k); }
        }
        var wrap = t.closest('.field-group, .aui-field-datepicker, td, div');
        var found = wrap ? wrap.querySelector('input.datepicker-input, input.date-picker, input.text, input[type="text"]') : null;
        return found && found.__atpReal ? found.__atpReal : found;
    }

    var TRIGGER = 'a[id$="-trigger"], button[id^="trigger-"], .trigger-show-date-picker, .show-date-picker, input.trigger-date-picker, input.atp-jdp-disp, ' +
        '.aui-iconfont-calendar, .icon-date, .icon-calendar, .datepicker-trigger';
    function onTrigger(e) {
        var t = e.target.closest && e.target.closest(TRIGGER);
        if (!t) { return; }
        var input = inputForTrigger(t);
        if (!input || input.tagName !== 'INPUT') { return; }
        var isDate = setups[input.id] || input.classList.contains('datepicker-input') || isPortalDateInput(input) ||
            (t.matches && t.matches('.aui-iconfont-calendar, .icon-date, .icon-calendar, .datepicker-trigger')) ||
            (t.querySelector && t.querySelector('.aui-iconfont-calendar, .icon-date, .icon-calendar'));
        if (!isDate) { return; }
        if (input.__atpDisp && input.__atpDisp.disabled) { return; }
        if (t.tagName !== 'INPUT') { e.preventDefault(); }              /* typing into the field itself keeps working */
        e.stopPropagation();
        if (e.stopImmediatePropagation) { e.stopImmediatePropagation(); }
        if (pop && state && state.input === input) { return; }          /* already open for this field (focus + click) */
        open(input, t);
    }
    /* The portal opens Jira's own calendar when its date field gets focus; take that over too. */
    function onFocusIn(e) {
        var t = e.target;
        if (t && t.__atpDisp) {                                          /* script focused the hidden real field */
            e.stopPropagation(); if (e.stopImmediatePropagation) { e.stopImmediatePropagation(); }
            setTimeout(function () { t.__atpDisp.focus(); }, 0);
            return;
        }
        var real = t && t.__atpReal ? t.__atpReal : (isPortalDateInput(t) ? t : null);
        if (!real) { return; }
        e.stopPropagation();
        if (e.stopImmediatePropagation) { e.stopImmediatePropagation(); }
        if (pop && state && state.input === real) { return; }
        open(real, t);
    }

    function wrapCalendarSetup() {
        var C = w.Calendar;
        if (!C || !C.setup || C.setup.__atp) { return; }
        var orig = C.setup;
        C.setup = function (params) {
            try {
                var id = params && (typeof params.inputField === 'string' ? params.inputField : params.inputField && params.inputField.id);
                if (id) {
                    setups[id] = {
                        ifFormat: params.ifFormat || params.daFormat,
                        showsTime: !!params.showsTime,
                        button: typeof params.button === 'string' ? params.button : params.button && params.button.id
                    };
                    var el = d.getElementById(id);
                    if (el && isFa()) { setTimeout(function () { hint(el); }, 0); }
                }
            } catch (e) { /* never break Jira */ }
            if (isFa()) { patchCalendarLanguage(); }        /* English users keep Jira's own picker untouched */
            return orig.apply(this, arguments);   /* keep Jira's wiring; our capture-phase click wins for Persian users */
        };
        C.setup.__atp = true;
    }

    /* ================= Jalali display of <time> elements ================= */
    var partsFmt = null;
    function jalaliText(dt, withTime) {
        if (!partsFmt) {
            try { partsFmt = new Intl.DateTimeFormat('fa-IR-u-ca-persian-nu-latn', { year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }); } catch (e) { partsFmt = false; }
        }
        var y, m, dd, hh = dt.getHours(), mi = dt.getMinutes();
        if (partsFmt && partsFmt.formatToParts) {
            var parts = partsFmt.formatToParts(dt), o = {};
            for (var i = 0; i < parts.length; i++) { o[parts[i].type] = parts[i].value; }
            y = +enNum(o.year); m = +enNum(o.month); dd = +enNum(o.day); hh = +enNum(o.hour) % 24; mi = +enNum(o.minute);
        } else {
            var j = toJalali(dt.getFullYear(), dt.getMonth() + 1, dt.getDate()); y = j.jy; m = j.jm; dd = j.jd;
        }
        return faNum(dd) + ' ' + J_MONTHS[m - 1] + ' ' + faNum(y) + (withTime ? '، ساعت ' + faNum(pad(hh) + ':' + pad(mi)) : '');
    }
    var MONTH_WORDS = new RegExp('(' + EN_SHORT.concat(EN_LONG, JAVA.shortMonths, JAVA.months).join('|') + ')', 'i');
    function isAbsolute(text) {
        var t = enNum(text);
        return MONTH_WORDS.test(t) || /\d{1,4}[\/.\-]\d{1,2}[\/.\-]\d{1,4}/.test(t);
    }
    function parseIso(v) {
        if (!v) { return null; }
        var s = v.replace(/([+-]\d{2})(\d{2})$/, '$1:$2');
        if (/^\d{4}-\d{2}-\d{2}$/.test(s)) { var p = s.split('-'); return { date: new Date(+p[0], +p[1] - 1, +p[2]), dateOnly: true }; }
        var dt = new Date(s);
        return isNaN(dt) ? null : { date: dt, dateOnly: false };
    }
    function convertTimes(rootEl) {
        var list = (rootEl || d).querySelectorAll('time[datetime]');
        for (var i = 0; i < list.length; i++) {
            var el = list[i];
            if (el.hasAttribute('data-greg')) { continue; }          /* an older banner script already handles it */
            if (el.getAttribute('data-atp-j') === el.textContent) { continue; }
            var p = parseIso(el.getAttribute('datetime'));
            if (!p) { continue; }
            var txt = el.textContent.trim();
            var withTime = !p.dateOnly && /\d:\d/.test(enNum(txt));
            var jal = jalaliText(p.date, withTime);
            if (!el.hasAttribute('data-atp-greg')) { el.setAttribute('data-atp-greg', txt); }
            if (isAbsolute(txt)) {
                el.textContent = jal;
                if (!el.title || isAbsolute(el.title)) { el.title = el.getAttribute('data-atp-greg'); }
            } else {
                el.title = jalaliText(p.date, !p.dateOnly);
            }
            el.setAttribute('data-atp-j', el.textContent);
        }
    }

    /* ================= wiring ================= */
    var queued = false;
    function sweep() {
        queued = false;
        wrapCalendarSetup();
        if (opt('jalali', true)) { convertTimes(); }
        if (!opt('jalaliPicker', true) && !opt('jalali', true)) { return; }
        var inputs = d.querySelectorAll('input.datepicker-input, input[id="duedate"], .aui-field-datepicker input, input.trigger-date-picker, input.date-picker[data-ifformat]');
        for (var i = 0; i < inputs.length; i++) {
            if (inputs[i].classList.contains('atp-jdp-disp')) { continue; }
            if (opt('jalaliPicker', true)) { css(); mirror(inputs[i]); }
            if (!inputs[i].getAttribute('data-atp-h')) {
                inputs[i].setAttribute('data-atp-h', '1');
                inputs[i].addEventListener('change', function () { hint(this); });
                hint(inputs[i]);
            }
        }
    }
    function queue() {
        if (queued) { return; }
        queued = true;
        (w.requestAnimationFrame || w.setTimeout)(sweep);
    }

    function start() {
        if (!isFa()) { return; }
        patchCalendarLanguage();                     /* always: the server parses Persian month names for Persian users */
        if (opt('jalaliPicker', true)) {
            d.addEventListener('click', onTrigger, true);
            d.addEventListener('mousedown', onTrigger, true);            /* before the portal's own mousedown handlers */
            d.addEventListener('focusin', onFocusIn, true);
            d.addEventListener('focus', onFocusIn, true);                 /* jQuery focus handlers bound on the field itself */
        }
        sweep();
        if (w.MutationObserver && d.body) {
            new MutationObserver(function (muts) {
                for (var i = 0; i < muts.length; i++) {
                    if (muts[i].addedNodes.length || muts[i].type === 'characterData') { queue(); return; }
                }
            }).observe(d.body, { childList: true, subtree: true, characterData: true });
        }
    }

    w.ATP = w.ATP || {};
    w.ATP.dates = { start: start, toJalali: toJalali, toGregorian: toGregorian, strftime: strftime, strptime: strptime, jMonthLength: jMonthLength };

    wrapCalendarSetup();
    if (d.readyState === 'loading') { d.addEventListener('DOMContentLoaded', start); } else { start(); }
})(window, document);
