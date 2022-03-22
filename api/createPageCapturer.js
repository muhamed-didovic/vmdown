const url = require('url')
const path = require("path");
const fs = require("fs-extra");
const filenamify = require("filenamify");
const delay = require("./delay");

// const tempy = require('tempy')
// const normalizePathname = require('./normalizePathname')

const Bluebird = require('bluebird')
Bluebird.config({ longStackTraces: true });
global.Promise = Bluebird

const { NodeHtmlMarkdown, NodeHtmlMarkdownOptions } = require('node-html-markdown');
// const TurndownService = require('turndown')

/**
 * @param {import('puppeteer-core').Browser} browser
 */
module.exports = browser => async (pageUrl, saveDir, videoFormat, quality, markdown, images, ms) => {
    const nhm = new NodeHtmlMarkdown();
    // const turndownService = new TurndownService()

    pageUrl = String(new url.URL(pageUrl, 'https://www.vuemastery.com/courses'))
    const page = await browser.newPage()
    //await page.setViewport({ width: 0, height: 0, deviceScaleFactor: 1.5 })

    await Promise.all([
        page.setDefaultNavigationTimeout(0),
        page.goto(pageUrl),
        // page.waitForNavigation({ waitUntil: 'networkidle0' }),
    ]);
    const options = await Promise
        .resolve()
        .then(async () => {
            await delay(10e3)
            let courseName = pageUrl.replace(
                "https://www.vuemastery.com/courses/",
                ""
            );
            console.log('url:', courseName);
            if (courseName.includes('/')) {
                try {
                    courseName = courseName.split("/")[0];
                } catch (e) {
                    console.log('Issue with course name:', courseName, e);
                    return;
                }
            }

            //check if source is locked
            let locked = await page.evaluate(
                () => Array.from(document.body.querySelectorAll('.locked-action'),
                    txt => txt.textContent)[0]
            );
            if (locked) {
                return;
            }
            try {
                await page.waitForSelector('h1.title')
                // const postsSelector = '.main .article h2 a';
                //await page.waitForSelector(postsSelector, { timeout: 0 });
            } catch (e) {
                return;
            }

            let title = await page.evaluate(
                () => Array.from(document.body.querySelectorAll('h1.title'),
                    txt => txt.textContent)[0]
            );
            title = filenamify(title);
            const allTitles = await page.evaluate(
                () => Array.from(document.body.querySelectorAll('h4.list-item-title'),
                    txt => txt.textContent)
            );
            const allTitlesWithoutNumbers = allTitles.map(t => {
                return t.split(". ")[1];
            });
            const newIndex = allTitlesWithoutNumbers.indexOf(title);

            //create markdown
            if (markdown) {
                let markdown = await page.evaluate(
                    () => Array.from(document.body.querySelectorAll('#lessonContent'),
                        txt => txt.outerHTML)[0]
                );
                await fs.ensureDir(path.join(process.cwd(), saveDir, courseName, 'markdown'))
                fs.writeFileSync(path.join(process.cwd(), saveDir, courseName, 'markdown', `${allTitles[newIndex]}.md`), nhm.translate(markdown), 'utf8')
            }

            if (images) {
                const $sec = await page.$('#lessonContent')
                if (!$sec) throw new Error(`Parsing failed!`)
                await delay(5e3) //5e3
                await fs.ensureDir(path.join(process.cwd(), saveDir, courseName, 'screens'))
                await $sec.screenshot({
                    path          : path.join(process.cwd(), saveDir, courseName, 'screens', `${allTitles[newIndex]}.png`),
                    type          : 'png',
                    omitBackground: true,
                    delay         : '500ms'
                })
            }

            const iframeSrc = await page.evaluate(
                () => Array.from(document.body.querySelectorAll('iframe[src]'), ({ src }) => src)[0]
            );

            await page.goto('view-source:' + iframeSrc, { waitUntil: 'networkidle0', timeout: 0 });

            const content = await page.evaluate(
                () => Array.from(document.body.querySelectorAll('td.line-content'), txt => txt.textContent)[0]
            );

            let newString;
            let finString;
            try {
                newString = content.split(`progressive":[`)[1];
                finString = newString.split(']},"lang":"en","sentry":')[0];
            } catch (e) {
                console.error('Issue with getting vimeo data', content, e);
                return;
            }
            finString = newString.split(']},"lang":"en","sentry":')[0];

            let videos = await eval(`[${finString}]`)
            let selectedVideo = await videos.find(vid => vid.quality === quality);

            return {
                pageUrl,
                courseName,
                dest    : path.join(process.cwd(), saveDir, courseName, `${allTitles[newIndex]}${videoFormat}`),
                imgPath : path.join(process.cwd(), saveDir, courseName, 'screens', `${allTitles[newIndex]}.png`),
                vimeoUrl: selectedVideo.url
            };
        })
    return { ...options }
}
