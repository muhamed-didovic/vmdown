// const url = require('url')
const path = require("path");
const fs = require("fs-extra");
const he = require('he')
const colors = require('colors');
// const delay = require("../delay");

const { NodeHtmlMarkdown } = require('node-html-markdown');
const { makeScreenshots, extractVimeoUrl } = require("./helpers");

module.exports = async (n, pageUrl, saveDir, videoFormat, quality, markdown, images, ms) => {
    const nhm = new NodeHtmlMarkdown();
    pageUrl = he.decode(pageUrl)
    let lock = false;

    await n
        .goto(pageUrl)
        // .wait('.lesson-video-wrapper')
        // .wait('h1.title')
        // .wait('body')
        // .wait('.body > .title')
        // .wait('.relative')

        .wait('#lessonContent')
        .evaluate(() => {
            return {
                locked: Array.from(document.body.querySelectorAll('.locked-action'), txt => txt.textContent)[0],
            }
        })
        .then(({ locked }) => {
            if (locked) {
                lock = true;
            }
        })
    //check if access is allowed
    if (lock) {
        // ms.fail('capture', { text: `Can't Capture lesson ${pageUrl} lesson is locked: ${lock}` });
        return;
    }

    return n
        .wait('.video-wrapper iframe[src]')
        .wait(1000)
        .evaluate(() => {
            return {
                //locked   : Array.from(document.body.querySelectorAll('.locked-action'), txt => txt.textContent)[0],
                title    : Array.from(document.body.querySelectorAll('h1.title'), txt => txt.textContent)[0],
                allTitles: Array.from(document.body.querySelectorAll('h4.list-item-title'), txt => txt.textContent),
                md       : Array.from(document.body.querySelectorAll('#lessonContent'), txt => txt.outerHTML)[0],
                iframeSrc: Array.from(document.body.querySelectorAll('iframe[src]'), ({ src }) => src)[0],
            }
        })
        .then(async ({ title, allTitles, md = null, iframeSrc }) => {
            // console.log(`vimeoUrl ${title} ${iframeSrc}`.blue);
            //get course name
            let courseName = pageUrl.replace("https://www.vuemastery.com/courses/", "");
            if (courseName.includes('/')) {
                try {
                    courseName = courseName.split("/")[0];
                } catch (e) {
                    console.log('Issue with course name:', courseName, e);
                    return;
                }
            }

            //get title of lesson
            const newTitle = allTitles.filter(t => t.includes(title))[0]

            //const [, , selectedVideo] =
            await Promise.all([
                (async () => {
                    //create markdown
                    if (markdown) {
                        await fs.ensureDir(path.join(process.cwd(), saveDir, courseName, 'markdown'))
                        await fs.writeFile(path.join(process.cwd(), saveDir, courseName, 'markdown', `${newTitle}.md`), nhm.translate(md), 'utf8')
                    }
                })(),
                (async () => {
                    //create image of course info
                    if (images) {
                        await makeScreenshots(n, saveDir, courseName, newTitle, ms)
                        //remove smaller images
                        await fs.remove(path.join(process.cwd(), saveDir, courseName, 's'))
                    }
                })(),
                /*(async () => {
                    let selectedVideo = await extractVimeoUrl(iframeSrc, n, quality);

                    if (!selectedVideo) {
                        //can't find 1080p quality let's see if there is 720p video
                        selectedVideo = await extractVimeoUrl(iframeSrc, n, '720p') //await videos.find(vid => vid.quality === '720p');
                    }

                    return selectedVideo
                })(),*/
            ])

            let selectedVideo = await extractVimeoUrl(iframeSrc, n, quality);

            return {
                pageUrl,
                courseName,
                dest    : path.join(process.cwd(), saveDir, courseName, `${newTitle}${videoFormat}`),
                imgPath : path.join(process.cwd(), saveDir, courseName, 'nightmare-screenshots', `${newTitle}.png`),
                vimeoUrl: selectedVideo.url
            };

        })

};
