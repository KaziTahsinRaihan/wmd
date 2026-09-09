// Rich-paste support for teacher-authored "pasted" sections. Teachers paste
// straight from Word / Google Docs / a web page and the formatting survives:
// bold/italic, font family & size, indentation, lists, and real tables with
// merged rows/columns (rowspan/colspan). The pasted HTML is sanitized to a
// safe whitelist; "12_____" placeholders keep working anywhere in the content,
// including inside table cells.

/** Tags kept when sanitizing pasted HTML. Everything else is unwrapped. */
const ALLOWED_TAGS = new Set([
  "P",
  "DIV",
  "SPAN",
  "BR",
  "B",
  "STRONG",
  "I",
  "EM",
  "U",
  "S",
  "SUB",
  "SUP",
  "H1",
  "H2",
  "H3",
  "H4",
  "H5",
  "H6",
  "UL",
  "OL",
  "LI",
  "BLOCKQUOTE",
  "TABLE",
  "THEAD",
  "TBODY",
  "TFOOT",
  "TR",
  "TD",
  "TH",
  "COLGROUP",
  "COL",
]);

/** Tags removed together with their content. */
const DROPPED_TAGS = new Set(["SCRIPT", "STYLE", "HEAD", "META", "LINK", "TITLE", "IFRAME", "OBJECT", "EMBED"]);

/** Inline style properties kept on pasted elements. */
const ALLOWED_STYLES = new Set([
  "font-size",
  "font-weight",
  "font-style",
  "font-family",
  "text-align",
  "text-decoration",
  "text-indent",
  "margin-left",
  "padding-left",
  "vertical-align",
]);

/**
 * Sanitize pasted HTML to the whitelist above. Keeps rowspan/colspan so
 * merged table cells survive. Browser-only (uses DOMParser).
 */
export function sanitizeHtml(html: string): string {
  if (typeof window === "undefined") return html;
  const doc = new DOMParser().parseFromString(html, "text/html");

  const clean = (node: Element) => {
    for (const child of [...node.children]) {
      if (DROPPED_TAGS.has(child.tagName)) {
        child.remove();
        continue;
      }
      clean(child);
      if (!ALLOWED_TAGS.has(child.tagName)) {
        // Unwrap: keep the children, drop the tag itself.
        child.replaceWith(...child.childNodes);
        continue;
      }
      const keepSpan = child.getAttribute("colspan");
      const keepRow = child.getAttribute("rowspan");
      const style = child.getAttribute("style") ?? "";
      for (const attr of [...child.attributes]) child.removeAttribute(attr.name);
      if (keepSpan && (child.tagName === "TD" || child.tagName === "TH")) child.setAttribute("colspan", keepSpan);
      if (keepRow && (child.tagName === "TD" || child.tagName === "TH")) child.setAttribute("rowspan", keepRow);
      const kept = style
        .split(";")
        .map((rule) => {
          const [prop, ...rest] = rule.split(":");
          const p = (prop ?? "").trim().toLowerCase();
          const v = rest.join(":").trim();
          return ALLOWED_STYLES.has(p) && v && !/url\s*\(|expression/i.test(v) ? `${p}: ${v}` : null;
        })
        .filter(Boolean)
        .join("; ");
      if (kept) child.setAttribute("style", kept);
    }
  };
  clean(doc.body);
  return doc.body.innerHTML;
}

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Legacy plain text (blank-line paragraphs) → simple HTML for the editor. */
export function textToHtml(text: string | undefined): string {
  return (text ?? "")
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${escapeHtml(p).replace(/\n/g, "<br>")}</p>`)
    .join("");
}

/**
 * HTML → plain text for question-number detection ("12_____"). Regex-based so
 * it is safe on the server too. Block-level tags become line breaks so numbers
 * in adjacent table cells never merge.
 */
export function htmlToPlainText(html: string): string {
  return html
    .replace(/<(br|\/p|\/div|\/li|\/h[1-6]|\/td|\/th|\/tr|\/table|\/blockquote)[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&quot;/gi, '"');
}
