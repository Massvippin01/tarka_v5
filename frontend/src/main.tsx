import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// UI-1 Item 5 Dev Guard: scan and console.error when "undefined" or "NaN" is rendered
if (import.meta.env.DEV && typeof window !== "undefined") {
  const scanForRenderedAnomalies = () => {
    if (!document.body) return;
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: (node) => {
          const parent = node.parentElement;
          if (!parent) return NodeFilter.FILTER_REJECT;
          const tag = parent.tagName;
          if (tag === "SCRIPT" || tag === "STYLE" || tag === "NOSCRIPT") return NodeFilter.FILTER_REJECT;
          return NodeFilter.FILTER_ACCEPT;
        },
      }
    );

    let currentNode = walker.nextNode();
    while (currentNode) {
      const val = currentNode.nodeValue || "";
      if (/\bundefined\b/.test(val) || /\bNaN\b/.test(val)) {
        const parent = currentNode.parentElement;
        if (!parent?.closest("pre, code, textarea")) {
          console.error(
            `[TARKA DEV GUARD] Rendered forbidden string ("undefined" or "NaN") detected in DOM: "${val.trim()}" inside <${parent?.tagName.toLowerCase()}>`,
            parent
          );
        }
      }
      currentNode = walker.nextNode();
    }
  };

  const observer = new MutationObserver(() => {
    scanForRenderedAnomalies();
  });

  window.addEventListener("DOMContentLoaded", () => {
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    scanForRenderedAnomalies();
  });
  if (document.body) {
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
