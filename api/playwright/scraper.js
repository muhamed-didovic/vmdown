const playwright = require("playwright")
// const { chromium } = require("@playwright/test");
const he = require('he')
const fs = require("fs-extra")
const _ = require("lodash")
const path = require("path")
const delay = require("../helpers/delay")
const createPageCapturer = require("./createPageCapturer")
const imgs2pdf = require('../helpers/imgs2pdf.js')
const Promise = require('bluebird')
const { auth, retry } = require("./helpers")

const downOverYoutubeDL = require("../helpers/downOverYoutubeDL");
const findChrome = require("chrome-finder");
const Spinnies = require('dreidels')
const ms = new Spinnies();
const sitemap = require("../../json/search-courses.json")

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
    headless,
    url = null
}) => {
    const courses = url ? sitemap.filter(course => course.value.includes(url)) : sitemap;

    if (!courses.length) {
        return console.log('No course(s) found for download')
    }
    console.log('Courses found:', courses.length);

    const browser = await playwright.chromium.launch({
        // devtools: true
        headless: (headless === 'yes' ? true : false), // Set to false while development
        Ignorehttpserrors: true, // ignore certificate error
        waitUntil        : 'networkidle2',
        defaultViewport  : {
            width : 1920,
            height: 1080
        },
        timeout          : 60e3,
        args             : [
            '--disable-gpu',
            '--disable-dev-shm-usage',
            '--disable-web-security',
            '-- Disable XSS auditor', // close XSS auditor
            '--no-zygote',
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '-- allow running secure content', // allow unsafe content
            '--disable-webgl',
            '--disable-popup-blocking',

            '--blink-settings=mainFrameClipsContent=false'
            //'--proxy-server= http://127.0.0.1:8080 '// configure agent
        ],
        executablePath   : findChrome(),

    });

    const context = await browser.newContext();
    const page = await context.newPage();

    //go to homepage
    await retry(async () => {//return
        await page.goto("https://www.vuemastery.com", { waitUntil: 'networkidle', timeout: 30e3 })// wait until page load
        await delay(1e3)
        console.log('retry login');
        await auth(page, email, password);//const a =
        console.log('retry login done');

    }, 6, 1e3, true)

    ms.add('capture', { text: `Start playwright Capturing...` });
    let cnt = 0;
    await Promise
        .map(courses, async ({value}) => {//.slice(0, 10)
            console.log('check is logged and if not logs user');
            await auth(page, email, password);
            console.log('check is logged is done');
            //check is logged user
            //#__layout img.navbar-profile
            await page.waitForSelector('#__layout img.navbar-profile', { timeout: 15e3 })

            ms.update('capture', { text: `Playwright Capturing... ${++cnt} of ${courses.length} ${he.decode(value)}` });
            return await createPageCapturer(context, value, downDir, extension, quality, markdown, images)

        }, {
            concurrency: 3
        })
        .then(async courses => {
            courses = courses.flat()
            await browser.close()
            await fs.ensureDir(path.resolve(__dirname, 'json'))
            await fs.writeFile(path.resolve(__dirname, 'json/first-course-playwright.json'), JSON.stringify(courses, null, 2), 'utf8')
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
            await fs.ensureDir(path.resolve(__dirname, 'json'))
            await fs.writeFile(path.resolve(__dirname, 'json/courses.json'), JSON.stringify(courses, null, 2), 'utf8')
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
                            path.join(downDir, courseName, 'playwright', 'screenshots'),
                            path.join(downDir, courseName, 'playwright', 'screenshots', `${courseName}.pdf`))
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
