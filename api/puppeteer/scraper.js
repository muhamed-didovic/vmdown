const fs = require("fs-extra");
const _ = require("lodash");
const path = require("path");
const cliProgress = require('cli-progress');

const createPageCapturer = require("./createPageCapturer");
const { auth, withBrowser, withPage } = require("./helpers");
const imgs2pdf = require('../imgs2pdf.js');
const downloadVideo = require("../downloadVideo");
const getInnerText = require("../getInnerText");
const delay = require("../delay");
// const createBrowserGetter = require('get-puppeteer-browser')
// const puppeteer = require('puppeteer-core')
// const puppeteer = require("puppeteer");
// const findChrome = require('chrome-finder')

const Spinnies = require('dreidels');
const ms = new Spinnies();

const sitemap = require("../../json/sitemap.json");

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
    url = null
}) => {
    const courses = url ? sitemap.filter(course => course.includes(url)) : sitemap;

    if (!courses.length) {
        return console.log('No course(s) found for download')
    }
    console.log('Courses found:', courses.length);

    //start puppeteer and login
    await withBrowser(async (browser) => {

        const result = await withPage(browser)(async (page) => {
            await page.goto("https://www.vuemastery.com", { waitUntil: "networkidle0" }); // wait until page load
            await page.setViewport({ width: 1920, height: 1080 });
            await delay(1)
            await auth(page, email, password);

            ms.add('login', { text: `Checking authentication...` });
            await page.reload({ waitUntil: ["networkidle0", "domcontentloaded"] });

            if (await getInnerText(page, 'a[href="/account/dashboard"]') === 'Dashboard') {
                ms.succeed('login', { text: "User successfully logged in." });
            } else {
                ms.fail('login', { text: "Cannot login. Check your user credentials. \n WARNING: Just free videos will be downloaded" });
                return;
            }
            //await delay(5e3)
        });

        let cnt = 0;
        ms.add('capture', { text: `Start Puppeteer Capturing...` });

        await Promise
            .map(courses, async (link) => {
                return await withPage(browser)(async (page) => {
                    // await page.goto(url);
                    ms.update('capture', { text: `Puppeteer Capturing... ${++cnt} of ${courses.length} ${link}` });
                    return await createPageCapturer(browser, page, link, downDir, extension, quality, markdown, images)

                });
            }, { concurrency: 3 })
            .then(async courses => {
                await fs.ensureDir(path.resolve(process.cwd(), 'json'))
                await fs.writeFile(`./json/first-course-puppeteer.json`, JSON.stringify(courses, null, 2), 'utf8')
                ms.succeed('capture', { text: `Capturing done for ${cnt}...` });
                return courses.filter(c => c?.vimeoUrl)
            })
            .then(async courses => {
                if (videos) {

                    // create new container
                    const multibar = new cliProgress.MultiBar({
                        clearOnComplete: false,
                        hideCursor     : true,
                        format         : '[{bar}] {percentage}% | ETA: {eta}s | Speed: {speed} | FileName: {filename} Found:{l}/{r}'
                    });

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
                                path.join(process.cwd(), downDir, courseName, 'puppeteer-screenshots'),
                                path.join(process.cwd(), downDir, courseName, 'puppeteer-screenshots', `${courseName}.pdf`))
                        )
                }
            })
            .catch(console.error)
            .finally(() => {
                ms.stopAll()
                browser.close()
            })
    });
}

module.exports = scraper;
