const test = require('ava')
const fs = require('fs-extra')

const createPageCapturer = require('../../api/puppeteer/createPageCapturer')
const path = require('path')

const Bluebird = require('bluebird');
Bluebird.config({ longStackTraces: true });
global.Promise = Bluebird;

const createBrowserGetter = require('get-puppeteer-browser')
const puppeteer = require('puppeteer-core')
// const puppeteer = require("puppeteer");
// const { auth, withBrowser, withPage, retry } = require("../../api/puppeteer/helpers");

//const getBrowser = createBrowserGetter(puppeteer, { executablePath: findChrome(), headless: true, slowMo: 0 })
const findChrome = require('chrome-finder')
const getBrowser = createBrowserGetter(puppeteer, {
    headless         : 'new', //run false for dev
    Ignorehttpserrors: true, // ignore certificate error
    waitUntil        : 'networkidle2',
    defaultViewport  : {
        width : 1920,
        height: 1080
    },
    timeout          : 22e3,
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
})
let browser
// const imgs = []
const scrape = async (link, quality = '1080p', saveDir = './test/puppeteer') => {
    if (!browser) {
        browser = await getBrowser()
    }
    const page = await browser.newPage()
    // page.setDefaultTimeout(61e3)
    const result = await createPageCapturer(browser, page, link, saveDir, ".mp4", '1080p', true, true)
    // imgs.push(result.imgPath)
    // console.log('result', result);
    return result
}

test.after.always(() => {
    if (browser) browser.close()
    // imgs.forEach(imgPath => fs.unlink(imgPath, noop))
    fs.removeSync(path.join(__dirname, 'intro-to-vue-3'));//, { recursive: true, force: true }
})

test('capturePage puppeteer', async t => {
    /*[
        {
            pageUrl: 'https://www.vuemastery.com/courses/intro-to-vue-3/intro-to-vue3',
            courseName: 'intro-to-vue-3',
            dest: 'test/puppeteer/intro-to-vue-3/1. Intro to Vue 3.mp4',
            imgPath: 'test/puppeteer/intro-to-vue-3/puppeteer/screenshots/1. Intro to Vue 3.png',
            downFolder: 'test/puppeteer/intro-to-vue-3',
            vimeoUrl: 'https://player.vimeo.com/video/429439600?h=73c87a798c&autoplay=1&app_id=122963'
        },

    ]*/
    const res1 = await scrape('https://www.vuemastery.com/courses/intro-to-vue-3/intro-to-vue3', '720p')

    t.is(res1.length, 11)
    t.true(fs.existsSync(res1[0].imgPath))
    t.true(fs.existsSync(path.join(__dirname, 'intro-to-vue-3', 'puppeteer', 'markdown', '1. Intro to Vue 3.md')))
    t.is(res1[0].pageUrl, 'https://www.vuemastery.com/courses/intro-to-vue-3/intro-to-vue3')
    t.is(res1[0].courseName, 'intro-to-vue-3')
    t.truthy(res1[0].vimeoUrl)
    fs.copyFileSync(res1[0].imgPath, path.join(__dirname, '..', 'snapshot/capture1.png'))
})
