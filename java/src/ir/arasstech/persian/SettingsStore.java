package ir.arasstech.persian;

import com.atlassian.sal.api.pluginsettings.PluginSettings;
import com.atlassian.sal.api.pluginsettings.PluginSettingsFactory;

import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.BufferedReader;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Properties;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.logging.Level;
import java.util.logging.Logger;

/**
 * Everything an administrator saves on the Arass Tech Persian settings page.
 *
 * Values live in Jira's own plugin settings (database), so they survive upgrades and are shared by every
 * node of a Data Center cluster. Each node keeps a read-only snapshot in memory and re-reads it every
 * {@link #REFRESH_MS} milliseconds, so a change saved on one node reaches the others within seconds.
 */
public class SettingsStore {
    private static final Logger LOG = Logger.getLogger(SettingsStore.class.getName());

    static final String PREFIX = "ir.arasstech.persian.jsm:";
    static final String K_SETTINGS = PREFIX + "settings";
    static final String K_OVERRIDES = PREFIX + "overrides";
    static final String K_TEXTMAP = PREFIX + "textmap";
    static final String K_REV = PREFIX + "rev";
    static final String K_CONST_PREFIX = PREFIX + "constant-prefix.";

    static final long REFRESH_MS = 30_000L;
    static final int MAX_OVERRIDES = 40_000;
    static final int MAX_KEY = 255;
    static final int MAX_VALUE = 8_000;

    /** Defaults, in the order the settings page shows them. Types matter: a saved value must have the same type. */
    static final Map<String, Object> DEFAULTS;
    static {
        Map<String, Object> d = new LinkedHashMap<>();
        d.put("rtlAgent", Boolean.TRUE);
        d.put("rtlPortal", Boolean.TRUE);
        d.put("font", "vazirmatn");
        d.put("fontEveryone", Boolean.TRUE);
        d.put("smartBidi", Boolean.TRUE);
        d.put("editorRtl", Boolean.TRUE);
        d.put("jalali", Boolean.TRUE);
        d.put("jalaliPicker", Boolean.TRUE);
        d.put("dateDigits", "fa");
        d.put("theme", "arass");
        DEFAULTS = Collections.unmodifiableMap(d);
    }
    private static final Map<String, List<String>> CHOICES;
    static {
        Map<String, List<String>> c = new LinkedHashMap<>();
        c.put("font", List.of("vazirmatn", "system"));
        c.put("dateDigits", List.of("fa", "latin"));
        c.put("theme", List.of("arass", "jira"));
        CHOICES = Collections.unmodifiableMap(c);
    }

    /** Immutable view of everything saved, as read at {@code loadedAt}. */
    static final class Snapshot {
        final Map<String, Object> settings;
        final String settingsJson;
        final Map<String, String> overrides;
        final Map<String, String> textMap;
        final String textMapJson;
        final String rev;
        final long loadedAt;

        Snapshot(Map<String, Object> settings, Map<String, String> overrides, Map<String, String> textMap, String rev, long loadedAt) {
            this.settings = Collections.unmodifiableMap(settings);
            this.settingsJson = Json.write(settings);
            this.overrides = Collections.unmodifiableMap(overrides);
            this.textMap = Collections.unmodifiableMap(textMap);
            this.textMapJson = Json.write(textMap);
            this.rev = rev;
            this.loadedAt = loadedAt;
        }
    }

    private final PluginSettingsFactory factory;
    private volatile Snapshot snapshot;
    private final AtomicBoolean refreshing = new AtomicBoolean(false);
    private final Object writeLock = new Object();
    private volatile Map<String, String> packText;          /* default Persian text of every key we ship, loaded on first save */

    public SettingsStore(PluginSettingsFactory factory) {
        this.factory = factory;
        this.snapshot = new Snapshot(new LinkedHashMap<>(DEFAULTS), new LinkedHashMap<>(), new LinkedHashMap<>(), "0", 0L);
    }

    /* ------------------------------------------------------------------ reading */

    Snapshot snapshot() {
        Snapshot s = snapshot;
        if (System.currentTimeMillis() - s.loadedAt > REFRESH_MS && refreshing.compareAndSet(false, true)) {
            try {
                s = load();
                snapshot = s;
            } catch (Throwable t) {
                /* keep serving the last good snapshot; never break a page because settings could not be read */
                snapshot = s = new Snapshot(new LinkedHashMap<>(s.settings), new LinkedHashMap<>(s.overrides),
                        new LinkedHashMap<>(s.textMap), s.rev, System.currentTimeMillis());
                LOG.log(Level.WARNING, "Arass Tech Persian: could not read settings", t);
            } finally {
                refreshing.set(false);
            }
        }
        return s;
    }

    /** The override for a translation key, or null. Called for every translated text, so it must stay cheap. */
    String override(String key) {
        Snapshot s = snapshot();
        if (s.overrides.isEmpty()) { return null; }
        return s.overrides.get(key);
    }

    Map<String, Object> getSettings() { return snapshot().settings; }

    Map<String, String> getOverrides() { return snapshot().overrides; }

    private PluginSettings ps() { return factory.createGlobalSettings(); }

    private static String str(Object o) { return o instanceof String ? (String) o : null; }

    private Snapshot load() {
        PluginSettings ps = ps();
        Map<String, Object> settings = sanitizeSettings(Json.parseObject(str(ps.get(K_SETTINGS))));
        Map<String, String> overrides = toStringMap(Json.parseObject(str(ps.get(K_OVERRIDES))));
        Map<String, String> textMap = toStringMap(Json.parseObject(str(ps.get(K_TEXTMAP))));
        String rev = str(ps.get(K_REV));
        return new Snapshot(settings, overrides, textMap, rev == null ? "0" : rev, System.currentTimeMillis());
    }

    private static Map<String, String> toStringMap(Map<String, Object> in) {
        Map<String, String> out = new LinkedHashMap<>();
        for (Map.Entry<String, Object> e : in.entrySet()) {
            if (e.getValue() instanceof String) { out.put(e.getKey(), (String) e.getValue()); }
        }
        return out;
    }

    /* ------------------------------------------------------------------ writing */

    static Map<String, Object> sanitizeSettings(Map<String, Object> in) {
        Map<String, Object> out = new LinkedHashMap<>(DEFAULTS);
        if (in == null) { return out; }
        for (Map.Entry<String, Object> d : DEFAULTS.entrySet()) {
            Object v = in.get(d.getKey());
            if (v == null || v.getClass() != d.getValue().getClass()) { continue; }
            List<String> allowed = CHOICES.get(d.getKey());
            if (allowed != null && !allowed.contains(v)) { continue; }
            out.put(d.getKey(), v);
        }
        return out;
    }

    Map<String, Object> saveSettings(Map<String, Object> in) {
        Map<String, Object> clean = sanitizeSettings(in);
        synchronized (writeLock) {
            PluginSettings ps = ps();
            ps.put(K_SETTINGS, Json.write(clean));
            bumpRevision(ps);
            reloadNow();
        }
        return clean;
    }

    /** Cleans what the browser sent: valid keys only, sane sizes, no control characters. */
    static Map<String, String> sanitizeOverrides(Map<String, Object> in) {
        Map<String, String> out = new LinkedHashMap<>();
        if (in == null) { return out; }
        for (Map.Entry<String, Object> e : in.entrySet()) {
            String k = e.getKey();
            if (!(e.getValue() instanceof String) || k == null) { continue; }
            k = k.trim();
            if (k.isEmpty() || k.length() > MAX_KEY || !k.matches("[A-Za-z0-9_.\\-'/:@$]+")) { continue; }
            String v = stripControl((String) e.getValue()).trim();
            if (v.isEmpty()) { continue; }
            if (v.length() > MAX_VALUE) { v = v.substring(0, MAX_VALUE); }
            out.put(k, v);
            if (out.size() >= MAX_OVERRIDES) { break; }
        }
        return out;
    }

    private static String stripControl(String s) {
        StringBuilder b = new StringBuilder(s.length());
        for (int i = 0; i < s.length(); i++) {
            char c = s.charAt(i);
            if (c == '\n' || c == '\t' || c >= 0x20 && c != 0x7f) { b.append(c); }
        }
        return b.toString();
    }

    Map<String, String> saveOverrides(Map<String, Object> in) {
        Map<String, String> clean = sanitizeOverrides(in);
        Map<String, String> textMap = buildTextMap(clean);
        synchronized (writeLock) {
            PluginSettings ps = ps();
            if (clean.isEmpty()) { ps.remove(K_OVERRIDES); } else { ps.put(K_OVERRIDES, Json.write(clean)); }
            if (textMap.isEmpty()) { ps.remove(K_TEXTMAP); } else { ps.put(K_TEXTMAP, Json.write(textMap)); }
            bumpRevision(ps);
            reloadNow();
        }
        return clean;
    }

    /**
     * Texts that are compiled into JavaScript at build time never pass through the server-side transform.
     * For those, the browser swaps the default Persian text for the administrator's text; this builds the
     * default→custom map. Texts with arguments ({0}) are left out: they are always assembled server side
     * or by AJS.format, and a literal match would be unreliable.
     */
    Map<String, String> buildTextMap(Map<String, String> overrides) {
        Map<String, String> out = new LinkedHashMap<>();
        if (overrides.isEmpty()) { return out; }
        Map<String, String> pack = packText();
        for (Map.Entry<String, String> e : overrides.entrySet()) {
            String def = pack.get(e.getKey());
            if (def == null) { continue; }
            def = unquote(def).trim();
            String val = unquote(e.getValue()).trim();
            if (def.length() < 2 || def.equals(val) || def.indexOf('{') >= 0 || val.indexOf('{') >= 0
                    || def.indexOf('<') >= 0 || val.indexOf('<') >= 0) { continue; }
            out.put(def, val);
        }
        /* a chain or loop (A→B, B→A) would make the browser swap texts back and forth forever */
        final java.util.Set<String> defaults = new java.util.HashSet<>(out.keySet());
        out.entrySet().removeIf(e -> defaults.contains(e.getValue()));
        return out;
    }

    /** MessageFormat writes an apostrophe as two; the text the user sees has one. */
    private static String unquote(String s) { return s.replace("''", "'"); }

    /** Default Persian text of every key in the bundled translation files (index generated at build time). */
    Map<String, String> packText() {
        Map<String, String> p = packText;
        if (p != null) { return p; }
        Map<String, String> m = new LinkedHashMap<>();
        ClassLoader cl = SettingsStore.class.getClassLoader();
        try (InputStream idx = cl.getResourceAsStream("atp-i18n-index.txt")) {
            if (idx != null) {
                BufferedReader r = new BufferedReader(new InputStreamReader(idx, StandardCharsets.UTF_8));
                String line;
                while ((line = r.readLine()) != null) {
                    line = line.trim();
                    if (line.isEmpty()) { continue; }
                    try (InputStream in = cl.getResourceAsStream(line)) {
                        if (in == null) { continue; }
                        Properties props = new Properties();
                        props.load(in);              /* ISO-8859-1 with \\uXXXX escapes, as Jira reads them */
                        for (String k : props.stringPropertyNames()) { m.put(k, props.getProperty(k)); }
                    }
                }
            }
        } catch (IOException e) {
            LOG.log(Level.WARNING, "Arass Tech Persian: could not read bundled translations", e);
        }
        packText = Collections.unmodifiableMap(m);
        return packText;
    }

    private static void bumpRevision(PluginSettings ps) {
        ps.put(K_REV, Long.toString(System.currentTimeMillis(), 36));
    }

    private void reloadNow() {
        try {
            snapshot = load();
        } catch (Throwable t) {
            LOG.log(Level.WARNING, "Arass Tech Persian: could not reload settings", t);
        }
    }

    /* ------------------------------------------------------------------ small values */

    String getString(String key) { return str(ps().get(key)); }

    void putString(String key, String value) {
        synchronized (writeLock) {
            if (value == null) { ps().remove(key); } else { ps().put(key, value); }
        }
    }

    static List<String> settingKeys() { return new ArrayList<>(DEFAULTS.keySet()); }
}
