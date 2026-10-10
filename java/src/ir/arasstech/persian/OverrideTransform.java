package ir.arasstech.persian;

import com.atlassian.jira.plugin.language.TranslationTransform;

import java.util.Locale;

/**
 * Puts the administrator's own wording in place of the bundled Persian translation.
 * Jira calls this for every translated text, so it does nothing but a locale check and a map lookup.
 */
@SuppressWarnings("deprecation") /* still the supported hook in Jira 10.x */
public class OverrideTransform implements TranslationTransform {
    private final SettingsStore store;

    public OverrideTransform(SettingsStore store) {
        this.store = store;
    }

    @Override
    public String apply(Locale locale, String key, String rawMessage) {
        if (key == null || locale == null || !"fa".equals(locale.getLanguage())) {
            return rawMessage;
        }
        try {
            String o = store.override(key);
            return o != null ? o : rawMessage;
        } catch (RuntimeException e) {
            return rawMessage;
        }
    }
}
