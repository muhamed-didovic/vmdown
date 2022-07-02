const test = require('ava')
const fs = require('fs-extra')
const path = require("path");
const createPageCapturer = require('../../api/nightmare/createPageCapturer')

const Nightmare = require("nightmare");
const Spinnies = require('dreidels');
const ms = new Spinnies();
/*
const Bluebird = require('bluebird');
Bluebird.config({ longStackTraces: true });
global.Promise = Bluebird;*/

const scrape = async (link, quality = '1080p', saveDir = './test/nightmare') => {
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
    //const result = await capturePage(link, "./test", ".mp4", quality, true, true)
    const result = await createPageCapturer(browser, link, saveDir, ".mp4", quality, true, true, ms)
    // imgs.push(result.imgPath)
    return result
}

let browser
let capturePage
const imgs = []
const noop = () => {}

test.after.always(() => {
    if (browser) browser.end()
    // imgs.forEach(imgPath => fs.unlink(imgPath, noop))
    fs.removeSync(path.join(__dirname,  'intro-to-vue-js'),  { recursive: true, force: true });//, { recursive: true, force: true }
})


test('capturePage nightmare', async t => {
    const res1 = await scrape('https://www.vuemastery.com/courses/intro-to-vue-js/vue-instance', '720p')
    // console.log('nightmare', res1);
    const res2 = await scrape("https://www.vuemastery.com/courses/intro-to-vue-js/attribute-binding");
    const res3 = await scrape("https://www.vuemastery.com/courses/intro-to-vue-js/conditional-rendering");

    t.true(fs.existsSync(res1.imgPath))
    t.true(fs.existsSync(path.join(__dirname, 'intro-to-vue-js', 'markdown', '1. The Vue Instance.md')))
    t.is(res1.pageUrl, 'https://www.vuemastery.com/courses/intro-to-vue-js/vue-instance')
    t.is(res1.courseName, 'intro-to-vue-js')
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
