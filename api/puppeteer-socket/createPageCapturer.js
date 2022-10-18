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

const v = {
    __meta__        : {
        lastModifiedBy  : 'UNKNOWN',
        lastModifiedDate: '2021-09-16T21:34:53.449Z'
    },
    author          : 'Adam Jahr',
    belongsToCourse : 1516789793545,
    body            : '<p><br><br># 1) The Vue Instance<br><br>**Welcome**<br>This is the beginning of Vue Mastery’s Intro to Vue course. Throughout this series you will learn the fundamentals of Vue while we build this product page together.<br><br><br>![](https://d2mxuefqeaa7sj.cloudfro',
    cloudStoragePath: 'lessons/vue-instance.mp4',
    codingChallenge : '<a href="https://codepen.io/VueMastery/pen/qxwZBQ" target="_blank">Start the Challenge</a> <hr> <a href="https://codepen.io/VueMastery/pen/JpVXXw" target="_blank">View the Solution</a>',
    date            : '2018-02-21T00:00:00-05:00',
    description     : 'This lesson covers how to get your data from your JavaScript to show up in your HTML.',
    downloadLink    : 'https://player.vimeo.com/external/258707456.hd.mp4?s=8b98589a2a3f3482ea9272d076fbb6c9fb578eaf&profile_id=175&download=1',
    duration        : '00:05:44',
    facebookImage   : { '0': 1526928912677 },
    free            : true,
    id              : 1517861162312,
    image           : { '0': 1526928912677 },
    lessonNumber    : 1,
    lock            : false,
    markdown        : '.....',

    order                   : 0,
    parentId                : 0,
    slug                    : 'vue-instance',
    socialSharingDescription: "I'm becoming a Vue Master by watching Intro to Vue.js: The Vue Instance.",
    status                  : 'published',
    title                   : 'The Vue Instance',
    twitterImage            : { '0': 1526928912677 },
    uploadedToCloudStorage  : true,
    videoEmbedId            : '258707456'
}
module.exports = async (page, link, opts) => {
    return new Promise(async (resolve, reject) => {
        const { downDir, extension, markdown, overwrite, url = null } = opts
        const client = await page.target().createCDPSession();
        await client.send('Network.enable');
        await client.send('Page.enable');
        let lesson;
        let courseName;
        let fileName;
        createWebsocketMessageListener(page, client)
            .register(async (message) => {
                const video = parseMessage(message);
                if (video && video?.videoEmbedId && !coursesArray.includes(video.downloadLink)) {
                    coursesArray.push(video.downloadLink)
                    courseName = getCourseName(page)
                    fileName = await getValidFileName(page);
                    lesson = {
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
                    resolve(lesson)
                }
            })

        await Promise.all([
            page.setDefaultNavigationTimeout(0),
            page.goto(he.decode(link), { waitUntil: ["networkidle2"], timeout: 61e3 })
            // page.waitForNavigation({ waitUntil: 'networkidle0' }),
        ])
        //await page.goto(he.decode(link), { waitUntil: ["networkidle2"], timeout: 61e3 });
        // const browserPage = await page.evaluate(() => location.href)

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
                    await delay(2e3)
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
            return resolve();
        }
        // console.log('iframeSrc:', iframeSrc);

        /*await retry(async () => {//return
            //check if source is locked
            let locked = await page.evaluate(
                () => Array.from(document.body.querySelectorAll('.locked-action'), txt => txt.textContent)[0]
            );
            if (locked) {

                console.log('LOCKEDDDDDDD:', browserPage);
                return resolve();
            }
            console.log('URL TO VISIT', he.decode(link),);
            await page.waitForSelector('.video-wrapper iframe[src]')

            //await auth(page, email, password);
            // console.log('1-----', process.cwd(), downDir, courseName, `${fileName}.png`, browserPage);
            // await makeScreenshot(page, downDir);
            // await createHtmlPage(page, path.join(process.cwd(), downDir, courseName, 'sockets', 'html'), `${fileName}.png`);

        }, 6, 1e3, true, page)*/


        //return Promise.resolve(lesson);
    })

};


