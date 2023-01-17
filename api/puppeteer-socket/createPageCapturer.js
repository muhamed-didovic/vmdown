const he = require('he')
const path = require("path")
const { createWebsocketMessageListener } = require("./message")
const { makeScreenshot, parseMessage, downloadResources, getCourseName, getValidFileName } = require("./helpers")
const retry = require("../helpers/retry");
const createHtmlPage = require("../helpers/createHtmlPage");
// const downOverYoutubeDL = require("../helpers/downOverYoutubeDL")
const { NodeHtmlMarkdown } = require("node-html-markdown")
const Promise = require("bluebird");
const delay = require("../helpers/delay");
const nhm = new NodeHtmlMarkdown()
let coursesArray = []

async function scrapePage(courseName, page, fileName, link, downDir, extension, video, overwrite) {
    courseName = getCourseName(page)
    fileName = await getValidFileName(page);
    let lesson = {
        pageUrl   : he.decode(link),
        courseName,
        dest      : path.join(downDir, courseName, `${fileName}${extension}`),
        imgPath   : path.join(downDir, courseName, 'sockets', 'screenshots', `${fileName}.png`),
        downFolder: path.join(downDir, courseName),
        vimeoUrl  : `https://player.vimeo.com/video/${video.videoEmbedId}?h=c6b73607f6&autoplay=1&app_id=122963`
    };
    // console.log('coursesArray', coursesArray);
    // console.log('2-----', downDir, courseName, `${fileName}.png`)
    await downloadResources(video, page, nhm, downDir, overwrite)
    return lesson;
}

module.exports = async (page, link, opts) => {
    return new Promise(async (resolve, reject) => {
        const { downDir, extension, markdown, overwrite, url = null } = opts
        const client = await page.target().createCDPSession();
        await client.send('Network.enable');
        await client.send('Page.enable');
        let lessons = [];
        let courseName;
        let fileName;
        let lessonsTitles = []
        let i = 0;
        createWebsocketMessageListener(page, client)
            .register(async (message) => {
                const video = parseMessage(message);

                if (video
                    && video?.videoEmbedId
                    && !coursesArray.includes(video.downloadLink)) {

                    coursesArray.push(video.downloadLink)

                    const lesson = await scrapePage(courseName, page, fileName, link, downDir, extension, video, overwrite)
                    lessons.push(lesson);
                    // console.log('lessons', lessons);
                    if (lessonsTitles.length == lessons.length) {
                        return resolve(lessons);
                    }
                    const c = lessonsTitles.slice(1)[i++]
                    // console.log('click', `div.lessons-list > div > div:nth-child(${c})`);
                    await page.click(`div.lessons-list > div > div:nth-child(${c})`)
                    await delay(2e3)

                }
            })

        await Promise
            .all([
                page.setDefaultNavigationTimeout(0),
                page.goto(he.decode(link), { waitUntil: ["networkidle2"], timeout: 61e3 })
                // page.waitForNavigation({ waitUntil: 'networkidle0' }),
            ])
            .then(async () => {
                // console.log('opts', opts);
                if (!opts?.skipLoginCheck) {
                    await page.waitForSelector('button[data-test="signOut"]')
                }
                lessonsTitles = await page.evaluate(
                    () => Array.from(document.body.querySelectorAll('div.lessons-list > div > div.list-item'), (txt, i) => [...txt.classList].includes('unlock') ? ++i : null).filter(Boolean)//.slice(1)
                )
                // console.log('aaaaaaaa', lessonsTitles);
            })
        //await page.goto(he.decode(link), { waitUntil: ["networkidle2"], timeout: 61e3 });
        //const browserPage = await page.evaluate(() => location.href)

        const iframeSrc = await Promise.race([
            (async () => {
                // check is 'iframe' visible
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
                //check if "locked" is visible
                try {
                    await delay(2e3)
                    await page.waitForSelector('.locked-action')
                    return false;
                } catch (e) {
                    // console.log('22222', e);
                    return false;
                }
            })()
        ])
        if (!iframeSrc) {
            // console.log('No iframe found or h1.title; result:', iframeSrc, pageUrl);
            return resolve();
        }
        // console.log('iframeSrc:', iframeSrc);


        //return Promise.resolve(lesson);
    })

};


