// const url = require('url')
const path = require("path");
const fs = require("fs-extra");
const he = require('he')
const colors = require('colors');
// const delay = require("../delay");
const Promise = require("bluebird");
const { NodeHtmlMarkdown } = require('node-html-markdown');
const { makeScreenshots, extractVimeoUrl, waitDeffered, extractDom } = require("./helpers");
const createHtmlPage = require("../helpers/createHtmlPage");
const { extractResources, extractChallenges } = require("../helpers/extractors");
const retry = require("../helpers/retry");

const scrapePage = async (n, pageUrl, markdown, saveDir, nhm, images, ms, videoFormat) => {

    const { title, allTitles, md = null, iframeSrc, locked } = await extractDom(n);

    if (locked) {
        // console.log('locked', locked, pageUrl);
        return;
    }

    return n
        .then(async () => {
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
                        await fs.ensureDir(path.join(saveDir, courseName, 'nightmare', 'markdown'))
                        await fs.writeFile(path.join(saveDir, courseName, 'nightmare', 'markdown', `${newTitle.replace('/', '\u2215')}.md`), nhm.translate(md), 'utf8')

                        //save HTML of the page
                        await createHtmlPage(n, path.join(saveDir, courseName, 'nightmare', 'html'), `${newTitle}`, 'nightmare');
                        await extractResources(n, path.join(saveDir, courseName, 'nightmare', 'resources'), newTitle, nhm, 'nightmare');
                        await extractChallenges(n, path.join(saveDir, courseName, 'nightmare', 'challenges'), newTitle, nhm, 'nightmare');
                    }
                })(),
                (async () => {
                    //create image of course info
                    if (images) {
                        await makeScreenshots(n, saveDir, courseName, newTitle.replace('/', '\u2215'), ms)
                        //remove smaller images
                        await fs.remove(path.join(saveDir, courseName, 's'))
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

            //let selectedVideo = await extractVimeoUrl(iframeSrc, n, quality, pageUrl);
            //console.log('SS', selectedVideo);

            return {
                pageUrl,
                courseName,
                dest      : path.join(saveDir, courseName, `${newTitle.replace('/', '\u2215')}${videoFormat}`),
                imgPath   : path.join(saveDir, courseName, 'nightmare', 'screenshots', `${newTitle.replace('/', '\u2215')}.png`),
                downFolder: path.join(saveDir, courseName),
                vimeoUrl  : iframeSrc//selectedVideo.url
            };


            /*console.log('----', locked);
            if (locked) {
                return;
            }*/

            /*return n
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
                                await fs.ensureDir(path.join(saveDir, courseName, 'nightmare', 'markdown'))
                                await fs.writeFile(path.join(process.cwd(), saveDir, courseName, 'nightmare', 'markdown', `${newTitle.replace('/', '\u2215')}.md`), nhm.translate(md), 'utf8')

                                //save HTML of the page
                                await createHtmlPage(n, path.join(process.cwd(), saveDir, courseName, 'nightmare', 'html'), `${newTitle}`, 'nightmare');
                                await extractResources(n, path.join(process.cwd(), saveDir, courseName, 'nightmare', 'resources'), newTitle, nhm, 'nightmare');
                                await extractChallenges(n, path.join(process.cwd(), saveDir, courseName, 'nightmare', 'challenges'), newTitle, nhm, 'nightmare');
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
                        /!*(async () => {
                            let selectedVideo = await extractVimeoUrl(iframeSrc, n, quality);

                            if (!selectedVideo) {
                                //can't find 1080p quality let's see if there is 720p video
                                selectedVideo = await extractVimeoUrl(iframeSrc, n, '720p') //await videos.find(vid => vid.quality === '720p');
                            }

                            return selectedVideo
                        })(),*!/
                    ])

                    //let selectedVideo = await extractVimeoUrl(iframeSrc, n, quality, pageUrl);
                    //console.log('SS', selectedVideo);

                    return {
                        pageUrl,
                        courseName,
                        dest      : path.join(process.cwd(), saveDir, courseName, `${newTitle.replace('/', '\u2215')}${videoFormat}`),
                        imgPath   : path.join(process.cwd(), saveDir, courseName, 'nightmare', 'screenshots', `${newTitle.replace('/', '\u2215')}.png`),
                        downFolder: path.join(process.cwd(), saveDir, courseName),
                        vimeoUrl  : iframeSrc//selectedVideo.url
                    };

                })*/
        })
};

module.exports = async (n, pageUrl, saveDir, videoFormat, quality, markdown, images, ms) => {
    const nhm = new NodeHtmlMarkdown();
    pageUrl = he.decode(pageUrl)
    let lock = false;

    await n
        .goto(pageUrl)
        .wait('h1.title')
        .wait(1e3);
    // console.log('-1pageUrl:', pageUrl);

    //click on the lessons on the right side and wait for text to be loaded
    const lessons = await scrapePage(n, pageUrl, markdown, saveDir, nhm, images, ms, videoFormat);
    // console.log('lessons', lessons);
    // Array.from(document.querySelectorAll('.unlock h4')).filter(a=>/2. Virtual DOM & Render Functions/.test(a.innerText))
    const res = await n
        .evaluate(() => Array.from(document.body.querySelectorAll('div.lessons-list > div > div.list-item'), (txt, i) => [...txt.classList].includes('unlock') ? ++i : null).filter(Boolean))
        .then((lessonsTitles) => lessonsTitles.slice(1))//remove first lessons
        .then(lessonsTitles => {
            // console.log('lessonsTitles', lessonsTitles);
            return Promise.mapSeries(lessonsTitles, async (lessonsTitle, index) => {
                //click on link in the menu
                // console.log('link', `div.lessons-list > div > div:nth-child(${index+2})`, lessonsTitle);
                return await n
                    .click(`div.lessons-list > div > div:nth-child(${lessonsTitle})`)
                    .wait(1500)
                    .then(async () => {
                        // console.log('----------------------------------------------------------------> page is clicked');
                        return await scrapePage(n, pageUrl, markdown, saveDir, nhm, images, ms, videoFormat);
                    })
            })
        })
    //[ '1. Building a Vue 3 app', '2. Create-Vue - creating the project' ]
    // console.log('res', [lessons, ...res]);
    return [lessons, ...res];
};

