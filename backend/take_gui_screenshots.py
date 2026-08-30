import asyncio
from pathlib import Path
from playwright.async_api import async_playwright

OUTPUT_DIR = Path(__file__).parent / "screenshots"
OUTPUT_DIR.mkdir(exist_ok=True)

CHROME_PATH = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
if not Path(CHROME_PATH).exists():
    CHROME_PATH = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"

async def main():
    print(f"Capturing screenshots to: {OUTPUT_DIR.resolve()}")
    async with async_playwright() as p:
        browser = await p.chromium.launch(executable_path=CHROME_PATH, headless=True)
        context = await browser.new_context(viewport={"width": 1440, "height": 900}, device_scale_factor=1.5)
        page = await context.new_page()

        # 1. Login Page
        print("1. Login Page...")
        await page.goto("http://localhost:3000/login", wait_until="networkidle")
        await page.wait_for_timeout(800)
        await page.screenshot(path=str(OUTPUT_DIR / "01_login.png"), full_page=True)

        # 2. Login as Admin
        print("2. Admin Dashboard...")
        await page.fill('input[type="text"]', "Admin_DSVV01")
        await page.fill('input[type="password"]', "OmBhBS@123")
        await page.click('button[type="submit"]')
        await page.wait_for_url("**/admin", timeout=12000)
        await page.wait_for_timeout(1200)
        await page.screenshot(path=str(OUTPUT_DIR / "02_admin_dashboard.png"), full_page=True)

        # 3. JSON Import Tab (Aayat)
        print("3. JSON Import Tab...")
        await page.click('button:has-text("JSON Import")')
        await page.wait_for_timeout(800)
        await page.screenshot(path=str(OUTPUT_DIR / "03_admin_json_import.png"), full_page=True)

        # 4. Rendered Question Paper & Answer Key
        print("4. Rendered Paper from JSON...")
        await page.click('button:has-text("Generate & Render Question Paper")')
        await page.wait_for_timeout(1200)
        await page.screenshot(path=str(OUTPUT_DIR / "04_rendered_paper.png"), full_page=True)

        print("5. Answer Key view...")
        await page.click('button:has-text("Answer Key & Solutions")')
        await page.wait_for_timeout(800)
        await page.screenshot(path=str(OUTPUT_DIR / "05_answer_key_view.png"), full_page=True)

        # 6. Library & PDF dropzones
        print("6. Library Upload Tab...")
        await page.click('button:has-text("Syllabus Library")')
        await page.wait_for_timeout(800)
        await page.screenshot(path=str(OUTPUT_DIR / "06_library_upload.png"), full_page=True)

        print("7. Web Search with PDF Dropzone...")
        await page.click('button:has-text("Web & Online URL")')
        await page.wait_for_timeout(600)
        await page.screenshot(path=str(OUTPUT_DIR / "07_web_search_pdf_dropzone.png"), full_page=True)

        print("8. Custom Topics with PDF Dropzone...")
        await page.click('button:has-text("Custom Topics & Quiz")')
        await page.wait_for_timeout(600)
        await page.screenshot(path=str(OUTPUT_DIR / "08_custom_topics_pdf_dropzone.png"), full_page=True)

        # 9. Rachna (Generate Exam)
        print("9. Rachna Generator Panel...")
        await page.click('button:has-text("Generate Exam")')
        await page.wait_for_timeout(800)
        await page.screenshot(path=str(OUTPUT_DIR / "09_generate_exam_panel.png"), full_page=True)

        # 10. Shishya Manager (Students & Cohorts)
        print("10. Shishya Manager...")
        await page.click('button:has-text("Students & Cohorts")')
        await page.wait_for_timeout(800)
        await page.screenshot(path=str(OUTPUT_DIR / "10_admin_shishyas.png"), full_page=True)

        # 11. Prakashan Publishes Hub
        print("11. Prakashan Hub...")
        await page.click('button:has-text("Publishes")')
        await page.wait_for_timeout(800)
        await page.screenshot(path=str(OUTPUT_DIR / "11_admin_publishes.png"), full_page=True)

        # 12. Student Portal
        print("12. Logging in as Student...")
        await page.goto("http://localhost:3000/login", wait_until="networkidle")
        await page.click('button:has-text("Shishya (Student)")')
        await page.fill('input[placeholder*="Scholar"]', "2410852")
        await page.fill('input[type="password"]', "student@dsvv123")
        await page.click('button[type="submit"]')
        await page.wait_for_url("**/student", timeout=12000)
        await page.wait_for_timeout(1200)
        await page.screenshot(path=str(OUTPUT_DIR / "12_student_dashboard.png"), full_page=True)

        print("13. Student Quiz Arena...")
        await page.click('button:has-text("Quiz Arena")')
        await page.wait_for_timeout(800)
        await page.screenshot(path=str(OUTPUT_DIR / "13_student_quiz_arena.png"), full_page=True)

        await browser.close()
        print("🎉 Successfully captured all GUI screenshots!")

if __name__ == "__main__":
    asyncio.run(main())
