package ir.arasstech.persian;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** Tiny, dependency-free JSON reader/writer (objects, arrays, strings, numbers, booleans, null). */
final class Json {
    private final String s;
    private int i;

    private Json(String s) { this.s = s; }

    static Object parse(String text) {
        if (text == null || text.trim().isEmpty()) { return null; }
        Json p = new Json(text);
        p.ws();
        Object v = p.value();
        p.ws();
        if (p.i != p.s.length()) { throw new IllegalArgumentException("Trailing characters at " + p.i); }
        return v;
    }

    @SuppressWarnings("unchecked")
    static Map<String, Object> parseObject(String text) {
        Object o = parse(text);
        return o instanceof Map ? (Map<String, Object>) o : new LinkedHashMap<String, Object>();
    }

    private void ws() { while (i < s.length() && Character.isWhitespace(s.charAt(i))) { i++; } }

    private Object value() {
        if (i >= s.length()) { throw new IllegalArgumentException("Unexpected end"); }
        char c = s.charAt(i);
        if (c == '{') { return object(); }
        if (c == '[') { return array(); }
        if (c == '"') { return string(); }
        if (s.startsWith("true", i)) { i += 4; return Boolean.TRUE; }
        if (s.startsWith("false", i)) { i += 5; return Boolean.FALSE; }
        if (s.startsWith("null", i)) { i += 4; return null; }
        return number();
    }

    private Map<String, Object> object() {
        Map<String, Object> m = new LinkedHashMap<String, Object>();
        i++; ws();
        if (s.charAt(i) == '}') { i++; return m; }
        while (true) {
            ws();
            String k = string();
            ws();
            if (s.charAt(i) != ':') { throw new IllegalArgumentException("Expected : at " + i); }
            i++; ws();
            m.put(k, value());
            ws();
            char c = s.charAt(i++);
            if (c == '}') { return m; }
            if (c != ',') { throw new IllegalArgumentException("Expected , at " + (i - 1)); }
        }
    }

    private List<Object> array() {
        List<Object> l = new ArrayList<Object>();
        i++; ws();
        if (s.charAt(i) == ']') { i++; return l; }
        while (true) {
            ws();
            l.add(value());
            ws();
            char c = s.charAt(i++);
            if (c == ']') { return l; }
            if (c != ',') { throw new IllegalArgumentException("Expected , at " + (i - 1)); }
        }
    }

    private String string() {
        if (s.charAt(i) != '"') { throw new IllegalArgumentException("Expected string at " + i); }
        i++;
        StringBuilder b = new StringBuilder();
        while (true) {
            char c = s.charAt(i++);
            if (c == '"') { return b.toString(); }
            if (c == '\\') {
                char e = s.charAt(i++);
                switch (e) {
                    case 'n': b.append('\n'); break;
                    case 't': b.append('\t'); break;
                    case 'r': b.append('\r'); break;
                    case 'b': b.append('\b'); break;
                    case 'f': b.append('\f'); break;
                    case 'u': b.append((char) Integer.parseInt(s.substring(i, i + 4), 16)); i += 4; break;
                    default: b.append(e);
                }
            } else {
                b.append(c);
            }
        }
    }

    private Object number() {
        int st = i;
        while (i < s.length() && "+-0123456789.eE".indexOf(s.charAt(i)) >= 0) { i++; }
        String n = s.substring(st, i);
        if (n.isEmpty()) { throw new IllegalArgumentException("Unexpected character at " + st); }
        try {
            return n.contains(".") || n.contains("e") || n.contains("E") ? (Object) Double.valueOf(n) : (Object) Long.valueOf(n);
        } catch (NumberFormatException ex) {
            throw new IllegalArgumentException("Bad number " + n);
        }
    }

    /* ---------------- writing ---------------- */
    static String write(Object o) {
        StringBuilder b = new StringBuilder();
        write(o, b);
        return b.toString();
    }

    @SuppressWarnings("unchecked")
    private static void write(Object o, StringBuilder b) {
        if (o == null) { b.append("null"); } else if (o instanceof String) { quote((String) o, b); } else if (o instanceof Boolean || o instanceof Number) { b.append(o.toString()); } else if (o instanceof Map) {
            b.append('{');
            boolean first = true;
            for (Map.Entry<String, Object> e : ((Map<String, Object>) o).entrySet()) {
                if (!first) { b.append(','); }
                first = false;
                quote(String.valueOf(e.getKey()), b);
                b.append(':');
                write(e.getValue(), b);
            }
            b.append('}');
        } else if (o instanceof Iterable) {
            b.append('[');
            boolean first = true;
            for (Object x : (Iterable<Object>) o) {
                if (!first) { b.append(','); }
                first = false;
                write(x, b);
            }
            b.append(']');
        } else { quote(o.toString(), b); }
    }

    private static void quote(String v, StringBuilder b) {
        b.append('"');
        for (int k = 0; k < v.length(); k++) {
            char c = v.charAt(k);
            switch (c) {
                case '"': b.append("\\\""); break;
                case '\\': b.append("\\\\"); break;
                case '\n': b.append("\\n"); break;
                case '\r': b.append("\\r"); break;
                case '\t': b.append("\\t"); break;
                case '<': b.append("\\u003c"); break;     /* safe to inline inside <script> */
                case '>': b.append("\\u003e"); break;
                case '&': b.append("\\u0026"); break;
                case ' ': b.append("\\u2028"); break;
                case ' ': b.append("\\u2029"); break;
                default:
                    if (c < 0x20) { b.append(String.format("\\u%04x", (int) c)); } else { b.append(c); }
            }
        }
        b.append('"');
    }
}
