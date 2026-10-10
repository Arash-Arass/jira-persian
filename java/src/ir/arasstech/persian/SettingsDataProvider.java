package ir.arasstech.persian;

import com.atlassian.jira.component.ComponentAccessor;
import com.atlassian.jira.security.JiraAuthenticationContext;
import com.atlassian.json.marshal.Jsonable;
import com.atlassian.webresource.api.data.WebResourceDataProvider;

import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;

/**
 * Hands the saved settings to the browser with the page (WRM.data), so the interface is laid out right
 * on the very first paint. Persian users also get the default→custom text map for texts compiled into scripts.
 */
public class SettingsDataProvider implements WebResourceDataProvider {
    private final SettingsStore store;

    public SettingsDataProvider(SettingsStore store) {
        this.store = store;
    }

    @Override
    public Jsonable get() {
        final SettingsStore.Snapshot s = store.snapshot();
        final boolean fa = isPersianUser();
        return writer -> {
            Map<String, Object> out = new LinkedHashMap<>(s.settings);
            if (fa && !s.textMap.isEmpty()) {
                out.put("text", s.textMap);
            }
            writer.write(Json.write(out));
        };
    }

    private static boolean isPersianUser() {
        try {
            JiraAuthenticationContext ctx = ComponentAccessor.getJiraAuthenticationContext();
            Locale l = ctx == null ? null : ctx.getLocale();
            return l != null && "fa".equals(l.getLanguage());
        } catch (RuntimeException e) {
            return false;
        }
    }
}
