const fs = require("fs-extra")
const he = require('he')
const _ = require("lodash")
const path = require("path")
// const cliProgress = require('cli-progress')

const delay = require("../helpers/delay");
const createPageCapturer = require("./createPageCapturer");
const { auth, withBrowser, withPage, retry } = require("./helpers");
const imgs2pdf = require('../helpers/imgs2pdf.js');
// const downloadVideo = require("../helpers/downloadVideo");
const downOverYoutubeDL = require('../helpers/downOverYoutubeDL')


const Spinnies = require('dreidels');
const ms = new Spinnies();

const sitemap = require("../../json/sitemap.json");
const Promise = require('bluebird')
/*const Bluebird = require('bluebird')
Bluebird.config({ longStackTraces: true });
global.Promise = Bluebird*/

const scraper = async ({
    email,
    password,
    downDir,
    extension,
    quality,
    videos,
    images,
    markdown,
    pdf,
    overwrite,
    url = null
}) => {
    const courses = url ? sitemap.filter(course => course.includes(url)) : sitemap;

    if (!courses.length) {
        return console.log('No course(s) found for download')
    }
    console.log('Courses found:', courses.length);

    //start puppeteer and login
    const lessons = await withBrowser(async (browser) => {

        const result = await withPage(browser)(async (page) => {
            return await retry(async () => {//return
                await page.goto("https://www.vuemastery.com", { waitUntil: "networkidle0" }); // wait until page load
                await page.setViewport({ width: 1920, height: 1080 });
                await delay(1)
                ms.add('login', { text: `Checking authentication...` });
                await auth(page, email, password);
                await delay(5e3)
                ms.succeed('login', { text: "User successfully logged in." });
                /*ms.add('login', { text: `Checking authentication...` });
                await page.reload({ waitUntil: ["networkidle0", "domcontentloaded"] });

                if (await getInnerText(page, 'a[href="/account/dashboard"]') === 'Dashboard') {
                    console.log('tu smo');
                    ms.succeed('login', { text: "User successfully logged in." });
                } else {
                    ms.fail('login', { text: "Cannot login. Check your user credentials. \n WARNING: Just free videos will be downloaded" });
                    return;
                }*/
                //await delay(5e3)
            }, 6, 1e3, true)
        });

        let cnt = 0;
        ms.add('capture', { text: `Start Puppeteer Capturing...` });
        return await Promise
            .map(courses, async (link, index) => {
                return await withPage(browser)(async (page) => {

                    /*await page.goto(he.decode(link), { waitUntil: ["networkidle2"], timeout: 61e3});
                    //check if source is locked
                    let locked = await page.evaluate(
                        () => Array.from(document.body.querySelectorAll('.locked-action'), txt => txt.textContent)[0]
                    );
                    if (locked) {
                        return;
                    }
                    await retry(async () => {//return
                        await page.waitForSelector('.video-wrapper iframe[src]')
                    }, 6, 1e3, true)*/
                    //await auth(page, email, password);

                    ms.update('capture', { text: `Puppeteer Capturing... ${++cnt} of ${courses.length} ${link}` });
                    const lesson = await createPageCapturer(browser, page, link, downDir, extension, quality, markdown, images)

                    if (lesson?.vimeoUrl) {
                        await downOverYoutubeDL({
                            ...lesson,
                            overwrite,
                            index,
                            ms
                        })
                    }

                    return lesson;

                });
            }, { concurrency: 7 })
            .then(async courses => {
                ms.succeed('capture', { text: `Capturing done for ${cnt}...` });
                await fs.ensureDir(path.resolve(process.cwd(), 'json'))
                await fs.writeFile(`./json/first-course-puppeteer.json`, JSON.stringify(courses, null, 2), 'utf8')
                return courses;
            })

    });
    console.log('Lessons length:', lessons.length);
    //let cnt = 0;
    return Promise
        .resolve(lessons)
        .then(async lessons => {
            return lessons.filter(c => c?.vimeoUrl)
        })
        /*.then(async lessons => {
            if (videos) {

                // create new container
                /!*const multibar = new cliProgress.MultiBar({
                    clearOnComplete: false,
                    hideCursor     : true,
                    format         : '[{bar}] {percentage}% | ETA: {eta}s | Speed: {speed} | FileName: {filename} Found:{l}/{r}'
                });*!/
                console.log(`>>Downloading ${lessons.length} lessons`);
                await Promise.map(lessons, async (lesson, index) => {
                    // return await downloadVideo(vimeoUrl, dest, ms, multibar)
                    return await downOverYoutubeDL({
                        ...lesson,
                        overwrite,
                        index,
                        ms
                    })
                }, { concurrency: 10 })
                //multibar.stop();
            }
            return lessons;
        })*/
        .then(async (lessons) => {
            await fs.ensureDir(path.resolve(process.cwd(), 'json'))
            await fs.writeFile(`./json/lessons.json`, JSON.stringify(lessons, null, 2), 'utf8')
            if (pdf && images) {
                const groupedLessons = _(lessons)
                    .groupBy('courseName')
                    .map(function (items, courseName) {
                        return {
                            courseName,
                            images: _.map(items, 'imgPath')
                        };
                    })
                    .value();

                return await Promise
                    .map(groupedLessons, async ({
                            courseName,
                            images
                        }) => await imgs2pdf(
                            images,
                            path.join(process.cwd(), downDir, courseName, 'puppeteer', 'screenshots'),
                            path.join(process.cwd(), downDir, courseName, 'puppeteer', 'screenshots', `${courseName}.pdf`))
                    )
            }
        })
        .catch(console.error)
        .finally(() => {
            console.log('>>>>DONE');
            ms.stopAll()
            // browser.close()
        })
}

module.exports = scraper;
