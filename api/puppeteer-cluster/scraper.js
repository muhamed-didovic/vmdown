const fs = require("fs-extra");
const _ = require("lodash");
const path = require("path");
const cliProgress = require('cli-progress');
const { Cluster } = require('puppeteer-cluster');
const createPageCapturer = require("./createPageCapturer");
const { auth } = require("./helpers");
const imgs2pdf = require('../imgs2pdf.js');
const downloadVideo = require("../downloadVideo");
const getInnerText = require("../getInnerText");
const delay = require("../delay");
const { retry, getPageData, extractVimeoUrl } = require("./helpers");

const Spinnies = require('dreidels');
const ms = new Spinnies();

const { NodeHtmlMarkdown } = require("node-html-markdown");
const he = require("he");
let allData = [];
let cnt = 0;
const sitemap = require("../../json/sitemap.json");
const findChrome = require("chrome-finder");
const launchOptions = {
    headless         : true, //run false for dev
    Ignorehttpserrors: true, // ignore certificate error
    waitUntil        : 'networkidle2',
    defaultViewport  : {
        width : 1920,
        height: 1080
    },
    timeout: 60e3,
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
        //'--proxy-server= http://127.0.0.1:8080 '// configure agent
    ],
    executablePath   : findChrome(),
};
const clusterLanuchOptions = {
    concurrency      : Cluster.CONCURRENCY_PAGE, // single chrome multi tab mode
    maxConcurrency   : 5, // number of concurrent workers
    retrylimit       : 5, // number of retries
    skipduplicateurls: true, // do not crawl duplicate URLs
    // monitor: true, // displays the performance consumption
    puppeteerOptions: launchOptions,
};

/*const getPageData = async (links, opts) => new Promise(async (resolve, reject) => {
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
              url = null
          } = opts;

});*/

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
              url = null
          } = opts;
    const courses = url ? sitemap.filter(course => course.includes(url)) : sitemap;

    if (!courses.length) {
        return console.log('No course(s) found for download')
    }
    console.log('Cluster courses found:', courses.length);

    const cluster = await Cluster.launch(clusterLanuchOptions)
    // Event handler to be called in case of problems
    cluster.on('taskerror', (err, data, willRetry) => {
        if (willRetry) {
            console.warn(`Encountered an error while crawling ${data}. ${err.message}\nThis job will be retried`);
        } else {
            console.error(`Failed to crawl ${data}: ${err.message}`);
            console.error('---Data', data);
            console.error('---Errror', err);
        }

    });

    await cluster.execute(async ({ page }) => {
        await page.goto("https://www.vuemastery.com", { timeout: 100e3 }); // waitUntil: "networkidle0",
        await page.setViewport({ width: 1920, height: 1080 });
        await delay(1)
        await auth(page, email, password);
        await delay(2e3)
        ms.add('login', { text: `Checking authentication...` });
        await page.reload({ waitUntil: ["networkidle0", "domcontentloaded"], timeout: 21e3  });
        await page.waitForSelector('button[data-test="signOut"]', { timeout: 29e3 })
        if (await getInnerText(page, 'a[href="/account/dashboard"]') === 'Dashboard') {
            ms.succeed('login', { text: "User successfully logged in." });
        } else {
            ms.fail('login', { text: "Cannot login. Check your user credentials. \n WARNING: Just free videos will be downloaded" });
            return;
        }
    });

    await cluster.task(async ({ page, data }) => {
        return await getPageData(data, page);
    });

    ms.add('capture', { text: `Start Puppeteer Capturing...` });
    await Promise
        .map(courses, async (link) => {
            ms.update('capture', { text: `Puppeteer Capturing... ${++cnt} of ${courses.length} ${link}` });
            //return await createPageCapturer(cluster, link, downDir, extension, quality, markdown, images)
            return await cluster.execute({ link, downDir, extension, quality, markdown, images });
        }, { concurrency: 5})
        .then(async courses => {

            await cluster.idle();
            await cluster.close();
            console.log('found courses length:', courses.length);
            // console.log('courses:', courses);
            await fs.ensureDir(path.resolve(process.cwd(), 'json'))
            await fs.writeFile(`./json/first-course-puppeteer-cluster.json`, JSON.stringify(courses, null, 2), 'utf8')
            ms.succeed('capture', { text: `Capturing done for ${cnt}...` });
            return courses.filter(c => c?.url || c?.vimeoUrl)
        })
        .then(async courses => {
            if (videos) {
                console.log('filtered courses length:', courses.length);
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
                            path.join(process.cwd(), downDir, courseName, 'puppeteer-cluster-screenshots'),
                            path.join(process.cwd(), downDir, courseName, 'puppeteer-cluster-screenshots', `${courseName}.pdf`))
                    )
            }
        })
        .catch(console.error)
        .finally(async () => {
            console.log('FINNALY');
            // Shutdown after everything is done
            await cluster.idle();
            await cluster.close();
        })
}

module.exports = scraper;
