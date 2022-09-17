const path = require('path')
const fs = require("fs-extra");
const sanitize = require("sanitize-filename");

const createHtmlPage = async (page, dest, title, scraper) => {
    await fs.ensureDir(dest)
    let html;
    if (scraper === 'nightmare') {
        /*await page
            .evaluate(() => document.documentElement.innerHTML)
            .then((html) => {
                fs.writeFileSync(path.join(__dirname, 'output.html'), html);
                return nightmare.end();
            })*/

        await page
            .evaluate(() => document.querySelector('html')
                .outerHTML)
            .then(async html => {
                // var filename = URL.parse(url).hostname + '.txt';
                // fs.writeFileSync(filename, page);
                await fs.writeFile(path.join(dest, sanitize(`${title}.html`)), html);
            })
    } else {
        //save html of a page
        html = await page.content();
        await fs.writeFile(path.join(dest, sanitize(`${title}.html`)), html);
    }


    //await delay(1e3)
}

module.exports = createHtmlPage
