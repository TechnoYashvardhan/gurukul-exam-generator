import asyncio
from pathlib import Path
from playwright.async_api import async_playwright

OUTPUT_DIR = Path(__file__).parent / "screenshots"
OUTPUT_DIR.mkdir(exist_ok=True)

CHROME_PATH = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
if not Path(CHROME_PATH).exists():
    CHROME_PATH = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"

async def main():
    print(f"Using browser: {CHROME_PATH}")
    async with async_playwright() as p:
        browser = await p.chromium.launch(executable_path=CHROME_PATH, headless=True)
        context = await browser.new_context(viewport={"width": 1440, "height": 900}, device_scale_factor=1.5)
        page = await context.new_page()

        # 1. Student Login
        print("1. Logging into Student Portal...")
        await page.goto("http://localhost:3000/login", wait_until="networkidle")
        await page.fill('#email', "2410852")
        await page.fill('#password', "student@dsvv123")
        await page.click('button[type="submit"]')
        await page.wait_for_url("**/student", timeout=12000)
        await page.wait_for_timeout(1500)
        await page.screenshot(path=str(OUTPUT_DIR / "12_student_dashboard.png"), full_page=True)

        # 2. Student Quiz Arena
        print("2. Student Quiz Arena...")
        await page.click('button:has-text("Quiz Arena")')
        await page.wait_for_timeout(1000)
        await page.screenshot(path=str(OUTPUT_DIR / "13_student_quiz_arena.png"), full_page=True)

        # 3. Open Quiz Player
        print("3. Opening Quiz Player...")
        attempt_btn = page.locator('button:has-text("Attempt Quiz"), button:has-text("Retake Quiz"), button:has-text("Start Quiz Now")').first
        if await attempt_btn.count() > 0:
            await attempt_btn.click()
            await page.wait_for_timeout(1500)
            await page.screenshot(path=str(OUTPUT_DIR / "14_student_quiz_player.png"), full_page=True)

        await browser.close()
        print("🎉 Student portal screenshots captured successfully!")

if __name__ == "__main__":
    asyncio.run(main())
