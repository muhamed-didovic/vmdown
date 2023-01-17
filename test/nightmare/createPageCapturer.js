const test = require('ava')
const fs = require('fs-extra')
const path = require("path");
const createPageCapturer = require('../../api/nightmare/createPageCapturer')

const Nightmare = require("nightmare");
const Spinnies = require('dreidels');
const ms = new Spinnies();

const scrape = async (link, quality = '1080p', saveDir = './test/nightmare') => {
    try {
        if (!browser) {
            browser = Nightmare({
                switches      : { 'force-device-scale-factor': '1' },
                show          : false, // Set to true while development
                frame         : true, //false
                useContentSize: true,
                //minHeight             : 4000,
                enableLargerThanScreen: true,
                width                 : 1595,
                waitTimeout           : 60e3
                // maxHeight: 16384,
                // minHeight:7425,
                /*maxWidth              : 1595,
                minWidth              : 1595,*/
                // openDevTools: {
                //     mode: 'detach'
                // },
            });
        }

        const result = await createPageCapturer(browser, link, saveDir, ".mp4", quality, true, true, ms)
        // imgs.push(result.imgPath)
        return result
    } catch (err) {
        console.error('nightmare testing error:', err);
    }

}

let browser
let capturePage
const imgs = []
const noop = () => {}

test.after.always(() => {
    if (browser) browser.end()
    // imgs.forEach(imgPath => fs.unlink(imgPath, noop))
    fs.removeSync(path.join(__dirname,  'intro-to-vue-3'),  { recursive: true, force: true });//, { recursive: true, force: true }
})


test('capturePage nightmare', async t => {
    console.log('11111');
    const res1 = await scrape('https://www.vuemastery.com/courses/intro-to-vue-3/intro-to-vue3', '720p')
    console.log('res1', res1);

    t.is(res1.length, 11)
    t.true(fs.existsSync(res1[0].imgPath))
    t.true(fs.existsSync(path.join(__dirname, 'intro-to-vue-3', 'nightmare', 'markdown', '1. Intro to Vue 3.md')))
    t.is(res1[0].pageUrl, 'https://www.vuemastery.com/courses/intro-to-vue-3/intro-to-vue3')
    t.is(res1[0].courseName, 'intro-to-vue-3')
    t.truthy(res1[0].vimeoUrl)
    // fs.copyFileSync(res1[0].imgPath, path.join(__dirname, '..', 'snapshot/capture1.png'))

    // t.true(fs.existsSync(res1.imgPath))
    // t.true(fs.existsSync(path.join(__dirname, 'intro-to-vue-js', 'nightmare', 'markdown', '1. The Vue Instance.md')))
    // t.is(res1.pageUrl, 'https://www.vuemastery.com/courses/intro-to-vue-js/vue-instance')
    // t.is(res1.courseName, 'intro-to-vue-js')
    // t.truthy(res1.vimeoUrl)
    // fs.copyFileSync(res1.imgPath, path.join(__dirname, '..', 'snapshot/capture1.png'))
})
