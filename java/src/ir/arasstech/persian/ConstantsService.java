package ir.arasstech.persian;

import com.atlassian.jira.component.ComponentAccessor;
import com.atlassian.jira.config.ConstantsManager;
import com.atlassian.jira.issue.IssueConstant;
import com.atlassian.jira.util.I18nHelper;
import com.atlassian.jira.web.action.admin.translation.TranslationManager;

import java.util.ArrayList;
import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.logging.Level;
import java.util.logging.Logger;

/**
 * Persian names for statuses, priorities, resolutions and issue types, written into Jira's own
 * translation store (the same one as Administration → Issues → Translations). Names in the database,
 * JQL and other languages are left untouched.
 */
class ConstantsService {
    private static final Logger LOG = Logger.getLogger(ConstantsService.class.getName());
    static final Locale FA = new Locale("fa", "IR");
    static final String FA_STR = "fa_IR";

    /** Our type id → Jira's constant type, as ConstantsManager names it. */
    static final Map<String, String> TYPES = new LinkedHashMap<>();
    static {
        TYPES.put("status", ConstantsManager.CONSTANT_TYPE.STATUS.getType());
        TYPES.put("priority", ConstantsManager.CONSTANT_TYPE.PRIORITY.getType());
        TYPES.put("resolution", ConstantsManager.CONSTANT_TYPE.RESOLUTION.getType());
        TYPES.put("issuetype", ConstantsManager.CONSTANT_TYPE.ISSUE_TYPE.getType());
    }

    private final SettingsStore store;

    ConstantsService(SettingsStore store) {
        this.store = store;
    }

    private static ConstantsManager cm() { return ComponentAccessor.getConstantsManager(); }

    private static TranslationManager tm() { return ComponentAccessor.getComponent(TranslationManager.class); }

    private static Collection<? extends IssueConstant> list(String type) {
        ConstantsManager cm = cm();
        switch (type) {
            case "status": return cm.getStatuses();
            case "priority": return cm.getPriorities();
            case "resolution": return cm.getResolutions();
            default: return cm.getAllIssueTypeObjects();
        }
    }

    /** Key of the name-based default translation shipped in our language pack (Jira's own convention). */
    static String packKey(String type, String name, boolean isName) {
        return "jira.translation." + type + "." + name.toLowerCase(Locale.ROOT).replace(" ", "") + (isName ? ".name" : ".desc");
    }

    private static String packText(I18nHelper i18n, String key) {
        if (i18n == null) { return null; }
        try {
            String t = i18n.getText(key);
            return t == null || t.equals(key) || t.trim().isEmpty() ? null : t;
        } catch (RuntimeException e) {
            return null;
        }
    }

    /** Everything the settings page shows: one list per type. */
    Map<String, Object> read() {
        TranslationManager tm = tm();
        I18nHelper i18n = faI18n();
        Map<String, Object> out = new LinkedHashMap<>();
        for (String type : TYPES.keySet()) {
            List<Object> rows = new ArrayList<>();
            for (IssueConstant c : list(type)) {
                Map<String, Object> r = new LinkedHashMap<>();
                r.put("id", c.getId());
                r.put("name", c.getName());
                r.put("description", c.getDescription() == null ? "" : c.getDescription());
                String fa = "", faDesc = "";
                if (tm != null && tm.hasLocaleTranslation(c, FA_STR)) {
                    fa = nz(tm.getIssueConstantTranslation(c, true, FA_STR));
                    faDesc = nz(tm.getIssueConstantTranslation(c, false, FA_STR));
                    if (faDesc.equals(nz(c.getDescription()))) { faDesc = ""; }
                }
                r.put("fa", fa);
                r.put("faDesc", faDesc);
                String suggested = packText(i18n, packKey(type, c.getName(), true));
                r.put("suggested", suggested == null ? "" : suggested);
                rows.add(r);
            }
            out.put(type, rows);
        }
        return out;
    }

    private static String nz(String s) { return s == null ? "" : s; }

    private static I18nHelper faI18n() {
        try {
            return ComponentAccessor.getI18nHelperFactory().getInstance(FA);
        } catch (RuntimeException e) {
            return null;
        }
    }

    /**
     * Saves translations. An empty name removes the saved translation (the language pack's default applies again).
     * Returns how many constants were written or cleared.
     */
    int write(List<Object> items) {
        TranslationManager tm = tm();
        ConstantsManager cm = cm();
        if (tm == null || cm == null) { throw new IllegalStateException("Jira translation service is not available"); }
        I18nHelper i18n = faI18n();
        Set<String> touched = new LinkedHashSet<>();
        int n = 0;
        for (Object o : items) {
            if (!(o instanceof Map)) { continue; }
            Map<?, ?> m = (Map<?, ?>) o;
            String type = m.get("type") instanceof String ? (String) m.get("type") : null;
            String id = m.get("id") instanceof String ? (String) m.get("id") : null;
            if (type == null || id == null || !TYPES.containsKey(type)) { continue; }
            IssueConstant c = cm.getConstantObject(TYPES.get(type), id);
            if (c == null) { continue; }
            String fa = clean(m.get("fa"), 255);
            String faDesc = clean(m.get("faDesc"), 4000);
            if (fa.isEmpty()) {
                if (tm.hasLocaleTranslation(c, FA_STR)) {
                    tm.deleteIssueConstantTranslation(c, prefix(type, c, tm), FA);
                    n++;
                    touched.add(type);
                }
                continue;
            }
            if (faDesc.isEmpty()) {
                String d = packText(i18n, packKey(type, c.getName(), false));
                faDesc = d != null ? d : nz(c.getDescription());
            }
            String p = prefix(type, c, tm);
            tm.setIssueConstantTranslation(c, p, FA, fa, faDesc);
            n++;
            touched.add(type);
        }
        refresh(touched);
        return n;
    }

    private static String clean(Object o, int max) {
        if (!(o instanceof String)) { return ""; }
        String s = ((String) o).replaceAll("[\\p{Cntrl}]", " ").trim();
        return s.length() > max ? s.substring(0, max) : s;
    }

    /**
     * The prefix Jira's translation store expects for this kind of constant. Jira's own translation screen passes its
     * entity name ("Status", "Priority", "Resolution", "IssueType"); older and newer versions differ in detail, so the
     * first write per type is verified by reading it back, and the prefix that works is remembered.
     */
    private String prefix(String type, IssueConstant sample, TranslationManager tm) {
        String key = SettingsStore.K_CONST_PREFIX + type;
        String saved = store.getString(key);
        if (saved != null) { return saved; }
        String entity = TYPES.get(type);
        String[] candidates = {
                entity,
                "jira.translation." + entity,
                type,
                "jira.translation." + type
        };
        boolean had = tm.hasLocaleTranslation(sample, FA_STR);
        String before = had ? tm.getIssueConstantTranslation(sample, true, FA_STR) : null;
        String beforeDesc = had ? tm.getIssueConstantTranslation(sample, false, FA_STR) : null;
        String probe = "​atp-probe-" + System.nanoTime();
        for (String p : candidates) {
            try {
                tm.setIssueConstantTranslation(sample, p, FA, probe, "");
                invalidate(sample);
                IssueConstant fresh = cm().getConstantObject(entity, sample.getId());
                boolean ok = fresh != null && probe.equals(tm.getIssueConstantTranslation(fresh, true, FA_STR));
                if (ok) {
                    if (had) { tm.setIssueConstantTranslation(sample, p, FA, before, beforeDesc == null ? "" : beforeDesc); }
                    else { tm.deleteIssueConstantTranslation(sample, p, FA); }
                    invalidate(sample);
                    store.putString(key, p);
                    return p;
                }
                tm.deleteIssueConstantTranslation(sample, p, FA);
                invalidate(sample);
            } catch (RuntimeException e) {
                LOG.log(Level.FINE, "Arass Tech Persian: prefix " + p + " rejected", e);
            }
        }
        LOG.warning("Arass Tech Persian: could not confirm the translation prefix for " + type + "; using " + entity);
        return entity;
    }

    private static void invalidate(IssueConstant c) {
        try { cm().invalidate(c); } catch (RuntimeException e) { /* older versions: refresh below covers it */ }
    }

    private static void refresh(Set<String> types) {
        ConstantsManager cm = cm();
        for (String t : types) {
            try {
                switch (t) {
                    case "status": cm.refreshStatuses(); break;
                    case "priority": cm.refreshPriorities(); break;
                    case "resolution": cm.refreshResolutions(); break;
                    default: cm.refreshIssueTypes(); break;
                }
            } catch (RuntimeException e) {
                LOG.log(Level.WARNING, "Arass Tech Persian: could not refresh " + t, e);
            }
        }
    }
}
