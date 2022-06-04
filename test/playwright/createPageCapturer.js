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
const scrape = async (link, quality = '1080p') => {
    if (!capturePage) {
        browser = await getBrowser;
        context = await browser.newContext();
    }
    //const result = await capturePage(link, "./test", ".mp4", quality, true, true)
    const result = await createPageCapturer(context, link, "./test", ".mp4", quality, true, true)
    imgs.push(result.imgPath)
    return result
}

const noop = () => {}
test.after.always(() => {
    if (browser) browser.close()
    imgs.forEach(imgPath => fs.unlink(imgPath, noop))
    fs.removeSync(path.join(__dirname, 'intro-to-vue-js'));//, { recursive: true, force: true }
})

test('capturePage', async t => {
    const res1 = await scrape('https://www.vuemastery.com/courses/intro-to-vue-js/vue-instance', '720p')
    const res2 = await scrape("https://www.vuemastery.com/courses/intro-to-vue-js/attribute-binding");
    const res3 = await scrape("https://www.vuemastery.com/courses/intro-to-vue-js/conditional-rendering");
    /*{
        pageUrl: 'https://www.vuemastery.com/courses/intro-to-vue-js/vue-instance',
        courseName: 'intro-to-vue-js',
        dest: '/Users/muhameddidovic/projects/vmdown/test/intro-to-vue-js/1. The Vue Instance.mp4',
        imgPath: '/Users/muhameddidovic/projects/vmdown/test/intro-to-vue-js/screens/1. The Vue Instance.png',
        vimeoUrl: 'https://vod-progressive.akamaized.net/exp=1648034110~acl=%2Fvimeo-prod-skyfire-std-us%2F01%2F1741%2F10%2F258707456%2F949450685.mp4~hmac=fa8d11293f72a56f4ea09e215dbcb216e8e64c6d531aebdbd927e7987c17f9a7/vimeo-prod-skyfire-std-us/01/1741/10/258707456/949450685.mp4'
    }*/
    t.true(fs.existsSync(res1.imgPath))
    t.true(fs.existsSync(path.join(__dirname, '..', 'intro-to-vue-js', 'markdown', '1. The Vue Instance.md')))
    t.is(res1.pageUrl, 'https://www.vuemastery.com/courses/intro-to-vue-js/vue-instance')
    t.is(res1.courseName,  'intro-to-vue-js')
    t.truthy(res1.vimeoUrl)
    fs.copyFileSync(res1.imgPath, path.join(__dirname, '..', 'snapshot/capture1.png'))

    t.true(fs.existsSync(res2.imgPath))
    t.true(fs.existsSync(path.join(__dirname, '..', 'intro-to-vue-js', 'markdown', '2. Attribute Binding.md')))
    t.is(res2.pageUrl, 'https://www.vuemastery.com/courses/intro-to-vue-js/attribute-binding')
    // console.log('aaaaa', path.join(__dirname, '..', 'snapshot/capture2.png'));
    fs.copyFileSync(res2.imgPath, path.join(__dirname, '..', 'snapshot/capture2.png'))

    t.true(fs.existsSync(res3.imgPath))
    t.true(fs.existsSync(path.join(__dirname, '..', 'intro-to-vue-js', 'markdown', '3. Conditional Rendering.md')))
    t.is(res3.pageUrl, 'https://www.vuemastery.com/courses/intro-to-vue-js/conditional-rendering')
    fs.copyFileSync(res3.imgPath, path.join(__dirname, '..', 'snapshot/capture3.png'))
})
