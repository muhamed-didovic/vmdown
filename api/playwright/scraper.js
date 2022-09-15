const playwright = require("playwright")
// const { chromium } = require("@playwright/test");
const he = require('he')
const fs = require("fs-extra")
const _ = require("lodash")
const path = require("path")
const cliProgress = require('cli-progress')
const delay = require("../helpers/delay")
const sitemap = require("../../json/sitemap.json")
const createPageCapturer = require("./createPageCapturer")
const imgs2pdf = require('../helpers/imgs2pdf.js')
const downloadVideo = require("../helpers/downloadVideo")
const { auth, retry } = require("./helpers")

const Spinnies = require('dreidels')
const downOverYoutubeDL = require("../helpers/downOverYoutubeDL");
const ms = new Spinnies();

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

    const browser = await playwright.chromium.launch({
        headless: true, // Set to false while development
        //args: ['--start-maximized'],
        // devtools: true
    });

    const context = await browser.newContext();
    const page = await context.newPage();

    //go to homepage
    await retry(async () => {//return
        await page.goto("https://www.vuemastery.com", { waitUntil: 'networkidle', timeout: 30e3 })// wait until page load
        await delay(1e3)
        await auth(page, email, password);//const a =

    }, 6, 1e3, true)

    ms.add('capture', { text: `Start playwright Capturing...` });
    let cnt = 0;
    await Promise
        .map(courses, async (link) => {//.slice(0, 10)
            //check is logged and if not logs user
            await auth(page, email, password);

            //check is logged user
            await page.waitForSelector('#__layout > div > div > div > header > div > nav > div.navbar-secondary > a', { timeout: 15e3 })

            ms.update('capture', { text: `Playwright Capturing... ${++cnt} of ${courses.length} ${he.decode(link)}` });
            return await createPageCapturer(context, link, downDir, extension, quality, markdown, images)

        }, {
            concurrency: 3
        })
        .then(async courses => {
            await browser.close()
            await fs.ensureDir(path.resolve(process.cwd(), 'json'))
            await fs.writeFile(`./json/first-course-playwright.json`, JSON.stringify(courses, null, 2), 'utf8')
            ms.succeed('capture', { text: `Capturing done for ${cnt}...` });
            return courses.filter(c => c?.vimeoUrl)
        })
        .then(async courses => {
            if (videos && courses.length > 0) {
                console.log('start downloading...');
                // create new container
                /*const multibar = new cliProgress.MultiBar({
                    clearOnComplete: false,
                    hideCursor     : true,
                    format         : '[{bar}] {percentage}% | ETA: {eta}s | Speed: {speed} | FileName: {filename} Found:{l}/{r}'
                });*/

                await Promise.map(courses, async (lesson, index) => {
                    // return await downloadVideo(vimeoUrl, dest, ms, multibar)
                    return await downOverYoutubeDL({
                        ...lesson,
                        overwrite,
                        index,
                        ms
                    })
                }, { concurrency: 8 })
                // multibar.stop();
            }
            console.log('done downloading...');
            return courses;
        })
        .then(async (courses) => {
            if (!courses.length) return;

            await fs.ensureDir(path.resolve(process.cwd(), 'json'))
            await fs.writeFile(`./json/courses.json`, JSON.stringify(courses, null, 2), 'utf8')
            if (pdf && images) {
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
                    .map(groupedCourses, async ({
                            courseName,
                            images
                        }) => await imgs2pdf(
                            images,
                            path.join(process.cwd(), downDir, courseName, 'playwright-screenshots'),
                            path.join(process.cwd(), downDir, courseName, 'playwright-screenshots', `${courseName}.pdf`))
                    )
            }
        })
        //.catch(console.error)
        .finally(async () => {
            console.log('FINALLY!!!!');
            //ms.stopAll()
            await browser.close()
        })

}

module.exports = scraper;
