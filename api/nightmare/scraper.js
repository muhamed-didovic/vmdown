const url = require('url')
const path = require('path')
const fs = require('fs-extra')
const he = require('he')
const sharp = require("sharp")
const cliProgress = require("cli-progress")
const _ = require("lodash");
const colors = require('colors');

const { NodeHtmlMarkdown } = require("node-html-markdown");
const { login, retry, makeScreenshots, extractVimeoUrl } = require("./helpers");

const sitemap = require("../../json/sitemap.json");
const downloadVideo = require("../downloadVideo");
const imgs2pdf = require("../imgs2pdf");

const Spinnies = require('dreidels');
const ms = new Spinnies();

const Nightmare = require('nightmare')

const scraper = async ({
    email,
    password,
    downDir  : saveDir,
    extension: videoFormat,
    quality,
    videos,
    images,
    markdown,
    pdf,
    url = null
}) => {
    const courses = url ? sitemap.filter(course => course.includes(url)) : sitemap;

    if (!courses.length) {
        return console.log('No course(s) found for download')
    }
    console.log('Courses found:', courses.length);
    const nhm = new NodeHtmlMarkdown();
    const n = Nightmare({
        switches              : { 'force-device-scale-factor': '1' },
        show                  : false, // Set to true while development
        frame                 : true, //false
        useContentSize        : true,
        //minHeight             : 4000,
        enableLargerThanScreen: true,
        width                 : 1595,
        // maxHeight: 16384,
        // minHeight:7425,
        /*maxWidth              : 1595,
        minWidth              : 1595,*/
         // openDevTools: {
         //     mode: 'detach'
         // },
    })

    //login user
    await login(n, email, password)

    let cnt = 0;
    ms.add('capture', { text: `Start Nightmare Capturing...` });
    await Promise
        .mapSeries(courses, async (pageUrl) => {
            pageUrl = he.decode(pageUrl)
            ms.update('capture', { text: `Nightmare Capturing... ${++cnt} of ${courses.length} ${pageUrl}` });
            let lock = false;

            //
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
        }, {
            concurrency: 1
        })
        .then(async courses => {
            await fs.ensureDir(path.resolve(process.cwd(), 'json'))
            await fs.writeFile(`./json/first-course-nightmare.json`, JSON.stringify(courses, null, 2), 'utf8')
            ms.succeed('capture', { text: `Capturing done for total lessons: ${cnt}...` });
            // console.log('1courses', courses);
            return courses.filter(c => !!c?.vimeoUrl)
        })
        .then(async courses => {
            if (videos) {
                // create new container
                const multibar = new cliProgress.MultiBar({
                    clearOnComplete: false,
                    hideCursor     : true
                }, cliProgress.Presets.shades_grey);

                await Promise.map(courses, async ({
                    dest,
                    vimeoUrl
                }) => await downloadVideo(vimeoUrl, dest, ms, multibar), { concurrency: 10 })
                multibar.stop();
            }
            return courses;
        })
        .then(async (courses) => {
            await fs.ensureDir(path.resolve(process.cwd(), 'json'))
            await fs.writeFile(`./json/courses.json`, JSON.stringify(courses, null, 2), 'utf8')
            if (pdf && images) {
                ms.add('pdf', { text: `Start to create to pdf...` });
                const groupedCourses = _(courses)
                    .groupBy('courseName')
                    .map(function (items, courseName) {
                        return {
                            courseName,
                            images: _.map(items, 'imgPath')
                        };
                    })
                    .value();
                return await Promise
                    .map(groupedCourses, async ({ courseName, images }) => await imgs2pdf(
                            images,
                            path.join(process.cwd(), saveDir, courseName, 'nightmare-screenshots'),
                            path.join(process.cwd(), saveDir, courseName, 'nightmare-screenshots', `${courseName}.pdf`)
                        )
                    )
                    .then(() => {
                        ms.succeed('pdf', { text: `Pdf is done...` });
                        // return
                    })
            }
        })
        //.catch(console.error)
        .finally(async () => {
            ms.stopAll()
            await n.end()
        })


}


module.exports = scraper;
