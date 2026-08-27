"""
SearXNG web syllabus fetcher.

Pipeline:
  1. Query SearXNG (self-hosted, open-source meta-search engine)
     with a structured syllabus query string
  2. Collect top-N result URLs
  3. Scrape each URL with httpx + BeautifulSoup
  4. Return concatenated plain text (trimmed to max_chars)

SearXNG must be running (see docker-compose.yml → searxng service).
No API key needed — it's self-hosted.

Rate limit: We query SearXNG at most once per request.
Scraping is limited to 5 URLs to keep response times acceptable.
"""

import logging
import re
from urllib.parse import urljoin

import httpx
from bs4 import BeautifulSoup  # type: ignore

from app.config import settings

logger = logging.getLogger(__name__)

# ── Constants ─────────────────────────────────────────────────────────────────
MAX_URLS_TO_SCRAPE = 8
MAX_CHARS_PER_PAGE = 5_000
MAX_TOTAL_CHARS = 20_000
REQUEST_TIMEOUT = 10.0

# Tags that contain useful syllabus text
CONTENT_TAGS = [
    "article", "main", "section",
    "div.content", "div.entry-content",
    "p", "li", "h1", "h2", "h3", "h4",
]

# Tags to strip (navigation noise)
NOISE_TAGS = ["nav", "header", "footer", "script", "style", "aside", "form", "iframe"]


def _build_query(subject: str, grade: str) -> str:
    """Build a SearXNG query optimised for finding syllabus content."""
    return f"{subject} {grade} syllabus curriculum topics chapters"


async def _searxng_search(query: str, num_results: int = 10) -> list[str]:
    """
    Hit DuckDuckGo (via duckduckgo_search) instead of SearXNG.
    This works locally on Windows without Docker!
    """
    try:
        from duckduckgo_search import DDGS
        import asyncio
        
        def run_search():
            with DDGS() as ddgs:
                results = list(ddgs.text(query, max_results=num_results))
            return [r["href"] for r in results if "href" in r]
            
        urls = await asyncio.to_thread(run_search)
        logger.info("DuckDuckGo returned %d results for query: %s", len(urls), query)
        return urls
    except Exception as exc:
        logger.warning("DuckDuckGo search failed: %s", exc)
        return []


def _extract_text_from_html(html: str, base_url: str) -> str:
    """
    Parse HTML and extract meaningful text using BeautifulSoup.
    Strips navigation, scripts, and other noise tags.
    """
    soup = BeautifulSoup(html, "html.parser")

    # Remove noise elements
    for tag in NOISE_TAGS:
        for el in soup.find_all(tag):
            el.decompose()

    # Prefer article/main content if present
    content = soup.find("article") or soup.find("main") or soup.body or soup

    if content is None:
        return ""

    # Extract text with newline separators for readability
    lines: list[str] = []
    for el in content.find_all(["p", "li", "h1", "h2", "h3", "h4", "td"]):
        text = el.get_text(separator=" ", strip=True)
        if len(text) > 30:  # skip trivially short lines
            lines.append(text)

    return "\n".join(lines)


async def _scrape_url(client: httpx.AsyncClient, url: str) -> str:
    """
    Fetch and parse a single URL. Returns empty string on failure.
    """
    try:
        resp = await client.get(url, follow_redirects=True)
        if resp.status_code != 200:
            return ""
        content_type = resp.headers.get("content-type", "")
        if "html" not in content_type:
            return ""
        text = _extract_text_from_html(resp.text, url)
        logger.debug("Scraped %s → %d chars", url, len(text))
        return text[:MAX_CHARS_PER_PAGE]
    except Exception as exc:
        logger.warning("Scrape failed for %s: %s", url, exc)
        return ""


async def fetch_syllabus_from_web(
    subject: str,
    grade: str,
    extra_keywords: str = "",
) -> str:
    """
    Main entry point: search SearXNG + scrape top results for syllabus content.

    Args:
        subject:          Subject name (e.g. "Physics").
        grade:            Grade level (e.g. "Grade 10").
        extra_keywords:   Optional extra search terms.

    Returns:
        Concatenated plain-text syllabus content (up to MAX_TOTAL_CHARS chars).
        Returns a descriptive error string if nothing useful is found.
    """
    query = _build_query(subject, grade)
    if extra_keywords:
        query = f"{query} {extra_keywords}"

    logger.info("Fetching syllabus from web | subject=%s | grade=%s", subject, grade)

    # ── Search ───────────────────────────────────────────────────────────────
    urls = await _searxng_search(query, num_results=MAX_URLS_TO_SCRAPE + 3)

    if not urls:
        return (
            f"No web results found for '{subject} {grade}'. "
            "The web search may have been rate-limited or blocked. "
            "Try uploading a document instead."
        )

    # ── Scrape concurrently ──────────────────────────────────────────────────
    import asyncio
    headers = {
        "User-Agent": (
            "Mozilla/5.0 (compatible; ExamGenBot/1.0; "
            "+https://github.com/examgen)"
        )
    }
    async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT, headers=headers) as client:
        tasks = [_scrape_url(client, url) for url in urls[:MAX_URLS_TO_SCRAPE]]
        results = await asyncio.gather(*tasks, return_exceptions=False)

    # ── Assemble ─────────────────────────────────────────────────────────────
    parts: list[str] = []
    total = 0
    for i, (url, text) in enumerate(zip(urls, results)):
        if not text:
            continue
        header = f"\n\n--- Source {i + 1}: {url} ---\n"
        parts.append(header + text)
        total += len(text)
        if total >= MAX_TOTAL_CHARS:
            break

    if not parts:
        return (
            f"Found URLs but could not extract readable content for "
            f"'{subject} {grade}'. The pages may require JavaScript. "
            "Try uploading a PDF instead."
        )

    combined = "".join(parts)[:MAX_TOTAL_CHARS]
    logger.info(
        "[OK] Web fetch complete | subject=%s | grade=%s | chars=%d",
        subject, grade, len(combined),
    )
    return combined
