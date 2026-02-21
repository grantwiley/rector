const puppeteer = require('puppeteer');
const path = require('path');

async function convertHTMLToPDF(inputFile, outputFile) {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    
    const filePath = path.resolve(inputFile);
    await page.goto('file://' + filePath, {
        waitUntil: 'networkidle0'
    });
    
    await page.pdf({
        path: outputFile,
        width: '8.5in',
        height: '11in',
        printBackground: true,
        preferCSSPageSize: true
    });
    
    await browser.close();
    console.log(`Created: ${outputFile}`);
}

(async () => {
    try {
        await convertHTMLToPDF(
            'printouts/grant-weekly.html',
            'printouts/grant-weekly.pdf'
        );
        await convertHTMLToPDF(
            'printouts/carter-weekly.html', 
            'printouts/carter-weekly.pdf'
        );
        console.log('All PDFs created successfully!');
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
})();
