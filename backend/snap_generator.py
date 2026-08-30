import asyncio
from pathlib import Path
from playwright.async_api import async_playwright

OUTPUT_FILE = Path(__file__).parent / "screenshots" / "09_vedic_themed_generator.png"
OUTPUT_FILE.parent.mkdir(exist_ok=True)

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page(viewport={"width": 1440, "height": 900})
        await page.goto("http://localhost:3000/login", wait_until="networkidle")
        await page.fill("#email", "Admin_DSVV01")
        await page.fill("#password", "OmBhBS@123")
        await page.click('button[type="submit"]')
        await page.wait_for_url("**/admin", timeout=10000)
        await page.click('button:has-text("Generate Exam")')
        await page.wait_for_timeout(1200)
        await page.screenshot(path=str(OUTPUT_FILE))
        await browser.close()
    print("Saved screenshot to:", OUTPUT_FILE)

if __name__ == "__main__":
    asyncio.run(main())
