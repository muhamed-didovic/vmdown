const path = require('path')
const fs = require("fs-extra");
const sanitize = require("sanitize-filename");
const retry = require("./retry");

const createHtmlPage = async (page, dest, title, scraper) => {
    await fs.ensureDir(dest)
    if (scraper === 'nightmare') {
        /*await page
            .evaluate(() => document.documentElement.innerHTML)
            .then((html) => {
                fs.writeFileSync(path.join(__dirname, 'output.html'), html);
                return nightmare.end();
            })*/
        return await retry(async () => {
            const html = await page
                .wait('.body > .title')
                .wait('.lesson-body')
                .evaluate(function () {
                    return document.querySelector('html').outerHTML;
                })
            /*.then(async function (html) {

                // var filename = URL.parse(url).hostname + '.txt';
                // fs.writeFileSync(filename, page);
                await fs.writeFile(path.join(dest, sanitize(`${title}.html`)), html);
            })*/
            // console.log('22html', html);
            await fs.writeFile(path.join(dest, sanitize(`${title}.html`)), html);
            return Promise.resolve();
        }, 6, 1e3, true)
    } else {
        //save html of a page
        const html = await page.content();
        await fs.writeFile(path.join(dest, sanitize(`${title}.html`)), html);
    }
    return Promise.resolve();

    //await delay(1e3)
}

module.exports = createHtmlPage
