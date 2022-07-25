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
    console.log('-1', pageUrl);
    return await n
        .goto(pageUrl)
        // .wait('.lesson-video-wrapper')
        // .wait('h1.title')
        // .wait('body')
        // .wait('.body > .title')
        // .wait('.relative')

        .wait('#lessonContent')

    /*await n*/
        .evaluate(() => {
            return {
                locked: Array.from(document.body.querySelectorAll('.locked-action'), txt => txt.textContent)[0],
            }
        })
        .then(({ locked }) => {
            console.log('-2', locked);

            return !!locked;
        })
        .then((locked) => {
            console.log('----', locked);
            if (locked) {
                console.log('-3');
                return;
            }
            console.log('-4');
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
                    console.log(`nightmare vimeoUrl ${title} ${iframeSrc}`.blue);
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
                                await fs.writeFile(path.join(process.cwd(), saveDir, courseName, 'markdown', `${newTitle.replace('/', '\u2215')}.md`), nhm.translate(md), 'utf8')
                            }
                        })(),
                        (async () => {
                            //create image of course info
                            if (images) {
                                await makeScreenshots(n, saveDir, courseName, newTitle.replace('/', '\u2215'), ms)
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

                    let selectedVideo = await extractVimeoUrl(iframeSrc, n, quality, pageUrl);
                    console.log('SS', selectedVideo);

                    return {
                        pageUrl,
                        courseName,
                        dest    : path.join(process.cwd(), saveDir, courseName, `${newTitle.replace('/', '\u2215')}${videoFormat}`),
                        imgPath : path.join(process.cwd(), saveDir, courseName, 'nightmare-screenshots', `${newTitle.replace('/', '\u2215')}.png`),
                        vimeoUrl: selectedVideo.url
                    };

                })
        })
      
};

