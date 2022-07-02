const { Cluster } = require('puppeteer-cluster');
const getInnerText = require("../getInnerText");
const delay = require("../delay");
const { NodeHtmlMarkdown } = require("node-html-markdown");
const he = require("he");
const fs = require("fs-extra");
const path = require("path");

const isLogged = async page => {
    try {
        // await delay(2e3)
        const result = await Promise.race([
            (async () => {
                // check is 'Login' visible
                try {
                    await page.waitForSelector('button[data-test="loginBtn"]')
                    // await page.waitForNavigation({ waitUntil: 'networkidle0' });
                    let text = await page.evaluate(
                        () => Array.from(document.body.querySelectorAll('button[data-test="loginBtn"]'), txt => txt.textContent)[0]
                    );
                    console.log(' login tesxt', text);
                    return text;// === 'Login'
                } catch (e) {
                    // console.log('1111', e);
                    return false;
                }

            })(),
            (async () => {
                //check if "Sign out" is visible
                try {
                    await page.waitForSelector('button[data-test="signOut"]')
                    // await page.waitForNavigation({ waitUntil: 'networkidle0' });
                    let text = await page.evaluate(
                        () => Array.from(document.body.querySelectorAll('button[data-test="signOut"]'), txt => txt.textContent)[0]
                    );
                    console.log('logout tsest text:', text);
                    return text;// === 'Sign Out'
                } catch (e) {
                    // console.log('22222', e);
                    return false;
                }
            })(),

        ])

        console.log('text', result);
        return result;

        // return logged && !notLogged;
    } catch (e) {
        //console.log('-----', e);
        return false;
    }
};

const auth = async (page, email, password) => {

    // const logged = await isLogged(page)
    // console.log('Logged:', logged === 'Sign Out', logged);
    // if (logged === 'Sign Out') {
    //     return;
    // }
    console.log('prolazimo');
    // await delay(10e3)
    await page.click('button[class="button inverted"]');
    await page.click('button[class="button link"]');

    await page.focus('input[placeholder="Account Email"]');
    await page.keyboard.type(email)
    await page.focus('input[placeholder="Password"]');
    await page.keyboard.type(password)

    await page.click('button[class="button primary -full"]')
    await page.click('button[class="button primary -full"]')

    /*console.log('1-');
    await page.waitForSelector('button[data-test="loginBtn"]', {visible: true, timeout: 0});
    await page.click('button[data-test="loginBtn"]');
    // await page.click('button[class="button link"]');
    console.log('2-');
    await page.focus('input[placeholder="Account Email"]');
    await page.keyboard.type(email)
    await page.focus('input[placeholder="Password"]');
    await page.keyboard.type(password)
    console.log('3-');
    await page.waitForSelector('button[data-test="signSubmit"]', {visible: true, timeout: 0});
    await page.click('button[data-test="signSubmit"]')
    console.log('4-');
    // await delay(1e3)
    console.log('5-');*/
}

/**
 * Retries the given function until it succeeds given a number of retries and an interval between them. They are set
 * by default to retry 5 times with 1sec in between. There's also a flag to make the cooldown time exponential
 * @author Daniel Iñigo <danielinigobanos@gmail.com>
 * @param {Function} fn - Returns a promise
 * @param {Number} retriesLeft - Number of retries. If -1 will keep retrying
 * @param {Number} interval - Millis between retries. If exponential set to true will be doubled each retry
 * @param {Boolean} exponential - Flag for exponential back-off mode
 * @return {Promise<*>}
 */
async function retry(fn, retriesLeft = 5, interval = 1000, exponential = false) {
    try {
        const val = await fn();
        return val;
    } catch (error) {
        if (retriesLeft) {
            console.log('.... p-cluster retrying left (' + retriesLeft + ')');
            console.log('retrying err', error);
            await new Promise(r => setTimeout(r, interval));
            return retry(fn, retriesLeft - 1, exponential ? interval*2 : interval, exponential);
        } else {
            console.log('Max retries reached');
            throw error
            //throw new Error('Max retries reached');
        }
    }
}

const extractVimeoUrl = async (page, newTitle, pageUrl, quality) => {

    //await delay(5e3)
    //wait for iframe
    await retry(async () => {//return
        await page.waitForSelector('.video-wrapper iframe[src]', {timeout: 23e3})
    }, 6, 1e3, true)

    const iframeSrc = await page.evaluate(
        () => Array.from(document.body.querySelectorAll('.video-wrapper iframe[src]'), ({ src }) => src)
    );
    // console.log('1111111:', { newTitle, pageUrl, iframeSrc:  iframeSrc[0]});

    await page.goto('view-source:' + iframeSrc[0], { waitUntil: 'networkidle0', timeout: 62e3 });
    // console.log('iframe :', iframeSrc[0]);
    const content = await page.evaluate(
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
        //await page.close()
        return;
    }
    finString = newString.split(']},"lang":"en","sentry":')[0];

    let videos = await eval(`[${finString}]`)
    let selectedVideo = await videos.find(vid => vid.quality === quality);

    if (!selectedVideo) {
        //can't find 1080p quality let's see if there is 720p video
        selectedVideo = await videos.find(vid => vid.quality === '720p');
    }
    //await page.close()
    // console.log('selectedVideo', {newTitle, pageUrl, selectedVideo});
    return selectedVideo;

};
const getPageData = async (data, page) => {
    let { link: pageUrl, downDir: saveDir, extension: videoFormat, quality, markdown, images } = data;
    const nhm = new NodeHtmlMarkdown();
    pageUrl = he.decode(pageUrl)
    // console.log('----pageUrl', pageUrl);
    //await page.goto(url);
    // await page.setViewport({ width: 1920, height: 1080 });

    const options = await Promise
        .resolve()
        .then(async () => {
            //await delay(10e3)
            await page.goto(pageUrl, { timeout: 61e3 })//waitUntil: 'networkidle0',

            //await auth(page, email, password);
            //check is logged user
            // await page.waitForSelector('button[data-test="signOut"]', { timeout: 29e3 })
            let courseName = pageUrl.replace(
                "https://www.vuemastery.com/courses/",
                ""
            );

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

            await Promise.all([
                (async () => {
                    if (images) {
                        const $sec = await page.$('#lessonContent')
                        if (!$sec) throw new Error(`Parsing failed!`)
                        await delay(2e3) //5e3
                        await fs.ensureDir(path.join(process.cwd(), saveDir, courseName, 'puppeteer-cluster-screenshots'))
                        await $sec.screenshot({
                            path          : path.join(process.cwd(), saveDir, courseName, 'puppeteer-cluster-screenshots', `${newTitle}.png`),
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
                /*(async () => {
                    await extractVimeoUrl(newTitle, pageUrl, page);
                })(),*/
            ])
            let selectedVideo = await extractVimeoUrl(page, newTitle, pageUrl, quality);
            return {
                pageUrl,
                courseName,
                dest    : path.join(process.cwd(), saveDir, courseName, `${newTitle}${videoFormat}`),
                imgPath : path.join(process.cwd(), saveDir, courseName, 'puppeteer-cluster-screenshots', `${newTitle}.png`),
                vimeoUrl: selectedVideo.url
            };
        })

    // console.log('options:', { options });
    return { ...options }
};
module.exports = {
    auth,
    retry,
    getPageData,
    extractVimeoUrl
};
