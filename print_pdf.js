import('puppeteer').then(async (puppeteer) => {
    const fs = require('fs');
    try {
        const browser = await puppeteer.default.launch({
            executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
        });
        const page = await browser.newPage();
        const html = fs.readFileSync('architecture.html', 'utf8');
        await page.setContent(html, { waitUntil: 'networkidle0' });
        await page.pdf({ path: 'architecture_workflow.pdf', format: 'A4', margin: {top: '20px', bottom: '20px', left: '20px', right: '20px'} });
        await browser.close();
        console.log('PDF generated');
    } catch (e) {
        console.error(e);
    }
});
