const test = require('ava')
const fs = require('fs-extra')
const path = require('path')
const createPageCapturer = require('../../api/puppeteer-socket/createPageCapturer')
const createBrowserGetter = require('get-puppeteer-browser')
const puppeteer = require('puppeteer-core')
const { NodeHtmlMarkdown } = require("node-html-markdown");
const findChrome = require("chrome-finder");
const getBrowser = createBrowserGetter(puppeteer, {
    headless         : true, // Set to false while development
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
    // debounce      : 500,
    // slowMo: 0,

    defaultViewport: null,
    args           : [
        '--no-sandbox',
        '--start-maximized', // Start in maximized state
    ],
})

let browser;
const imgs = []
const noop = () => {
}
let coursesArray = []
const scrape = async (link) => {
    if (!browser) {
        browser = await getBrowser()
    }
    const page = await browser.newPage()
    page.setDefaultTimeout(61e3)
    const opts = { downDir: './test/puppeteer-socket', markdown: true, overwrite: true, skipLoginCheck: true }
    const result = await createPageCapturer(page, link, opts);
    // console.log('result', result);
    return result
}

test.after.always(() => {
    // console.log('Closing');
    if (browser) browser.close()
    fs.removeSync(path.join(__dirname, 'intro-to-vue-3'), { recursive: true, force: true });//, { recursive: true, force: true }
})

test('capturePage puppeteer socket', async t => {
    const res1 = await scrape('https://www.vuemastery.com/courses/intro-to-vue-3/intro-to-vue3');
    // console.log('result', res1);
    t.is(res1.length, 11)
    t.true(fs.existsSync(path.join(__dirname, 'intro-to-vue-3', 'sockets', 'markdown', '1. Intro to Vue 3.md')))
    t.true(fs.existsSync(path.join(__dirname, 'intro-to-vue-3', 'sockets', 'screenshots', '1. Intro to Vue 3.png')))

    t.true(fs.existsSync(path.join(__dirname, 'intro-to-vue-3', 'sockets', 'markdown', '2. Creating the Vue App.md')))
    t.true(fs.existsSync(path.join(__dirname, 'intro-to-vue-3', 'sockets', 'screenshots', '2. Creating the Vue App.png')))

    t.true(fs.existsSync(path.join(__dirname, 'intro-to-vue-3', 'sockets', 'markdown', '3. Attribute Binding.md')))
    t.true(fs.existsSync(path.join(__dirname, 'intro-to-vue-3', 'sockets', 'screenshots', '3. Attribute Binding.png')))
})
