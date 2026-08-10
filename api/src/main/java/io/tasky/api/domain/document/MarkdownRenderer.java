package io.tasky.api.domain.document;

import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.regex.Pattern;

/**
 * Minimal, safe Markdown → HTML renderer. Input is escaped first so raw HTML is
 * never injected. Supports headings, bold/italic, inline code, fenced code,
 * lists, links, blockquotes and paragraphs — enough for feature documentation.
 */
@Component
public class MarkdownRenderer {

    private static final Pattern FENCE = Pattern.compile("^```(.*)$");
    private static final Pattern HEADING = Pattern.compile("^(#{1,6})\\s+(.*)$");
    private static final Pattern BULLET = Pattern.compile("^\\s*[-*]\\s+(.*)$");
    private static final Pattern NUMBERED = Pattern.compile("^\\s*\\d+\\.\\s+(.*)$");
    private static final Pattern QUOTE = Pattern.compile("^>\\s?(.*)$");
    private static final Pattern HR = Pattern.compile("^\\s*---\\s*$");
    private static final Pattern BOLD = Pattern.compile("\\*\\*(.+?)\\*\\*");
    private static final Pattern ITALIC = Pattern.compile("(?<!\\*)\\*([^*\\n]+)\\*(?!\\*)");
    private static final Pattern CODE = Pattern.compile("`([^`\\n]+)`");
    private static final Pattern LINK = Pattern.compile("\\[([^\\]]+)]\\(([^)\\s]+)\\)");

    public String render(String title, String markdown) {
        StringBuilder html = new StringBuilder();
        html.append("<!DOCTYPE html><html lang=\"pt-BR\"><head><meta charset=\"utf-8\">")
            .append("<title>").append(escape(title)).append("</title>")
            .append("<style>body{font-family:system-ui,sans-serif;max-width:820px;margin:2rem auto;padding:0 1rem;color:#1f2937;line-height:1.6}h1,h2,h3{margin-top:1.6rem}pre{background:#f3f4f6;padding:1rem;border-radius:8px;overflow-x:auto}code{background:#f3f4f6;padding:0.1rem 0.3rem;border-radius:4px}pre code{background:none;padding:0}blockquote{border-left:3px solid #e5e7eb;margin:1rem 0;padding-left:1rem;color:#6b7280}hr{border:none;border-top:1px solid #e5e7eb;margin:2rem 0}li{margin:0.25rem 0}table{border-collapse:collapse;width:100%}td,th{border:1px solid #e5e7eb;padding:0.4rem 0.6rem}img{max-width:100%}</style></head><body>");

        List<String> lines = markdown.split("\n", -1).length == 0
                ? List.of()
                : List.of(markdown.split("\n", -1));
        boolean inCodeBlock = false;
        List<String> listBuffer = null;
        String listTag = null;

        for (String rawLine : lines) {
            String line = rawLine;
            if (inCodeBlock) {
                if (FENCE.matcher(line).matches()) {
                    html.append("</code></pre>");
                    inCodeBlock = false;
                } else {
                    html.append(escape(line)).append('\n');
                }
                continue;
            }
            if (FENCE.matcher(line).matches()) {
                flushList(html, listBuffer, listTag);
                listBuffer = null;
                listTag = null;
                html.append("<pre><code>");
                inCodeBlock = true;
                continue;
            }
            if (HR.matcher(line).matches()) {
                flushList(html, listBuffer, listTag);
                listBuffer = null;
                listTag = null;
                html.append("<hr/>");
                continue;
            }
            var heading = HEADING.matcher(line);
            if (heading.matches()) {
                flushList(html, listBuffer, listTag);
                listBuffer = null;
                listTag = null;
                int level = heading.group(1).length();
                html.append("<h").append(level).append('>').append(inline(heading.group(2)))
                    .append("</h").append(level).append('>');
                continue;
            }
            var bullet = BULLET.matcher(line);
            if (bullet.matches()) {
                pushItem(html, listBuffer, listTag, "ul", inline(bullet.group(1)));
                listBuffer = null;
                listTag = "ul";
                continue;
            }
            var numbered = NUMBERED.matcher(line);
            if (numbered.matches()) {
                pushItem(html, listBuffer, listTag, "ol", inline(numbered.group(1)));
                listBuffer = null;
                listTag = "ol";
                continue;
            }
            var quote = QUOTE.matcher(line);
            if (quote.matches()) {
                flushList(html, listBuffer, listTag);
                listBuffer = null;
                listTag = null;
                html.append("<blockquote>").append(inline(quote.group(1))).append("</blockquote>");
                continue;
            }
            flushList(html, listBuffer, listTag);
            listBuffer = null;
            listTag = null;
            if (line.isBlank()) continue;
            html.append("<p>").append(inline(line)).append("</p>");
        }
        flushList(html, listBuffer, listTag);
        html.append("</body></html>");
        return html.toString();
    }

    private void pushItem(StringBuilder html, List<String> buffer, String tag, String targetTag, String item) {
        if (buffer != null && tag != null && tag.equals(targetTag)) {
            buffer.add(item);
            return;
        }
        flushList(html, buffer, tag);
        buffer = new ArrayList<>();
        buffer.add(item);
    }

    private void flushList(StringBuilder html, List<String> buffer, String tag) {
        if (buffer == null || buffer.isEmpty()) return;
        html.append('<').append(tag).append('>');
        for (String item : buffer) {
            html.append("<li>").append(item).append("</li>");
        }
        html.append("</").append(tag).append('>');
        buffer.clear();
    }

    private String inline(String text) {
        String escaped = escape(text);
        escaped = LINK.matcher(escaped).replaceAll(mr ->
                "<a href=\"" + escape(mr.group(2)) + "\" rel=\"noopener noreferrer\">" + escape(mr.group(1)) + "</a>");
        escaped = CODE.matcher(escaped).replaceAll(mr -> "<code>" + escape(mr.group(1)) + "</code>");
        escaped = BOLD.matcher(escaped).replaceAll("<strong>$1</strong>");
        escaped = ITALIC.matcher(escaped).replaceAll("<em>$1</em>");
        return escaped;
    }

    private String escape(String value) {
        return value == null ? "" : value
                .replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;");
    }
}
