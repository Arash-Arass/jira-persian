package ir.arasstech.persian;

import com.atlassian.annotations.security.UnrestrictedAccess;
import com.atlassian.sal.api.auth.LoginUriProvider;
import com.atlassian.sal.api.user.UserKey;
import com.atlassian.sal.api.user.UserManager;
import com.atlassian.sal.api.websudo.WebSudoManager;
import com.atlassian.sal.api.websudo.WebSudoSessionException;
import com.atlassian.webresource.api.assembler.PageBuilderService;

import javax.servlet.ServletException;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.io.BufferedReader;
import java.io.IOException;
import java.io.PrintWriter;
import java.net.URI;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.logging.Level;
import java.util.logging.Logger;

/**
 * /plugins/servlet/atp/admin      the settings page (Jira administrators, behind Jira's secure administrator session)
 * /plugins/servlet/atp/api/...    JSON used by that page: settings, overrides, constants
 *
 * Access is checked here rather than by the platform so the page can answer with a login redirect or a
 * JSON message the page understands.
 */
@UnrestrictedAccess
public class AtpServlet extends HttpServlet {
    private static final long serialVersionUID = 1L;
    private static final Logger LOG = Logger.getLogger(AtpServlet.class.getName());
    private static final int MAX_BODY = 8 * 1024 * 1024;
    static final String ADMIN_RESOURCES = "ir.arasstech.persian.jsm:atp-admin";

    private final transient SettingsStore store;
    private final transient UserManager userManager;
    private final transient WebSudoManager webSudoManager;
    private final transient LoginUriProvider loginUriProvider;
    private final transient PageBuilderService pageBuilderService;
    private final transient ConstantsService constants;

    public AtpServlet(SettingsStore store, UserManager userManager, WebSudoManager webSudoManager,
                      LoginUriProvider loginUriProvider, PageBuilderService pageBuilderService) {
        this.store = store;
        this.userManager = userManager;
        this.webSudoManager = webSudoManager;
        this.loginUriProvider = loginUriProvider;
        this.pageBuilderService = pageBuilderService;
        this.constants = new ConstantsService(store);
    }

    private static String sub(HttpServletRequest req) {
        String p = req.getPathInfo();
        if (p == null) { return ""; }
        while (p.startsWith("/")) { p = p.substring(1); }
        while (p.endsWith("/")) { p = p.substring(0, p.length() - 1); }
        return p;
    }

    private boolean isAdmin(HttpServletRequest req) {
        UserKey k = userManager.getRemoteUserKey(req);
        return k != null && (userManager.isAdmin(k) || userManager.isSystemAdmin(k));
    }

    @Override
    protected void service(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {
        String path = sub(req);
        if (path.equals("admin") || path.isEmpty()) {
            if (!"GET".equals(req.getMethod()) && !"HEAD".equals(req.getMethod())) {
                resp.sendError(HttpServletResponse.SC_METHOD_NOT_ALLOWED);
                return;
            }
            page(req, resp);
        } else if (path.startsWith("api/")) {
            api(path.substring(4), req, resp);
        } else {
            resp.sendError(HttpServletResponse.SC_NOT_FOUND);
        }
    }

    /* ------------------------------------------------------------------ the page */

    private void page(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        if (userManager.getRemoteUserKey(req) == null) {
            resp.sendRedirect(loginUriProvider.getLoginUri(currentUri(req)).toASCIIString());
            return;
        }
        if (!isAdmin(req)) {
            resp.sendError(HttpServletResponse.SC_FORBIDDEN, "Jira administrators only");
            return;
        }
        if (!webSudoManager.canExecuteRequest(req)) {
            webSudoManager.enforceWebSudoProtection(req, resp);
            return;
        }
        try {
            pageBuilderService.assembler().resources().requireWebResource(ADMIN_RESOURCES);
        } catch (RuntimeException e) {
            LOG.log(Level.WARNING, "Arass Tech Persian: could not require " + ADMIN_RESOURCES, e);
        }
        resp.setContentType("text/html;charset=UTF-8");
        resp.setHeader("Cache-Control", "no-store");
        resp.setHeader("X-Content-Type-Options", "nosniff");
        String ctx = attr(req.getContextPath());
        String res = ctx + "/download/resources/" + ADMIN_RESOURCES + "/";
        PrintWriter w = resp.getWriter();
        w.write("<!DOCTYPE html><html><head><meta charset=\"utf-8\">");
        w.write("<title>Arass Tech Persian</title>");
        w.write("<meta name=\"decorator\" content=\"atl.admin\">");
        w.write("<meta name=\"admin.active.section\" content=\"admin_plugins_menu/upm_section\">");
        w.write("<meta name=\"admin.active.tab\" content=\"atp-admin-link\">");
        w.write("</head><body>");
        w.write("<div id=\"atp-admin\" data-ctx=\"" + ctx + "\" data-version=\"" + attr(Version.VALUE) + "\">");
        w.write("<noscript>برای استفاده از این صفحه، جاوااسکریپت مرورگر را روشن کنید.</noscript></div>");
        /* fallback when the web resource manager could not add the page's resources (e.g. a custom decorator) */
        w.write("<script>(function(){setTimeout(function(){var r=document.getElementById('atp-admin');"
                + "if(!r||r.getAttribute('data-ready')||window.ATP_ADMIN_LOADED){return;}"
                + "var l=document.createElement('link');l.rel='stylesheet';l.href='" + res + "atp-admin.css';document.head.appendChild(l);"
                + "var s=document.createElement('script');s.src='" + res + "atp-admin.js';document.head.appendChild(s);},2500);})();</script>");
        w.write("</body></html>");
    }

    private static URI currentUri(HttpServletRequest req) {
        StringBuffer b = req.getRequestURL();
        if (req.getQueryString() != null) { b.append('?').append(req.getQueryString()); }
        return URI.create(b.toString());
    }

    private static String attr(String s) {
        if (s == null) { return ""; }
        StringBuilder b = new StringBuilder(s.length() + 8);
        for (int i = 0; i < s.length(); i++) {
            char c = s.charAt(i);
            switch (c) {
                case '&': b.append("&amp;"); break;
                case '<': b.append("&lt;"); break;
                case '>': b.append("&gt;"); break;
                case '"': b.append("&quot;"); break;
                case '\'': b.append("&#39;"); break;
                default: b.append(c);
            }
        }
        return b.toString();
    }

    /* ------------------------------------------------------------------ JSON api */

    private void api(String what, HttpServletRequest req, HttpServletResponse resp) throws IOException {
        resp.setHeader("Cache-Control", "no-store");
        resp.setHeader("X-Content-Type-Options", "nosniff");
        if (userManager.getRemoteUserKey(req) == null) { json(resp, 401, error("ابتدا وارد Jira شوید.")); return; }
        if (!isAdmin(req)) { json(resp, 403, error("فقط مدیران Jira به این بخش دسترسی دارند.")); return; }
        String method = req.getMethod();
        boolean write = !"GET".equals(method) && !"HEAD".equals(method);
        if (write) {
            /* cross-site requests cannot set custom headers without CORS, which Jira does not grant here */
            if (!"1".equals(req.getHeader("X-ATP-Request"))) { json(resp, 403, error("درخواست نامعتبر است.")); return; }
            String ct = req.getContentType();
            if (ct == null || !ct.toLowerCase().startsWith("application/json")) { json(resp, 415, error("نوع محتوا باید JSON باشد.")); return; }
        }
        if (!webSudoManager.canExecuteRequest(req)) {
            Map<String, Object> e = error("نشست امن مدیر منقضی شده است.");
            e.put("websudo", Boolean.TRUE);
            json(resp, 401, e);
            return;
        }
        try {
            webSudoManager.willExecuteWebSudoRequest(req);
        } catch (WebSudoSessionException ex) {
            Map<String, Object> e = error("نشست امن مدیر منقضی شده است.");
            e.put("websudo", Boolean.TRUE);
            json(resp, 401, e);
            return;
        }
        try {
            switch (what) {
                case "settings":
                    if ("GET".equals(method)) { json(resp, 200, store.getSettings()); return; }
                    if ("PUT".equals(method) || "POST".equals(method)) { json(resp, 200, store.saveSettings(Json.parseObject(body(req)))); return; }
                    break;
                case "overrides":
                    if ("GET".equals(method)) { json(resp, 200, store.getOverrides()); return; }
                    if ("PUT".equals(method) || "POST".equals(method)) { json(resp, 200, store.saveOverrides(Json.parseObject(body(req)))); return; }
                    break;
                case "constants":
                    if ("GET".equals(method)) { json(resp, 200, constants.read()); return; }
                    if ("PUT".equals(method) || "POST".equals(method)) {
                        Object parsed = Json.parse(body(req));
                        if (!(parsed instanceof List)) { json(resp, 400, error("داده‌ی ارسالی معتبر نیست.")); return; }
                        @SuppressWarnings("unchecked") List<Object> items = (List<Object>) parsed;
                        Map<String, Object> r = new LinkedHashMap<>();
                        r.put("updated", constants.write(items));
                        json(resp, 200, r);
                        return;
                    }
                    break;
                case "status":
                    if ("GET".equals(method)) {
                        Map<String, Object> r = new LinkedHashMap<>();
                        r.put("version", Version.VALUE);
                        r.put("overrides", store.getOverrides().size());
                        json(resp, 200, r);
                        return;
                    }
                    break;
                default:
                    json(resp, 404, error("یافت نشد."));
                    return;
            }
            json(resp, 405, error("این عملیات پشتیبانی نمی‌شود."));
        } catch (IllegalArgumentException ex) {
            json(resp, 400, error("داده‌ی ارسالی معتبر نیست."));
        } catch (RuntimeException ex) {
            LOG.log(Level.WARNING, "Arass Tech Persian: request " + what + " failed", ex);
            json(resp, 500, error("خطای داخلی: " + ex.getClass().getSimpleName()));
        }
    }

    private static Map<String, Object> error(String msg) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("error", msg);
        return m;
    }

    private static String body(HttpServletRequest req) throws IOException {
        req.setCharacterEncoding("UTF-8");
        StringBuilder b = new StringBuilder();
        char[] buf = new char[8192];
        try (BufferedReader r = req.getReader()) {
            int n;
            while ((n = r.read(buf)) > 0) {
                b.append(buf, 0, n);
                if (b.length() > MAX_BODY) { throw new IllegalArgumentException("Body too large"); }
            }
        }
        return b.toString();
    }

    private static void json(HttpServletResponse resp, int status, Object o) throws IOException {
        resp.setStatus(status);
        resp.setContentType("application/json;charset=UTF-8");
        resp.getWriter().write(Json.write(o));
    }
}
