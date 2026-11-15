"use client";

import { useEffect } from "react";
import { isBaseLang, type Lang } from "@/lib/i18n";

/**
 * ترجمة آلية للصفحة كلها عندما تكون اللغة غير العربية/الإنجليزية.
 * النص الأصلي (إنجليزي) يخرج من الخادم كالمعتاد، ثم نستبدله بترجمته من /api/translate
 * (مخزّنة في قاعدة البيانات ومحلياً في المتصفح). كل ما عليه translate="no" يُترك كما هو.
 */

const ATTRS = ["placeholder", "title", "aria-label", "alt"] as const;
const SKIP = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "CODE", "PRE", "TEXTAREA"]);
const HAS_LETTER = /\p{L}/u;
const CHUNK = 50;
const MAX_CACHE = 4000;

type Target = { apply: (text: string) => void; isCurrent: (key: string) => boolean };

export default function AutoTranslate({ lang }: { lang: Lang }) {
  useEffect(() => {
    if (isBaseLang(lang)) return;

    const storeKey = `waynha-tr-${lang}`;
    const cache = new Map<string, string>();
    try {
      const saved = JSON.parse(localStorage.getItem(storeKey) ?? "{}") as Record<string, string>;
      for (const [k, v] of Object.entries(saved)) cache.set(k, v);
    } catch {
      // تخزين محظور: نكتفي بذاكرة الصفحة
    }
    const persist = () => {
      try {
        const entries = [...cache.entries()].slice(-MAX_CACHE);
        localStorage.setItem(storeKey, JSON.stringify(Object.fromEntries(entries)));
      } catch {
        // تجاهل
      }
    };

    const appliedText = new WeakMap<Node, string>();
    const appliedAttr = new WeakMap<Element, Record<string, string>>();
    const pending = new Map<string, Target[]>();
    let timer: ReturnType<typeof setTimeout> | undefined;
    let stopped = false;

    const skipped = (el: Element | null) => !el || SKIP.has(el.tagName) || Boolean(el.closest('[translate="no"]'));

    const queue = (key: string, target: Target) => {
      const cached = cache.get(key);
      if (cached) return target.apply(cached);
      const list = pending.get(key);
      if (list) list.push(target);
      else pending.set(key, [target]);
      clearTimeout(timer);
      timer = setTimeout(flush, 120);
    };

    const scanText = (node: Text) => {
      const value = node.nodeValue ?? "";
      if (appliedText.get(node) === value) return;
      const key = value.trim();
      if (key.length < 2 || !HAS_LETTER.test(key) || skipped(node.parentElement)) return;
      const lead = value.slice(0, value.indexOf(key));
      const tail = value.slice(lead.length + key.length);
      queue(key, {
        isCurrent: (k) => node.isConnected && (node.nodeValue ?? "").trim() === k,
        apply: (text) => {
          const next = lead + text + tail;
          appliedText.set(node, next);
          node.nodeValue = next;
        },
      });
    };

    const scanElement = (el: Element) => {
      if (skipped(el)) return;
      for (const name of ATTRS) {
        const value = el.getAttribute(name);
        if (!value || appliedAttr.get(el)?.[name] === value) continue;
        const key = value.trim();
        if (key.length < 2 || !HAS_LETTER.test(key)) continue;
        queue(key, {
          isCurrent: (k) => el.isConnected && (el.getAttribute(name) ?? "").trim() === k,
          apply: (text) => {
            appliedAttr.set(el, { ...appliedAttr.get(el), [name]: text });
            el.setAttribute(name, text);
          },
        });
      }
    };

    const scan = (root: Node) => {
      if (root.nodeType === Node.TEXT_NODE) return scanText(root as Text);
      if (root.nodeType !== Node.ELEMENT_NODE) return;
      const el = root as Element;
      if (skipped(el)) return;
      scanElement(el);
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
      for (let n = walker.nextNode(); n; n = walker.nextNode()) {
        if (n.nodeType === Node.TEXT_NODE) scanText(n as Text);
        else scanElement(n as Element);
      }
    };

    async function flush() {
      if (stopped || pending.size === 0) return;
      const batch = [...pending.entries()];
      pending.clear();
      for (let i = 0; i < batch.length; i += CHUNK) {
        const part = batch.slice(i, i + CHUNK);
        try {
          const res = await fetch("/api/translate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ lang, texts: part.map(([key]) => key) }),
          });
          if (!res.ok) continue; // نترك النص الأصلي إن تعذّرت الترجمة
          const { translations } = (await res.json()) as { translations: string[] };
          part.forEach(([key, targets], index) => {
            const text = translations[index];
            if (!text || stopped) return;
            cache.set(key, text);
            for (const target of targets) if (target.isCurrent(key)) target.apply(text);
          });
          persist();
        } catch {
          // شبكة غير متاحة: نترك النص الأصلي
        }
      }
    }

    scan(document.body);
    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.type === "childList") m.addedNodes.forEach(scan);
        else if (m.type === "characterData") scan(m.target);
        else if (m.type === "attributes") scanElement(m.target as Element);
      }
    });
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: [...ATTRS],
    });

    return () => {
      stopped = true;
      clearTimeout(timer);
      observer.disconnect();
    };
  }, [lang]);

  return null;
}
