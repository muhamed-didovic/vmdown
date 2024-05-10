const fs = require("fs-extra")
const he = require('he')
const _ = require("lodash")
const path = require("path")
const delay = require("../helpers/delay");
const createPageCapturer = require("./createPageCapturer");
const { auth, withBrowser, withPage, retry } = require("./helpers");
const imgs2pdf = require('../helpers/imgs2pdf.js');
const downOverYoutubeDL = require('../helpers/downOverYoutubeDL')

const Spinnies = require('dreidels');
const ms = new Spinnies();

const sitemap = require("../../json/search-courses.json");
const downloaded = require("../../json/downloaded-courses.json");
const Promise = require('bluebird')
const { differenceBy } = require("lodash");
/*const Bluebird = require('bluebird')
Bluebird.config({ longStackTraces: true });
global.Promise = Bluebird*/

const scraper = async (opts) => {
    const {
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
    } = opts;

    //courses to download
    let courses = url ? sitemap.filter(course => course.value.includes(url)) : sitemap;
    if (!courses.length) {
        return console.log('[scraper] No course(s) found for download')
    }
    console.log('[scraper] Courses found:', courses.length);

    //remove downloaded courses
    if (overwrite === 'no' && await fs.exists(path.join(__dirname, '../../json/downloaded-courses.json'))) {
        const downloadedCourses = downloaded;//await require(path.join(__dirname, '../json/downloaded-courses.json'))
        courses = differenceBy(courses, downloadedCourses, 'value')
        console.warn('[scraper] Remaining courses to be downloaded:', courses.length);
    }

    //start puppeteer and login
    const lessons = await withBrowser(async (browser) => {

        const result = await withPage(browser)(async (page) => {
            return await retry(async () => {//return
                await page.goto("https://www.vuemastery.com", { waitUntil: "networkidle0" }); // wait until page load
                await page.setViewport({ width: 1920, height: 1080 });
                await delay(1)
                console.log(`[scraper] Checking authentication...`);
                await auth(page, email, password);
                await delay(5e3)
                console.log("[scraper] User successfully logged in.");
                //await delay(5e3)
            }, 6, 1e3, true)
        }, opts);

        let cnt = 0;
        ms.add('capture', { text: `Start Puppeteer Capturing...` });
        return await Promise
            .map(courses, async (course, index) => {
                const { value } = course;
                return await withPage(browser)(async (page) => {

                    /*
                    await retry(async () => {//return
                        await page.waitForSelector('.video-wrapper iframe[src]')
                    }, 6, 1e3, true)*/
                    //await auth(page, email, password);

                    ms.update('capture', { text: `Puppeteer Capturing... ${++cnt} of ${courses.length} ${value}` });
                    const lessons = await createPageCapturer(browser, page, value, downDir, extension, quality, markdown, images)
                    console.log('[scraper] >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>Lessons found:', lessons, lessons.length);

                    videos && await Promise.map(lessons, async (lesson, index) => {
                        if (lesson?.vimeoUrl) {
                            await downOverYoutubeDL({
                                ...lesson,
                                overwrite,
                                index,
                                ms
                            })
                        }
                    }, { concurrency: 4 })

                    if (await fs.exists(path.join(__dirname, '../../json/downloaded-courses.json'))) {
                        console.debug('[scraper] add course as downloaded', course);
                        const downloadedCourses = downloaded;//require(path.join(__dirname, '../json/downloaded-courses.json'))
                        const foundCourse = downloadedCourses.find(({ value }) => course.value.includes(value))
                        console.debug('[scraper] course is found:', foundCourse);
                        if (!foundCourse) {
                            downloadedCourses.push(course);
                            await fs.writeFile(path.join(__dirname, `../../json/downloaded-courses.json`), JSON.stringify(downloadedCourses, null, 2), 'utf8')
                        }
                    } else {
                        await fs.writeFile(path.join(__dirname, '../../json/downloaded-courses.json'), JSON.stringify([course], null, 2), 'utf8')
                    }

                    return lessons;

                });
            }, { concurrency: 1 })
            .then(async courses => {
                courses = courses.flat()
                ms.succeed('capture', { text: `Capturing done for ${cnt}...` });
                await fs.ensureDir(path.resolve(__dirname, 'json'))
                await fs.writeFile(path.resolve(__dirname, 'json/first-course-puppeteer.json'), JSON.stringify(courses, null, 2), 'utf8')
                return courses;
            })

    }, opts);
    console.log('[scraper] Lessons length:', lessons.length);
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
            console.log('[scraper] Lessons length after filtering:', lessons.length);
            await fs.ensureDir(path.resolve(__dirname, 'json'))
            await fs.writeFile(path.resolve(__dirname, 'json/lessons.json'), JSON.stringify(lessons, null, 2), 'utf8')
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
                            path.join(downDir, courseName, 'puppeteer', 'screenshots'),
                            path.join(downDir, courseName, 'puppeteer', 'screenshots', `${courseName}.pdf`))
                    )
            }
        })
        .catch(console.error)
        .finally(() => {
            console.log('[scraper] >>>>DONE');
            ms.stopAll()
            // browser.close()
        })
}

module.exports = scraper;
