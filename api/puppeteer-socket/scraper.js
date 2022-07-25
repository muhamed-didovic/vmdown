const fs = require("fs-extra");
const path = require("path");
const he = require('he')
const cliProgress = require("cli-progress");
const _ = require("lodash");

const auth = require("./auth");
// const { createWebsocketMessageListener } = require("./message");
const { downloadVideo, parseMessage } = require("./course");

const { withPage, retry, withBrowser } = require("../puppeteer-socket/helpers");
const imgs2pdf = require("../imgs2pdf");
const delay = require("../delay");

const sitemap = require("../../json/sitemap.json");
const { createWebsocketMessageListener } = require("./message");

const Spinnies = require('dreidels');
const { NodeHtmlMarkdown } = require("node-html-markdown");
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
    url = null
}) => {
    const courses = url ? sitemap.filter(course => course.includes(url)) : sitemap;

    if (!courses.length) {
        return console.log('No course(s) found for download')
    }
    const nhm = new NodeHtmlMarkdown();
    console.log('Courses found:', courses.length);

    await withBrowser(async (browser) => {

        const result = await withPage(browser)(async (page) => {
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
        });

        let cnt = 0;
        let coursesArray = []
        // ms.add('capture', { text: `Start Puppeteer Capturing...` });
        await Promise
            .map(courses, async (link) => {
                return await withPage(browser)(async (page) => {
                    const client = await page.target().createCDPSession();
                    await client.send('Network.enable');
                    await client.send('Page.enable');
                    createWebsocketMessageListener(page, client)
                        .register(async (message) => {
                            const video = parseMessage(message);
                            if (video && !coursesArray.includes(video.downloadLink)) {
                                coursesArray.push(video.downloadLink)
                                // console.log('video', video.downloadLink);
                                await downloadVideo(video, page, nhm)
                            }
                        })

                    await page.goto(he.decode(link), { waitUntil: ["networkidle2"], timeout: 61e3});
                    //check if source is locked
                   /* let locked = await page.evaluate(
                        () => Array.from(document.body.querySelectorAll('.locked-action'), txt => txt.textContent)[0]
                    );
                    if (locked) {
                        console.log('LOCKEDDDDDDD');
                        return;
                    }*/
                    await retry(async () => {//return
                        console.log('URL TO VISIT', he.decode(link),);
                        await page.waitForSelector('.video-wrapper iframe[src]')
                    }, 6, 1e3, true)
                    //await auth(page, email, password);

                    // ms.update('capture', { text: `Puppeteer Capturing... ${++cnt} of ${courses.length} ${link}` });
                    await delay(5e3)
                    return true;

                });
            }, { concurrency: 3 })
            .then(async courses => {
              return Promise.resolve();
            })
            /*.then(async courses => {
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
            })*/
            .catch(console.error)
            .finally(() => {
                ms.stopAll()
                browser.close()
            })
    });
}

module.exports = scraper;

