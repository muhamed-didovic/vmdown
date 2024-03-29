const test = require('ava')
const fs = require('fs-extra')
const { getPageData, scrapePage } = require("../../api/puppeteer-cluster/helpers");
const { Cluster } = require("puppeteer-cluster");
const findChrome = require("chrome-finder");
const { NodeHtmlMarkdown } = require("node-html-markdown");
const he = require("he");
const launchOptions = {
    headless         : 'new', //'new', //run false for dev
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
        '--blink-settings=mainFrameClipsContent=false'
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
    timeout         : 120e3,
};
const path = require('path')
let cluster;
const imgs = []
const noop = () => {}

test.after.always(() => {
    // imgs.forEach(imgPath => fs.unlink(imgPath, noop))
    fs.removeSync(path.join(__dirname, 'intro-to-vue-3'),  { recursive: true, force: true });//, { recursive: true, force: true }
})

test.only('capturePage puppeteer', async t => {
    t.timeout(300e3);
    cluster = await Cluster.launch(clusterLanuchOptions)
    await cluster.task(async ({ page, data }) => {
        //return await getPageData(data, page);
        // console.log('data', data)

       /* const {
            link: pageUrl,//: 'https://www.vuemastery.com/courses/intro-to-vue-3/intro-to-vue3',
              downDir: saveDir,//: './test/puppeteer-cluster',
              extension: videoFormat,//: '.mp4',
              quality,//: '720p',
              markdown,//: true,
              images,//: true
        } = data;*/

        let { link: pageUrl, downDir: saveDir, extension: videoFormat, quality, markdown, images } = data;
        const nhm = new NodeHtmlMarkdown();
        pageUrl = he.decode(pageUrl)

        await page.goto(pageUrl, { waitUntil: 'networkidle2', timeout: 61e3 })//waitUntil: 'networkidle0',
        // await delay(1e3)
        const lessons = await scrapePage(page, pageUrl, markdown, saveDir, nhm, images, videoFormat);
        // console.log('lessons', lessons);

        /*lessons {
            pageUrl: 'https://www.vuemastery.com/courses/intro-to-vue-3/intro-to-vue3',
              courseName: 'intro-to-vue-3',
              dest: 'test/puppeteer-cluster/intro-to-vue-3/1. Intro to Vue 3.mp4',
              imgPath: 'test/puppeteer-cluster/intro-to-vue-3/cluster/screenshots/1. Intro to Vue 3.png',
              downFolder: 'test/puppeteer-cluster/intro-to-vue-3',
              vimeoUrl: 'https://player.vimeo.com/video/429439600?autoplay=1&app_id=122963'
        }*/

        return lessons;
    });

    const res1  = await cluster.execute({ link: 'https://www.vuemastery.com/courses/intro-to-vue-3/intro-to-vue3', downDir: './test/puppeteer-cluster', extension: ".mp4", quality: '720p', markdown: true, images: true });
    // const res2  = await cluster.execute({ link: 'https://www.vuemastery.com/courses/intro-to-vue-js/attribute-binding', downDir: './test/puppeteer-cluster', extension: ".mp4", quality: '1080p', markdown: true, images: true });
    // const res3  = await cluster.execute({ link: 'https://www.vuemastery.com/courses/intro-to-vue-js/conditional-rendering', downDir: './test/puppeteer-cluster', extension: ".mp4", quality: '1080p', markdown: true, images: true });

    await cluster.idle();
    await cluster.close();


    // t.true(fs.existsSync(res1.imgPath))
    // t.true(fs.existsSync(path.join(__dirname, 'intro-to-vue-js', 'cluster', 'markdown', '1. The Vue Instance.md')))
    // t.is(res1.pageUrl, 'https://www.vuemastery.com/courses/intro-to-vue-js/vue-instance')
    // t.is(res1.courseName,  'intro-to-vue-js')
    // t.truthy(res1.vimeoUrl)
    // fs.copyFileSync(res1.imgPath, path.join(__dirname, '..', 'snapshot/capture1.png'))
    t.is(res1.allTitles.length, 11)
    t.true(fs.existsSync(res1.imgPath))
    t.true(fs.existsSync(path.join(__dirname, 'intro-to-vue-3', 'cluster', 'markdown', '1. Intro to Vue 3.md')))
    t.is(res1.pageUrl, 'https://www.vuemastery.com/courses/intro-to-vue-3/intro-to-vue3')
    t.is(res1.courseName, 'intro-to-vue-3')
    t.truthy(res1.vimeoUrl)
    fs.copyFileSync(res1.imgPath, path.join(__dirname, '..', 'snapshot/capture1.png'))
})
