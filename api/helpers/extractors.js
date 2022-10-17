const path = require('path')
const fs = require("fs-extra");
const sanitize = require("sanitize-filename");
// const sanitize = require("sanitize-filename");
// const retry = require("./retry");

async function extractResources(page, dest, title, nhm, scraper) {
    let html;
    if (scraper === 'nightmare') {
        html = await page
            .wait('.body > .title')
            .wait('.lesson-body')
            .evaluate(function () {
                return Array.from(document.body.querySelectorAll('ul.styled-list'), txt => txt.outerHTML)[0]
            })
    } else {
        html = await page.evaluate(
            () => Array.from(document.body.querySelectorAll('ul.styled-list'), txt => txt.outerHTML)[0]
        );
    }
    //console.log('html', html);
    if (html) {
        await fs.ensureDir(dest);
        await fs.writeFile(path.join(dest, `${title}.md`), nhm.translate(html), 'utf8')
    }
}

async function extractChallenges(page, dest, title, nhm, scraper) {
    let html;
    if (scraper === 'nightmare') {
        html = await page
            .wait('.body > .title')
            .wait('.lesson-body')
            .evaluate(function () {
                return Array.from(document.body.querySelectorAll('h3 + div'), txt => txt.outerHTML)[1]
            })
    } else {
        html = await page.evaluate(
            () => Array.from(document.body.querySelectorAll('h3 + div'), txt => txt.outerHTML)[1]
        );
    }

    // console.log('html', html);
    if (html) {
        await fs.ensureDir(dest);
        await fs.writeFile(path.join(dest, `${title}.md`), nhm.translate(html), 'utf8')
    }
}

module.exports = {
    extractResources,
    extractChallenges
}

