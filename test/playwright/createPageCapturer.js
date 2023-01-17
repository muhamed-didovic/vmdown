const test = require('ava')
const fs = require('fs-extra')

const createPageCapturer = require('../../api/playwright/createPageCapturer')
const path = require('path')

const playwright = require("playwright");

const getBrowser = playwright.chromium.launch({
    headless: true, // Set to false while development
    //args: ['--start-maximized'],
    // devtools: true
});

let browser
let context
let capturePage

const imgs = []
const scrape = async (link, quality = '1080p', saveDir = './test/playwright') => {
    if (!browser) {
        browser = await getBrowser;
        context = await browser.newContext();
    }
    //const result = await capturePage(link, "./test", ".mp4", quality, true, true)
    const result = await createPageCapturer(context, link, saveDir, ".mp4", quality, true, true)
    // imgs.push(result.imgPath)
    // console.log('result', result);
    return result
}

const noop = () => {}
test.after.always(() => {
    if (browser) browser.close()
    // imgs.forEach(imgPath => fs.unlink(imgPath, noop))
    fs.removeSync(path.join(__dirname,  'intro-to-vue-3'),  { recursive: true, force: true });//, { recursive: true, force: true }
})

test('capturePage playwright', async t => {
    const res1 = await scrape('https://www.vuemastery.com/courses/intro-to-vue-3/intro-to-vue3', '720p')

    t.is(res1.length, 11)
    t.true(fs.existsSync(res1[0].imgPath))
    t.true(fs.existsSync(path.join(__dirname, 'intro-to-vue-3', 'playwright', 'markdown', '1. Intro to Vue 3.md')))
    t.is(res1[0].pageUrl, 'https://www.vuemastery.com/courses/intro-to-vue-3/intro-to-vue3')
    t.is(res1[0].courseName, 'intro-to-vue-3')
    t.truthy(res1[0].vimeoUrl)
    fs.copyFileSync(res1[0].imgPath, path.join(__dirname, '..', 'snapshot/capture1.png'))


})
