const test = require('ava')
const fs = require('fs-extra')
const { getPageData } = require("../../api/puppeteer-cluster/helpers");
const { Cluster } = require("puppeteer-cluster");
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
const path = require('path')
let cluster;
const imgs = []
const noop = () => {}

test.after.always(() => {
    // imgs.forEach(imgPath => fs.unlink(imgPath, noop))
    fs.removeSync(path.join(__dirname, 'intro-to-vue-js'),  { recursive: true, force: true });//, { recursive: true, force: true }
})

test('capturePage puppeteer', async t => {
    cluster = await Cluster.launch(clusterLanuchOptions)
    await cluster.task(async ({ page, data }) => {
        return await getPageData(data, page);
    });

    const res1  = await cluster.execute({ link: 'https://www.vuemastery.com/courses/intro-to-vue-js/vue-instance', downDir: './test/puppeteer-cluster', extension: ".mp4", quality: '720p', markdown: true, images: true });
    const res2  = await cluster.execute({ link: 'https://www.vuemastery.com/courses/intro-to-vue-js/attribute-binding', downDir: './test/puppeteer-cluster', extension: ".mp4", quality: '1080p', markdown: true, images: true });
    const res3  = await cluster.execute({ link: 'https://www.vuemastery.com/courses/intro-to-vue-js/conditional-rendering', downDir: './test/puppeteer-cluster', extension: ".mp4", quality: '1080p', markdown: true, images: true });

    await cluster.idle();
    await cluster.close();

    // imgs.push(res1.imgPath)
    // imgs.push(res2.imgPath)
    // imgs.push(res3.imgPath)


    t.true(fs.existsSync(res1.imgPath))
    t.true(fs.existsSync(path.join(__dirname, 'intro-to-vue-js', 'markdown', '1. The Vue Instance.md')))
    t.is(res1.pageUrl, 'https://www.vuemastery.com/courses/intro-to-vue-js/vue-instance')
    t.is(res1.courseName,  'intro-to-vue-js')
    t.truthy(res1.vimeoUrl)
    fs.copyFileSync(res1.imgPath, path.join(__dirname, '..', 'snapshot/capture1.png'))

    t.true(fs.existsSync(res2.imgPath))
    t.true(fs.existsSync(path.join(__dirname, 'intro-to-vue-js', 'markdown', '2. Attribute Binding.md')))
    t.is(res2.pageUrl, 'https://www.vuemastery.com/courses/intro-to-vue-js/attribute-binding')
    // console.log('aaaaa', path.join(__dirname, 'snapshot/capture2.png'));
    fs.copyFileSync(res2.imgPath, path.join(__dirname, '..', 'snapshot/capture2.png'))

    t.true(fs.existsSync(res3.imgPath))
    t.true(fs.existsSync(path.join(__dirname, 'intro-to-vue-js', 'markdown', '3. Conditional Rendering.md')))
    t.is(res3.pageUrl, 'https://www.vuemastery.com/courses/intro-to-vue-js/conditional-rendering')
    fs.copyFileSync(res3.imgPath, path.join(__dirname, '..', 'snapshot/capture3.png'))
})
