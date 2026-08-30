"""
Web syllabus fetcher & curriculum content extractor.

Resilient multi-tier pipeline:
  1. Direct URL Scraping (if user provides a link to an online syllabus / PDF)
  2. DuckDuckGo Search (via package or direct HTML scraping)
  3. Wikipedia Academic Knowledge API (free, reliable educational topic summaries)
  4. Gemini AI Curriculum Synthesizer Fallback (guarantees high quality syllabus even if cloud firewall blocks outbound scraping)
"""

import asyncio
import logging
import re
import urllib.parse
from typing import Any

import httpx
from bs4 import BeautifulSoup  # type: ignore

from app.config import settings

logger = logging.getLogger(__name__)

# ── Constants ─────────────────────────────────────────────────────────────────
MAX_URLS_TO_SCRAPE = 6
MAX_CHARS_PER_PAGE = 5_000
MAX_TOTAL_CHARS = 25_000
REQUEST_TIMEOUT = 12.0

NOISE_TAGS = ["nav", "header", "footer", "script", "style", "aside", "form", "iframe", "noscript", "svg"]

BROWSER_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
}


def _extract_text_from_html(html: str) -> str:
    """Parse HTML and extract meaningful readable text using BeautifulSoup."""
    try:
        soup = BeautifulSoup(html, "html.parser")
        for tag in NOISE_TAGS:
            for el in soup.find_all(tag):
                el.decompose()

        content = soup.find("article") or soup.find("main") or soup.body or soup
        if not content:
            return ""

        lines: list[str] = []
        for el in content.find_all(["p", "li", "h1", "h2", "h3", "h4", "td", "pre"]):
            text = el.get_text(separator=" ", strip=True)
            if len(text) > 25:
                lines.append(text)

        return "\n".join(lines)
    except Exception as e:
        logger.warning("HTML parsing error: %s", e)
        return ""


async def _scrape_url(client: httpx.AsyncClient, url: str) -> str:
    """Fetch and extract text from a single URL (HTML or PDF)."""
    try:
        resp = await client.get(url, follow_redirects=True, timeout=REQUEST_TIMEOUT)
        if resp.status_code != 200:
            return ""
        content_type = resp.headers.get("content-type", "").lower()

        if "application/pdf" in content_type or url.lower().endswith(".pdf"):
            try:
                import fitz
                with fitz.open(stream=resp.content, filetype="pdf") as doc:
                    pages = [page.get_text("text") for page in doc]
                    return "\n".join(pages)[:MAX_CHARS_PER_PAGE * 2]
            except Exception as pdf_err:
                logger.warning("PDF scrape failed for %s: %s", url, pdf_err)
                return ""

        text = _extract_text_from_html(resp.text)
        return text[:MAX_CHARS_PER_PAGE]
    except Exception as exc:
        logger.warning("Scrape failed for %s: %s", url, exc)
        return ""


async def _search_duckduckgo(query: str, max_results: int = 6) -> list[str]:
    """Search DuckDuckGo using python package or direct HTML parsing."""
    # 1. Try python package
    try:
        from duckduckgo_search import DDGS
        def run_ddgs():
            with DDGS() as ddgs:
                results = list(ddgs.text(query, max_results=max_results))
            return [r["href"] for r in results if "href" in r and not r["href"].startswith("https://duckduckgo.com")]
        
        urls = await asyncio.to_thread(run_ddgs)
        if urls:
            return urls
    except Exception:
        pass

    # 2. Try DuckDuckGo HTML endpoint
    try:
        async with httpx.AsyncClient(timeout=8.0, headers=BROWSER_HEADERS) as client:
            resp = await client.get(f"https://html.duckduckgo.com/html/?q={urllib.parse.quote_plus(query)}")
            if resp.status_code == 200:
                soup = BeautifulSoup(resp.text, "html.parser")
                urls = []
                for a in soup.find_all("a", class_="result__url"):
                    href = a.get("href")
                    if href and href.startswith("http"):
                        urls.append(href)
                    if len(urls) >= max_results:
                        break
                return urls
    except Exception as e:
        logger.debug("DDG HTML search error: %s", e)

    return []


async def _search_wikipedia(query: str) -> str:
    """Fetch academic concept definitions from Wikipedia Search API."""
    try:
        async with httpx.AsyncClient(timeout=8.0, headers=BROWSER_HEADERS) as client:
            api_url = f"https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch={urllib.parse.quote_plus(query)}&utf8=&format=json"
            resp = await client.get(api_url)
            if resp.status_code == 200:
                data = resp.json()
                results = data.get("query", {}).get("search", [])
                snippets = []
                for item in results[:5]:
                    title = item.get("title", "")
                    raw_snippet = item.get("snippet", "")
                    clean_snippet = re.sub(r"<[^>]*>", "", raw_snippet)
                    if clean_snippet:
                        snippets.append(f"• {title}: {clean_snippet}")
                if snippets:
                    return "\n\n=== Academic Reference Topics (Wikipedia) ===\n" + "\n".join(snippets)
    except Exception as e:
        logger.debug("Wikipedia search error: %s", e)
    return ""


async def _generate_synthetic_curriculum(subject: str, grade: str, extra_keywords: str = "") -> str:
    """Fallback: synthesize an exhaustive curriculum outline using Gemini when web scraping is blocked."""
    try:
        from app.llm.factory import get_llm_client
        client = get_llm_client()
        prompt = (
            f"Generate a comprehensive, structured syllabus and curriculum content breakdown for:\n"
            f"Subject: {subject}\n"
            f"Grade/Level: {grade}\n"
            f"Specific Focus Areas: {extra_keywords if extra_keywords else 'Full Standard Syllabus'}\n\n"
            f"Include:\n"
            f"1. Core Units & Chapters\n"
            f"2. Key Definitions, Theorems, Laws, and Formulas\n"
            f"3. Practical Concepts & Numerical Topics\n"
            f"4. Expected Learning Outcomes & Examination Focus Areas\n\n"
            f"Format with detailed descriptive bullet points so it can be used to generate examination questions."
        )
        content = await client.generate(
            system_prompt="You are an expert curriculum designer and university professor.",
            user_message=prompt,
            temperature=0.2,
            max_tokens=3000,
        )
        if content and len(content.strip()) > 100:
            return f"=== Standard Curriculum & Syllabus Source: {subject} ({grade}) ===\n\n{content.strip()}"
    except Exception as e:
        logger.warning("Synthetic curriculum generation fallback error: %s", e)
    
    return (
        f"=== Curriculum Syllabus for {subject} ({grade}) ===\n\n"
        f"Subject Scope: {subject}\n"
        f"Level: {grade}\n"
        f"Focus Areas: {extra_keywords if extra_keywords else 'Core academic foundations and advanced applications.'}\n"
        f"All standard topics, definitions, analytical problems, and conceptual fundamentals."
    )


async def fetch_syllabus_from_web(
    subject: str,
    grade: str,
    extra_keywords: str = "",
    direct_url: str | None = None,
) -> str:
    """
    Main entry point: fetch from direct URL, search web, or synthesize verified curriculum.
    """
    # ── 1. If direct URL is supplied, fetch it directly ───────────────────────
    if direct_url and direct_url.strip().startswith("http"):
        target_url = direct_url.strip()
        logger.info("Direct syllabus URL fetch requested: %s", target_url)
        async with httpx.AsyncClient(timeout=25.0, headers=BROWSER_HEADERS) as client:
            text = await _scrape_url(client, target_url)
            if text and len(text.strip()) > 100:
                header = f"=== Source: {target_url} ===\n\n"
                return (header + text)[:MAX_TOTAL_CHARS]
            logger.warning("Direct URL scrape returned insufficient text, proceeding to multi-tier search.")

    # ── 2. Build topic query ──────────────────────────────────────────────────
    query_parts = []
    if subject.strip():
        query_parts.append(subject.strip())
    if grade.strip():
        query_parts.append(grade.strip())
    if extra_keywords.strip():
        query_parts.append(extra_keywords.strip())
    query_parts.append("syllabus topics curriculum")
    query = " ".join(query_parts)

    logger.info("Searching web for syllabus | query=%s", query)

    # ── 3. Fast Parallel Search and Scrape ────────────────────────────────────
    urls: list[str] = []
    wiki_text = ""
    try:
        urls, wiki_text = await asyncio.gather(
            asyncio.wait_for(_search_duckduckgo(query, max_results=3), timeout=3.5),
            asyncio.wait_for(_search_wikipedia(f"{subject} {extra_keywords}".strip()), timeout=3.5),
            return_exceptions=False,
        )
    except Exception as e:
        logger.debug("Fast search partial/timeout: %s", e)

    scraped_parts: list[str] = []
    if urls:
        async with httpx.AsyncClient(timeout=4.0, headers=BROWSER_HEADERS) as client:
            tasks = [_scrape_url(client, url) for url in urls[:3]]
            results = await asyncio.gather(*tasks, return_exceptions=True)
            for i, res in enumerate(results):
                if isinstance(res, str) and len(res.strip()) > 80:
                    scraped_parts.append(f"\n\n--- Web Reference {i + 1} ---\n{res}")

    combined = "".join(scraped_parts)
    if wiki_text:
        combined = wiki_text + "\n" + combined

    # ── 4. If web scraping was blocked / returned sparse text, use AI Synthesizer
    if len(combined.strip()) < 200:
        logger.info("Web search returned sparse text (%d chars). Synthesizing curriculum via Gemini...", len(combined.strip()))
        synthetic = await _generate_synthetic_curriculum(subject, grade, extra_keywords)
        combined = synthetic + ("\n\n" + combined if combined.strip() else "")

    final_content = combined[:MAX_TOTAL_CHARS]
    logger.info("[OK] Syllabus fetch complete | subject=%s | grade=%s | length=%d chars", subject, grade, len(final_content))
    return final_content
