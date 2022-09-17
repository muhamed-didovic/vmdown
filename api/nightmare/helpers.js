const fs = require("fs-extra");
const path = require("path");
// const delay = require("../delay");
const sharp = require("sharp");
const Spinnies = require('dreidels');
const { orderBy } = require("lodash");

const login = async (n, email, password) => {
    const ms = new Spinnies();
    ms.add('login', { text: `Checking authentication...` });
    return await retry(async () => {//return
        return await n
            .goto('https://www.vuemastery.com/')
            .wait('button[data-test="loginBtn"]')
            .click('button[data-test="loginBtn"]')
            .wait('form > div:nth-child(3) > input')
            .type('form > div:nth-child(3) > input', email)
            .type('form > div.form-group.-inline > input', password)
            .click('form > div.form-actions > button')
            .wait('#__layout > div > div > div > header > div > nav > div.navbar-secondary > a')
            .evaluate(() => document.querySelector('#__layout > div > div > div > header > div > nav > div.navbar-secondary > button').innerText)
            .then((text) => {
                console.log('text', text);
                if (text !== 'Sign Out') {
                    ms.fail('login', { text: "Cannot login. Check your user credentials. \n WARNING: Just free videos will be downloaded" });
                    throw new Error('Auth failed')
                }
                ms.succeed('login', { text: "User successfully logged in." });
            })
    }, 6, 1e3, true)

};
const makeScreenshots = async (n, saveDir, courseName, newTitle, ms) => {
    const name = (Math.random() + 1).toString(36).substring(7)
    // ms.add(name, { text: `Start screenshot...` });
    await fs.ensureDir(path.join(process.cwd(), saveDir, courseName, 's'))
    await fs.ensureDir(path.join(process.cwd(), saveDir, courseName, 'nightmare', 'screenshots'))

    /*await n
        .wait('.body > .title')
        .wait('.lesson-body')
        .wait(5e3)
        // .screenshotSelector('.relative') // get the image in a buffer
        .screenshotSelector( '.relative', 'test.png')
        .then(async () => {
            const stats = await fs.stat('test.png');
            console.log('stats', stats);
            if (stats.isFile()) {
                console.log('DONE');
            }
        });
        /!*.screenshotSelector({
            selector: '#lessonContent',
            path:'screen.png'
        })*!/
    return;*/
    const dimensions = await n
        .wait('.body > .title')
        .wait('.lesson-body')
        .wait(5e3)
        //.pdf('generated2.pdf')
        .evaluate(function () {

            /*let sheet = window.document.styleSheets[0];
            sheet.insertRule('#firstHeading:before { content: none }', sheet.cssRules.length);*/
            const dimensions = document.querySelector('.lesson-wrapper');
            // console.log('dimensions', dimensions.scrollWidth, dimensions.scrollHeight);
            return {
                width : dimensions.scrollWidth,
                height: dimensions.scrollHeight //+ 100//+ 600
            }
        });
    //console.log('dimensions', dimensions);
    const height = dimensions.height;
    // ms.succeed(name, { text: `Capturing height: ${height}` });
    // ms.update(name, { text: `Capturing height: ${height}` });

    /* await n
         .viewport(1595, 100)
         .viewport(1595, dimensions.height)
         //.wait(5e3)
         .screenshot(path.join(process.cwd(), saveDir, courseName, 'screenshots', `${newTitle}.png`));
     await n.wait(10e3)
     return;*/
    let image = await sharp({
        create: {
            width     : 1595,
            height    : height,
            channels  : 4,
            background: { r: 255, g: 255, b: 255, alpha: 0 }
        }
    });

    // const pageheight = Math.round(height/2);//4096;
    const pageheight = 7400;//7425;//(height >= 7425 ? 7425 : height);
    // console.log('pageheight', pageheight);
    const pages = Math.ceil(height/pageheight);
    // console.log('pages', pages);
    const viewportMagicNumber = 28;//30;//67; // on Windows, screenshots are cut by 67 pixels
    for (let a = 1; a <= pages; a++) {
        // where to scroll
        let offset = (a - 1)*pageheight;
        // what size of the window to set
        let remainder = Math.min(pageheight, height - offset);

        // ms.update(name, { text: `scroll to ${offset} of ${height} Resizing to 1595x${remainder + viewportMagicNumber}` });

        await n
            .viewport(1595, remainder + viewportMagicNumber)
            .wait(1000)// wait for window resize to redraw
            .evaluate(offset => { // actually scroll the document
                document.querySelector('.main').scrollTop = offset;
                document.querySelector('.main').scrollTop = offset;
            }, offset)
            .wait(1000)
            .screenshot(path.join(process.cwd(), saveDir, courseName, 's', `source.${a}.png`));
    }

    await image
        .composite(
            Array
                .from(Array(pages).keys())
                .map(function (value, index) {
                    return {
                        // input: `generated.${index + 1}.png`,
                        input: path.join(process.cwd(), saveDir, courseName, 's', `source.${index + 1}.png`), //`source.${index + 1}.png`,
                        left : 0,
                        top  : pageheight*index
                    }
                })
        )
        .toFile(path.join(process.cwd(), saveDir, courseName, 'nightmare', 'screenshots', `${newTitle.replace('/', '\u2215')}.png`))

    /*await n.pdf('generated3.pdf', {
        printBackground: true,
        pageSize       : {
            height,//: Math.ceil(height*254/96*100),
            width: 1595, //Math.ceil(width*254/96*100)
        },
        marginsType    : 1

    });*/
    //ms.succeed(name, { text: `Screenshots done for ${newTitle}...` });
    // console.log(`Screenshots done for ${newTitle}...`);
    // ms.remove(name)

};

const findVideoUrl = (str, pageUrl) => {
    const regex = /(?:config = )(?:\{)(.*(\n.*?)*)(?:\"\})/gm;
    let res = regex.exec(str);
    if (res !== null) {
        if (typeof res[0] !== "undefined") {
            let config = res[0].replace('config = ', '');
            config = JSON.parse(config);
            let progressive = config.request.files.progressive;
            let video = orderBy(progressive, ['height'], ['desc'])[0];
            return video;
        }
    }
    return null;
}

const extractVimeoUrl = async (iframeSrc, n, quality, pageUrl) => {
    return await retry(async () => {//return
        return await n
            .goto(iframeSrc)
            .wait('#player')
            .wait('video[src]')
            .evaluate(() => document.body.textContent)
            .then(async content => {
                const v = findVideoUrl(content, pageUrl)
                return v;
                //await n.wait(5e3);
                /*let newString;
                let finString;
                try {
                    newString = content.split(`progressive":[`)[1];
                    finString = newString.split(']},"lang":"en","sentry":')[0];
                } catch (e) {
                    console.error('Issue with getting vimeo data', content, e);
                    return;
                }
                finString = newString.split(']},"lang":"en","sentry":')[0];

                let videos = await eval(`[${finString}]`)
                let selectedVideo = await videos.find(vid => vid.quality === quality);
                if (!selectedVideo) {
                    //can't find 1080p quality let's see if there is 720p video
                    selectedVideo = await videos.find(vid => vid.quality === '720p');
                }
                return selectedVideo*/
            })
    }, 6, 1e3, true)
};

/**
 * Retries the given function until it succeeds given a number of retries and an interval between them. They are set
 * by default to retry 5 times with 1sec in between. There's also a flag to make the cooldown time exponential
 * @author Daniel Iñigo <danielinigobanos@gmail.com>
 * @param {Function} fn - Returns a promise
 * @param {Number} retriesLeft - Number of retries. If -1 will keep retrying
 * @param {Number} interval - Millis between retries. If exponential set to true will be doubled each retry
 * @param {Boolean} exponential - Flag for exponential back-off mode
 * @return {Promise<*>}
 */
async function retry(fn, retriesLeft = 5, interval = 1000, exponential = false) {
    try {
        const val = await fn();
        return val;
    } catch (error) {
        if (retriesLeft) {
            console.log('.... nightmatr retrying left (' + retriesLeft + ')');
            console.error('e:', error);
            await new Promise(r => setTimeout(r, interval));
            return retry(fn, retriesLeft - 1, exponential ? interval*2 : interval, exponential);
        } else {
            console.log('Max retries reached');
            throw error
            //throw new Error('Max retries reached');
        }
    }
}

module.exports = {
    retry,
    login,
    makeScreenshots,
    extractVimeoUrl
}
