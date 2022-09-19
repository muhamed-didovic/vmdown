const path = require("path");
const fs = require("fs-extra");
const he = require('he')
const delay = require("../helpers/delay");
const { auth, retry } = require("./helpers")
const { NodeHtmlMarkdown } = require('node-html-markdown');
const createHtmlPage = require("../helpers/createHtmlPage");
const { extractResources, extractChallenges } = require("../helpers/extractors");

const getCourseName = pageUrl => {
    let courseName = pageUrl.replace("https://www.vuemastery.com/courses/", "");

    if (courseName.includes('/')) {
        try {
            courseName = courseName.split("/")[0];
        } catch (e) {
            console.log('Issue with course name:', courseName);
            throw e;
            //return;
        }
    }

    return courseName;
};
const getTitle = async page => {
    await page.waitForSelector('h1.title', { timeout: 20e3 })
    return await page.$eval('h1.title', txt => txt.textContent)
};
const isLocked = async page => {
    try {
        //check if lesson is locked
        let locked = await page.$eval('.locked-action', txt => txt.textContent);
        if (locked) {
            return true
        }
    } catch (e) {
        return false;
    }
};

const createPageCapturer = async (context, pageUrl, saveDir, videoFormat, quality, markdown, images) => {//(page, context) =>
    let page;
    try {
        const nhm = new NodeHtmlMarkdown();
        pageUrl = he.decode(pageUrl)
        page = await context.newPage();
        await retry(async () => {//return
            await page.goto(pageUrl, { waitUntil: 'networkidle', timeout: 60e3 })
            await page.setViewportSize({ width: 1920, height: 1080 });
            await delay(1e3)

            //check is logged and if not logs user
            // await auth(page, email, password);

            //check is logged user
            //await page.waitForSelector('#__layout > div > div > div > header > div > nav > div.navbar-secondary > a', { timeout: 15e3 })
        }, 6, 10e3, true)

        const iframeSrc = await Promise.race([
            (async () => {
                // check is 'Login' visible
                try {
                    await page.waitForSelector('.video-wrapper iframe[src]')
                    // await page.waitForNavigation({ waitUntil: 'networkidle0' });
                    const iframeSrc = await page.evaluate(
                        () => Array.from(document.body.querySelectorAll('.video-wrapper iframe[src]'), ({ src }) => src)[0]
                    );
                    return iframeSrc

                } catch (e) {
                    // console.log('1111', e);
                    return false;
                }

            })(),
            (async () => {
                //check if "Sign out" is visible
                try {
                    await page.waitForSelector('.locked-action')
                    //check if source is locked
                    /*let locked = await page.evaluate(
                        () => Array.from(document.body.querySelectorAll('.locked-action'), txt => txt.textContent)[0]
                    );
                    if (locked) {
                        return;
                    }*/
                    return false;
                } catch (e) {
                    // console.log('22222', e);
                    return false;
                }
            })()
        ])
        if (!iframeSrc) {
            // console.log('No iframe found or h1.title; result:', iframeSrc, pageUrl);
            return;
        }
        // console.log('iframeSrc:', iframeSrc);

        let courseName = getCourseName(pageUrl);
        // console.log('courseName', courseName);
        // console.log('1is locked', await isLocked(page));
        // if (await isLocked(page)) {
        //     return;
        // }
        let title = await getTitle(page);
        // console.log('title', title);
        const allTitles = await page.$$eval('h4.list-item-title', nodes => nodes.map(n => n.textContent))
        let newTitle = allTitles.filter(t => t.includes(title))[0]
        newTitle = he.decode(newTitle.replace('/', '\u2215'))
        // console.log('newTitle', newTitle);

        const [, ] = await Promise //, selectedVideo
            .all([
                (async () => {
                    if (images) {
                        await page.waitForSelector('.body > .title', { timeout: 10e3 })
                        await page.waitForSelector('.lesson-body', { timeout: 11e3 })
                        await page.waitForSelector('#lessonContent', { timeout: 12e3 })
                        await page.waitForSelector('.lesson-wrapper', { timeout: 13e3 })
                        await page.waitForTimeout(2e3)
                        // const currentViewport = await page.viewportSize();
                        // console.log('currentViewport', currentViewport);
                        await delay(1e3) //5e3

                        const rect = await page.$eval('.lesson-wrapper', element => {//.relative
                            const dimensions = document.querySelector('.lesson-wrapper');
                            return {
                                w: dimensions.scrollWidth,
                                h: dimensions.scrollHeight
                            };
                        });
                        // console.log('rect', pageUrl, rect);

                        await page.setViewportSize({
                            width : rect.w,
                            height: rect.h
                        })
                        await page.waitForTimeout(1e3)
                        // const currentViewport2 = await page.viewportSize();
                        // console.log('currentViewport2', currentViewport2)

                        const $sec = await page.$('.lesson-wrapper')
                        if (!$sec) throw new Error(`Parsing failed!`)
                        await retry(async () => {//return
                            // console.log('screenshot:', path.join(process.cwd(), saveDir, courseName, 'playwright', 'screenshots', `${newTitle}.png`));
                            await $sec.screenshot({
                                path          : path.join(process.cwd(), saveDir, courseName, 'playwright', 'screenshots', `${newTitle}.png`),
                                omitBackground: true,
                                timeout       : 30e3
                            })
                            /*await page
                                .locator('.lesson-wrapper')
                                .screenshot({
                                    path: path.join(process.cwd(), saveDir, courseName, 'playwright', 'screenshots', `${newTitle}.png`),
                                    delay         : '1000ms',
                                    captureBeyondViewport: true
                                });*/
                            /*await page.screenshot({
                                path: path.join(process.cwd(), saveDir, courseName, 'playwright', 'screenshots', `${newTitle}.png`),
                                delay         : '500ms',
                                captureBeyondViewport: false,
                                fullPage: true
                            });*/
                        }, 6, 1e3, true)
                        await page.waitForTimeout(1e3)
                    }
                })(),
                (async () => {
                    //create markdown
                    if (markdown) {
                        let markdown = await page.$eval('#lessonContent', txt => txt.outerHTML)
                        await fs.ensureDir(path.join(process.cwd(), saveDir, courseName, 'playwright', 'markdown'))
                        await fs.writeFile(path.join(process.cwd(), saveDir, courseName, 'playwright', 'markdown', `${newTitle}.md`), nhm.translate(markdown), 'utf8')
                        //save htmlw
                        await createHtmlPage(page, path.join(process.cwd(), saveDir, courseName, 'playwright', 'html'), `${newTitle}`);
                        await extractResources(page, path.join(process.cwd(), saveDir, courseName, 'playwright', 'resources'), newTitle, nhm);
                        await extractChallenges(page, path.join(process.cwd(), saveDir, courseName, 'playwright', 'challenges'), newTitle, nhm);
                    }
                })(),
                /*(async () => {
                    if (await isLocked(page)) {
                        return Promise.resolve();
                    }

                    //create screenshot
                    await page.waitForSelector('.video-wrapper iframe[src]', { timeout: 20e3 })
                    const iframeSrc = await page.$eval('.video-wrapper iframe[src]', ({ src }) => src);
                    return iframeSrc;
                    // console.log('iframeSrc', iframeSrc);
                   /!* const pageSrc = await context.newPage()
                    // context.waitForEvent('page')
                    await retry(async () => {//return
                        //await delay(1e3)
                        await pageSrc.goto('view-source:' + iframeSrc, { timeout: 15e3 });//waitUntil: 'networkidle0',
                        await delay(1e3)
                    }, 6, 10e3, true)

                    const content = await pageSrc.$eval('td.line-content', txt => txt.textContent)

                    let newString;
                    let finString;
                    try {
                        newString = content.split(`progressive":[`)[1];
                        finString = newString.split(']},"lang":"en","sentry":')[0];
                    } catch (e) {
                        console.error('Issue with error source:', iframeSrc);
                        console.error('Issue with getting vimeo data', content, e);
                        return;
                    }
                    finString = newString.split(']},"lang":"en","sentry":')[0];

                    let videos = await eval(`[${finString}]`)
                    let selectedVideo = await videos.find(vid => vid.quality === quality);

                    if (!selectedVideo) {
                        //can't find 1080p quality let's see if there is 720p video
                        selectedVideo = await videos.find(vid => vid.quality === '720p');
                    }
                    //await delay(1e3)
                    await pageSrc.close()
                    return selectedVideo;*!/
                })(),*/
            ])

        /*if (await isLocked(page)) {//!selectedVideo ||
            //console.log('lesson locked: ', selectedVideo);
            return;
        }*/

        return {
            pageUrl,
            courseName,
            dest      : path.join(process.cwd(), saveDir, courseName, `${newTitle}${videoFormat}`),
            imgPath   : path.join(process.cwd(), saveDir, courseName, 'playwright', 'screenshots', `${newTitle}.png`),
            downFolder: path.join(process.cwd(), saveDir, courseName),
            vimeoUrl  : iframeSrc//selectedVideo.url
        };
    } finally {
        await page.close();
    }
    /*catch (e) {
        console.log('eeeee', e);
    } */

}

module.exports = createPageCapturer;
