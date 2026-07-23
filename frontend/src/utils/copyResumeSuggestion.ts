/** Leading list markers only — mid-line skill separators (•) are left alone. */
const LEADING_BULLET = /^\s*(?:[•·●▪◦]\s*|[-*–—]\s+|\d+[.)]\s+)(.*)$/;

/** Skills-style "Category – items" (short label before an en/em/hyphen dash). */
const SKILLS_CATEGORY = /^(.{1,40}?)\s*[–—-]\s+(.+)$/;

/** Body text: force normal weight + near-black so paste doesn't inherit bold blue. */
const BODY_STYLE = "font-weight:normal;color:#1F1F1F";
/** Category labels on the skills resume (bold slate). */
const CATEGORY_STYLE = "font-weight:bold;color:#4B6A88";

function escapeHtml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function stripLeadingBullet(line: string): string {
  const match = line.match(LEADING_BULLET);
  if (match?.[1] !== undefined) {
    return match[1].trimEnd();
  }
  return line.trimEnd();
}

function formatLineHtml(text: string, section?: string): string {
  if (section === "skills") {
    const categoryMatch = text.match(SKILLS_CATEGORY);
    if (categoryMatch?.[1] !== undefined && categoryMatch[2] !== undefined) {
      const label = categoryMatch[1].trim();
      if (!label.includes("•") && label.split(/\s+/).length <= 6) {
        return (
          `<span style="${CATEGORY_STYLE}">${escapeHtml(label)}</span>` +
          `<span style="${BODY_STYLE}"> – ${escapeHtml(categoryMatch[2])}</span>`
        );
      }
    }
  }
  return `<span style="${BODY_STYLE}">${escapeHtml(text)}</span>`;
}

export type FormattedSuggestionClipboard = {
  plain: string;
  html: string;
};

/**
 * Prepare suggestion text for pasting into an existing Word list.
 *
 * - Strip leading bullets (avoid double bullets)
 * - No trailing newline (avoids an extra empty bullet)
 * - HTML uses one div per line (not ul/li) so Word maps lines onto existing
 *   list items without nesting or a leftover empty bullet
 * - Explicit span styles so skills don't inherit bold/blue from the selection
 */
export function formatSuggestionForClipboard(
  text: string,
  section?: string,
): FormattedSuggestionClipboard {
  const plain = text
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => (line.trim() ? stripLeadingBullet(line) : ""))
    .join("\n")
    .replace(/^\n+|\n+$/g, "");

  const strippedLines = plain.length > 0 ? plain.split("\n") : [];
  const htmlBody = strippedLines
    .map((line) =>
      line
        ? `<div style="${BODY_STYLE}">${formatLineHtml(line, section)}</div>`
        : "<div><br></div>",
    )
    .join("");

  // StartFragment/EndFragment helps Word treat this as inline paste content.
  const html = `<html><body><!--StartFragment-->${htmlBody}<!--EndFragment--></body></html>`;

  return { plain, html };
}

/** Copy suggestion as text/html + text/plain for Word-friendly paste. */
export async function copyResumeSuggestion(
  text: string,
  section?: string,
): Promise<void> {
  const { plain, html } = formatSuggestionForClipboard(text, section);

  try {
    const item = new ClipboardItem({
      "text/plain": new Blob([plain], { type: "text/plain" }),
      "text/html": new Blob([html], { type: "text/html" }),
    });
    await navigator.clipboard.write([item]);
  } catch {
    await navigator.clipboard.writeText(plain);
  }
}
