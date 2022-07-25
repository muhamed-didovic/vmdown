const test = require('ava')
const fs = require('fs-extra')
const path = require('path')
const createPageCapturer = require('../../api/puppeteer-socket/createPageCapturer')
const createBrowserGetter = require('get-puppeteer-browser')
const puppeteer = require('puppeteer-core')
const { NodeHtmlMarkdown } = require("node-html-markdown");
const findChrome = require("chrome-finder");
const getBrowser = createBrowserGetter(puppeteer, {
    executablePath: findChrome(),
    headless      : true, // Set to false while development
    timeout          : 15e3,
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
const noop = () => {}
let coursesArray = []
const scrape = async (link) => {
    if (!browser) {
        browser = await getBrowser()
    }
    const page = await browser.newPage()
    page.setDefaultTimeout(61e3)
    const result = await createPageCapturer(page, coursesArray, link, './test/puppeteer-socket');
    return result
}

test.after.always(() => {
    if (browser) browser.close()
    fs.removeSync(path.join(__dirname, 'intro-to-vue-js'),  { recursive: true, force: true });//, { recursive: true, force: true }
})

test.only('capturePage puppeteer', async t => {
    const res1  = await scrape('https://www.vuemastery.com/courses/intro-to-vue-js/vue-instance');
    const res2  = await scrape('https://www.vuemastery.com/courses/intro-to-vue-js/attribute-binding');
    const res3  = await scrape('https://www.vuemastery.com/courses/intro-to-vue-js/conditional-rendering');

    t.true(fs.existsSync(path.join(__dirname, 'intro-to-vue-js', 'markdown-ps', '1. The Vue Instance.md')))
    t.true(fs.existsSync(path.join(__dirname, 'intro-to-vue-js', 'puppeteer-socket-screenshots', '1. The Vue Instance.png')))

    t.true(fs.existsSync(path.join(__dirname, 'intro-to-vue-js', 'markdown-ps', '2. Attribute Binding.md')))
    t.true(fs.existsSync(path.join(__dirname, 'intro-to-vue-js', 'puppeteer-socket-screenshots', '2. Attribute Binding.png')))

    t.true(fs.existsSync(path.join(__dirname, 'intro-to-vue-js', 'markdown-ps', '3. Conditional Rendering.md')))
    t.true(fs.existsSync(path.join(__dirname, 'intro-to-vue-js', 'puppeteer-socket-screenshots', '3. Conditional Rendering.png')))
})
