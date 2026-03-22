import { marked } from "marked";
import hljs from "highlight.js";

// HTML-escape for safe data attribute embedding
function escapeAttr(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// Custom renderer with syntax-highlighted code blocks
const renderer = new marked.Renderer();
renderer.code = function ({ text, lang }: { text: string; lang?: string }) {
  let highlighted: string;
  if (lang && hljs.getLanguage(lang)) {
    highlighted = hljs.highlight(text, { language: lang }).value;
  } else {
    highlighted = hljs.highlightAuto(text).value;
  }
  const langLabel = lang
    ? `<span class="code-lang">${lang}</span>`
    : "";
  return `<pre><div class="code-header">${langLabel}<button class="copy-btn" data-code="${escapeAttr(text)}">Copy</button></div><code class="hljs">${highlighted}</code></pre>`;
};

marked.setOptions({ breaks: true, gfm: true });
marked.use({ renderer });

export function renderMarkdown(text: string): string {
  return marked.parse(text) as string;
}

/** Event delegation handler for copy buttons inside code blocks */
export function handleProseClick(e: MouseEvent): void {
  const btn = (e.target as HTMLElement).closest(
    ".copy-btn"
  ) as HTMLButtonElement | null;
  if (!btn) return;
  const code = btn.getAttribute("data-code") || "";
  navigator.clipboard.writeText(code).then(() => {
    btn.textContent = "Copied!";
    btn.classList.add("copied");
    setTimeout(() => {
      btn.textContent = "Copy";
      btn.classList.remove("copied");
    }, 1500);
  });
}
