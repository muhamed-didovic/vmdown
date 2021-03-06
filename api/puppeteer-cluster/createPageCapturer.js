// const url = require('url')
const path = require("path");
const fs = require("fs-extra");
const he = require('he')
const delay = require("../delay");

const { NodeHtmlMarkdown } = require('node-html-markdown');
const { retry } = require("../puppeteer/helpers");

module.exports = async (cluster, pageUrl, saveDir, videoFormat, quality, markdown, images) => {//browser =>

    //const page = await browser.newPage()

    //await page.setViewport({ width: 0, height: 0, deviceScaleFactor: 1.5 })


    // Define a task (in this case: screenshot of page)
    await cluster.task(async ({ page, data }) => {
        const { searchTerm, offset } = data;

        const nhm = new NodeHtmlMarkdown();
        pageUrl = he.decode(pageUrl)

        //await page.goto(url);
        await page.setViewport({ width: 1920, height: 1080 });

        const options = await Promise
            .resolve()
            .then(async () => {
                //await delay(10e3)
                await page.goto(pageUrl)
                let courseName = pageUrl.replace(
                    "https://www.vuemastery.com/courses/",
                    ""
                );
                // console.log('url:', courseName);

                try {
                    await page.waitForSelector('h1.title')
                    // const postsSelector = '.main .article h2 a';
                    //await page.waitForSelector(postsSelector, { timeout: 0 });
                } catch (e) {
                    return;
                }

                //check if source is locked
                let locked = await page.evaluate(
                    () => Array.from(document.body.querySelectorAll('.locked-action'), txt => txt.textContent)[0]
                );
                if (locked) {
                    return;
                }

                if (courseName.includes('/')) {
                    try {
                        courseName = courseName.split("/")[0];
                    } catch (e) {
                        console.log('Issue with course name:', courseName, e);
                        return;
                    }
                }

                let title = await page.evaluate(
                    () => Array.from(document.body.querySelectorAll('h1.title'), txt => txt.textContent)[0]
                );

                const allTitles = await page.evaluate(
                    () => Array.from(document.body.querySelectorAll('h4.list-item-title'),
                        txt => txt.textContent)
                );

                //lesson is locked
                locked = await page.evaluate(
                    () => Array.from(document.body.querySelector('.list-item.active').classList, txt => txt)//contains('-locked')
                )
                // console.log('locked', locked, pageUrl) ;
                // console.log('aaaa', locked.includes('-locked'));
                if (locked.includes('-locked')) {
                    // console.log('---locked');
                    return;
                }
                /*const allTitlesWithoutNumbers = allTitles.map(t => {
                    return t.split(". ")[1];
                });

                const newTitle = allTitlesWithoutNumbers.indexOf(title) >= 0
                    ? allTitles[allTitlesWithoutNumbers.indexOf(title)]
                    : allTitlesWithoutNumbers.filter(t => t.includes(title))[0] ;*/
                //title = filenamify(title);

                const newTitle = allTitles.filter(t => t.includes(title))[0]

                const [, , selectedVideo] = await Promise.all([
                    (async () => {
                        if (images) {
                            const $sec = await page.$('#lessonContent')
                            if (!$sec) throw new Error(`Parsing failed!`)
                            await delay(5e3) //5e3
                            await fs.ensureDir(path.join(process.cwd(), saveDir, courseName, 'puppeteer-screenshots'))
                            await $sec.screenshot({
                                path          : path.join(process.cwd(), saveDir, courseName, 'puppeteer-screenshots', `${newTitle}.png`),
                                type          : 'png',
                                omitBackground: true,
                                delay         : '500ms'
                            })
                        }
                    })(),
                    (async () => {
                        //create markdown
                        if (markdown) {
                            //wait for iframe
                            await retry(async () => {//return
                                await page.waitForSelector('.video-wrapper iframe[src]')
                            }, 6, 1e3, true)
                            let markdown = await page.evaluate(
                                () => Array.from(document.body.querySelectorAll('#lessonContent'),
                                    txt => txt.outerHTML)[0]
                            );
                            await fs.ensureDir(path.join(process.cwd(), saveDir, courseName, 'markdown'))
                            await fs.writeFile(path.join(process.cwd(), saveDir, courseName, 'markdown', `${newTitle}.md`), nhm.translate(markdown), 'utf8')
                        }
                    })(),
                    (async () => {
                        //wait for iframe
                        await retry(async () => {//return
                            await page.waitForSelector('.video-wrapper iframe[src]')
                        }, 6, 1e3, true)

                        const iframeSrc = await page.evaluate(
                            () => Array.from(document.body.querySelectorAll('.video-wrapper iframe[src]'), ({ src }) => src)
                        );
                        // console.log('iframeSrc', iframeSrc);
                        const pageSrc = await browser.newPage()
                        await pageSrc.goto('view-source:' + iframeSrc[0], { waitUntil: 'networkidle0', timeout: 0 });

                        const content = await pageSrc.evaluate(
                            () => Array.from(document.body.querySelectorAll('td.line-content'), txt => txt.textContent)[0]
                        );

                        let newString;
                        let finString;
                        try {
                            newString = content.split(`progressive":[`)[1];
                            finString = newString.split(']},"lang":"en","sentry":')[0];
                        } catch (e) {
                            console.error('Issue with error source:', iframeSrc);
                            console.error('Issue with getting vimeo data', content, e);
                            await pageSrc.close()
                            return;
                        }
                        finString = newString.split(']},"lang":"en","sentry":')[0];

                        let videos = await eval(`[${finString}]`)
                        let selectedVideo = await videos.find(vid => vid.quality === quality);

                        if (!selectedVideo) {
                            //can't find 1080p quality let's see if there is 720p video
                            selectedVideo = await videos.find(vid => vid.quality === '720p');
                        }
                        await pageSrc.close()
                        return selectedVideo;

                    })(),
                ])

                return {
                    pageUrl,
                    courseName,
                    dest    : path.join(process.cwd(), saveDir, courseName, `${newTitle}${videoFormat}`),
                    imgPath : path.join(process.cwd(), saveDir, courseName, 'puppeteer-screenshots', `${newTitle}.png`),
                    vimeoUrl: selectedVideo.url
                };
            })

        //console.log('{ ...options }', { ...options });
        return { ...options }
    });
}
