const fs = require("fs-extra")
const he = require('he')
const _ = require("lodash")
const path = require("path")

const delay = require("../helpers/delay");
const createPageCapturer = require("./createPageCapturer");
const auth = require("./auth");
const { withPage, withBrowser } = require("../puppeteer-socket/helpers");
const imgs2pdf = require('../helpers/imgs2pdf.js')

const downOverYoutubeDL = require("../helpers/downOverYoutubeDL");

const Spinnies = require('dreidels');
const ms = new Spinnies();

const sitemap = require("../../json/sitemap.json");
const Promise = require("bluebird");

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
              url = null
          } = opts
    const courses = url ? sitemap.filter(course => course.includes(url)) : sitemap;

    if (!courses.length) {
        return console.log('No course(s) found for download')
    }
    console.log('Courses found:', courses.length);
    let cnt = 0;
    // return Promise.resolve()
    const lessons = await withBrowser(async (browser) => {
        const result = await withPage(browser)(async (page) => {
            await page.goto("https://www.vuemastery.com", { waitUntil: "networkidle0" }); // wait until page load
            await page.setViewport({ width: 1920, height: 1080 });
            await delay(1)
            //ms.add('login', { text: `Checking authentication...` });
            await auth(page, email, password);
            await delay(5e3)
            //ms.succeed('login', { text: "User successfully logged in." });

            return Promise.resolve()
        });

        ms.add('capture', { text: `Start Puppeteer Capturing...` });
        return await Promise
            .map(courses, async (link) => {
                return await withPage(browser)(async (page) => {
                    ms.update('capture', { text: `Sockets Capturing... ${++cnt} of ${courses.length} ${he.decode(link)}` });
                    return await createPageCapturer(page, link, opts);
                });
            }, { concurrency: 7 })
            .then(async (lessons) => {
                console.log('--lessons length', lessons.length);
                ms.succeed('capture', { text: `Capturing done for ${cnt}...` });
                await fs.ensureDir(path.resolve(process.cwd(), 'json'))
                await fs.writeFile(`./json/first-course-puppeteer-socket-raw.json`, JSON.stringify(lessons, null, 2), 'utf8')
                return lessons;
            })
    });
    console.log('Lessons length:', lessons.length);

    return Promise
        .resolve(lessons)
        .then(async lessons => {
            return lessons.filter(c => c?.vimeoUrl)
        })
        .then(async courses => {
            if (videos) {

                // create new container
                /* const multibar = new cliProgress.MultiBar({
                     clearOnComplete: false,
                     hideCursor     : true,
                     format         : '[{bar}] {percentage}% | ETA: {eta}s | Speed: {speed} | FileName: {filename} Found:{l}/{r}'
                 });*/

                /*await Promise.map(courses, async ({
                    dest,
                    vimeoUrl
                }) => await downloadVideo(vimeoUrl, dest, ms, multibar), { concurrency: 10 })*/

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
                            path.join(process.cwd(), downDir, courseName, 'sockets', 'screenshots'),
                            path.join(process.cwd(), downDir, courseName, 'sockets', 'screenshots', `${courseName}.pdf`))
                    )
            }
        })
        .catch(console.error)
        .finally(() => {
            console.log('FINNALY');
            ms.stopAll()
            //browser.close()
        })

}

module.exports = scraper;

