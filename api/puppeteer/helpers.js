const createBrowserGetter = require("get-puppeteer-browser");
const puppeteer = require("puppeteer-core");
const findChrome = require("chrome-finder");
const { orderBy } = require("lodash");
const sanitize = require('sanitize-filename')
const req = require('requestretry');
// const fs = require("fs-extra");
const j = req.jar();
const request = req.defaults({ jar: j, retryDelay: 500, fullResponse: true });
const delay = require("../helpers/delay")
const Promise = require("bluebird");
const FileChecker = require("../helpers/fileChecker");
const youtubedl = require("youtube-dl-wrap");
const path = require("path");
const { formatBytes } = require("../helpers/writeWaitingInfo");
const findVideoUrl = require("../helpers/findVideoUrl");
const fs = require("fs-extra");
//await new Promise(function(resolve) {setTimeout(resolve, 2000)});
const withBrowser = async (fn, opts) => {
    //const browser = await puppeteer.launch({/* ... */});
    const getBrowser = createBrowserGetter(puppeteer, {
        headless: opts.headless === 'yes' ? 'new' : false, //run false for dev memo
        // devtools: true,
        ignoreHTTPSErrors: true, // ignore certificate error
        waitUntil        : 'networkidle2',
        defaultViewport  : {
            width : 1920,
            height: 1080
        },
        timeout: 180000e3,
        protocolTimeout: 180000e3,
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

        // executablePath: puppeteer
        //     .executablePath()
        //     .match(/google-chrome/) != null
        //     ? puppeteer.executablePath()
        //     : undefined
    })
    const browser = await getBrowser();
    try {
        return await fn(browser);
    } finally {
        await browser.close();
    }
}
const withPage = (browser) => async (fn) => {
    const page = await browser.newPage();
    // const cookies = fs.readFileSync('cookies.json', 'utf8')
    // const deserializedCookies = JSON.parse(cookies)
    // await page.setCookie(...deserializedCookies)
    try {
        return await fn(page);
    } finally {
        // await page.bringToFront()
        // await delay(5e3)
        await page.close();
    }
}

const isLogged = async page => {
    try {
        //await delay(3e3)

        /*const r = await page.evaluate(() => {
            const login = Array.from(document.body.querySelectorAll('button[data-test="loginBtn"]'), txt => txt.textContent)[0]
            const logout = Array.from(document.body.querySelectorAll('button[data-test="signOut"]'), txt => txt.textContent)[0]
            return {
                login,
                logout
            }
        })
        console.log('r', r);*/
        const result = await Promise.race([
            (async () => {
                // check is 'Login' visible
                try {
                    await page.waitForSelector('button[data-test="loginBtn"]')
                    // await page.waitForNavigation({ waitUntil: 'networkidle0' });
                    let text = await page.evaluate(
                        () => Array.from(document.body.querySelectorAll('button[data-test="loginBtn"]'), txt => txt.textContent)[0]
                    );
                    // console.log(' login tesxt', text);
                    return text;// === 'Login'
                } catch (e) {
                    // console.log('1111', e);
                    return false;
                }

            })(),
            (async () => {
                //check if "Sign out" is visible
                try {
                    await page.waitForSelector('button[data-test="signOut"]')
                    // await page.waitForNavigation({ waitUntil: 'networkidle0' });
                    let text = await page.evaluate(
                        () => Array.from(document.body.querySelectorAll('button[data-test="signOut"]'), txt => txt.textContent)[0]
                    );
                    // console.log('logout tsest text:', text);
                    return text;// === 'Sign Out'
                } catch (e) {
                    // console.log('22222', e);
                    return false;
                }
            })(),

        ])

        console.log('puppeteer logged text:', result);
        return result;

        // return logged && !notLogged;
    } catch (e) {
        //console.log('-----', e);
        return false;
    }
};

const auth = async (page, email, password) => {

    const logged = await isLogged(page)
    console.log('Logged:', logged);//logged === 'Sign Out'
    if (logged === 'Sign Out') {
        return;
    }

    const r = await page.evaluate(() => {
        const login = Array.from(document.body.querySelectorAll('button[data-test="loginBtn"]'), txt => txt.textContent)[0]
        const logout = Array.from(document.body.querySelectorAll('button[data-test="signOut"]'), txt => txt.textContent)[0]
        return {
            login,
            logout
        }
    })
    // console.log('r', r);
    if (r?.logout) {
        return;
    }

    await page.waitForSelector('button[data-test="loginBtn"]')
    await page.click('button[data-test="loginBtn"]')

    await page.waitForSelector('input[placeholder="Account Email"]')
    await page.focus('input[placeholder="Account Email"]');
    await page.keyboard.type(email)
    await page.focus('input[placeholder="Password"]');
    await page.keyboard.type(password)

    // await page.click('form > div.form-actions > button')
    await page.waitForSelector('button[data-test="signSubmit"]')
    await page.click('button[data-test="signSubmit"]')
    await page.waitForSelector('button[data-test="signOut"]')
    const text = await page.$eval('#__layout > div > div > div > header > div > nav > div.navbar-secondary > button', elem => {
        return elem.innerText;
    })
    // console.log('>>>>>>>text---------------------------------', text);
    if (text !== 'Sign Out') {
        // ms.fail(name, { text: "Cannot login. Check your user credentials. \n WARNING: Just free videos will be downloaded" });
        throw new Error('Auth failed')
    }

    // const cookies = await page.cookies()
    // const cookieJson = JSON.stringify(cookies)
    // fs.writeFileSync('cookies.json', cookieJson)
    return true;
}

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
async function retry(fn, retriesLeft = 5, interval = 1000, exponential = false, page = null) {
    try {
        const val = await fn();
        return val;
    } catch (error) {
        if (retriesLeft) {
            console.log('....puppeteer retrying left (' + retriesLeft + ')');
            console.log('e:', error);
            if (page) {
                await fs.ensureDir(path.resolve(process.cwd(), 'errors'))
                await page.screenshot({
                    path: path.resolve(process.cwd(), `errors/${ new Date().toISOString() }.png`),
                    // path    : path.join(process., sanitize(`${String(position).padStart(2, '0')}-${title}-full.png`)),
                    fullPage: true
                });
            }

            await new Promise(r => setTimeout(r, interval));
            return retry(fn, retriesLeft - 1, exponential ? interval*2 : interval, exponential, page);
        } else {
            console.log('Max retries reached:', error);
            throw error
            //throw new Error('Max retries reached');
        }
    }
}

/*const findVideoUrl = (str, pageUrl) => {
    const regex = /(?:config = )(?:\{)(.*(\n.*?)*)(?:\"\})/gm;
    let res = regex.exec(str);
    if (res !== null) {
        if (typeof res[0] !== "undefined") {
            let config = res[0].replace('config = ', '');
            config = JSON.parse(config);
            let progressive = config.request.files.progressive;

            //let videoURL = progressive.find(vid => vid.quality === quality + 'p')?.url;

            let video = orderBy(progressive, ['height'], ['desc'])[0];
            console.log('url', pageUrl, video.quality);
            /!*if (!videoURL) {
                console.log('-----no 1080p video', progressive);
                //can't find 1080p quality let's see if there is 720p video
                videoURL = progressive.find(vid => vid.quality === '720p')?.url;
            }*!/
            /!*for (let item of progressive) {
                videoURL = item.url;
                if (quality + 'p' === item.quality) {
                    //console.log('item 1440', item);
                    break;
                } else {
                    //console.log('-----no item', item);
                }

            }*!/
            // console.log('videoURL', videoURL);
            return video.url;
        }
    }
    return null;
}*/
const vimeoRequest = async (pageUrl, url) => {
    try {
        const { body, attempts } = await request({
            url,
            maxAttempts: 50,
            headers    : {
                'Referer'   : "https://www.vuemastery.com/",
                'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/27.0.1453.110 Safari/537.36'
            }
        })

        const v = findVideoUrl(body, pageUrl)
        // console.log('attempts', attempts);
        const { headers, attempts: a } = await request({
            url         : v,
            json        : true,
            maxAttempts : 50,
            method      : "HEAD",
            fullResponse: true, // (default) To resolve the promise with the full response or just the body
            'headers'   : {
                'Referer': "https://www.vuemastery.com/"
            }
        })

        return {
            url : v,
            size: headers['content-length']
        };
    } catch (err) {
        console.log('ERR::', err);
        /*if (err.message === 'Received invalid status code: 404') {
            return Promise.resolve();
        }*/
        throw err;
    }
};

const scrollToBottomBrowser = async (timeout, viewportN) => {
    // console.log('scrollToBottomBrowser', timeout, viewportN);
    await new Promise((resolve) => {
        let totalHeight = 0, distance = 200, duration = 0, maxHeight = window.innerHeight * viewportN;
        // console.log('maxHeight', maxHeight, 'totalHeight', totalHeight, 'window.innerHeight', window.innerHeight);
        const timer = setInterval(() => {
            // console.log('setInterval', totalHeight, document.querySelector('.l-content').scrollHeight, duration, timeout, maxHeight);
            duration += 200;
            // window.scrollBy(0, distance);
            document.querySelector('.l-content').scrollBy(0, distance)
            totalHeight += distance;
            // console.log('totalHeight >= document.scrollHeight', totalHeight,  document.querySelector('.l-content').scrollHeight, totalHeight >= document.querySelector('.l-content').scrollHeight);
            // console.log('duration >= timeout', duration, timeout, duration >= timeout);
            // console.log('totalHeight >= maxHeight', totalHeight, maxHeight, totalHeight >= maxHeight);
            if (totalHeight >= document.querySelector('.l-content').scrollHeight || duration >= timeout || totalHeight >= maxHeight) {
                clearInterval(timer);
                resolve();
            }
        }, 200);
    });
};

const scrollToBottom = async (page, timeout, viewportN) => {
    // console.log('scrollToBottom', timeout, viewportN);
    // logger.info(`scroll puppeteer page to bottom ${viewportN} times with timeout = ${timeout}`);
    // const scrollToBottomBrowser =  {timeout: 10000, viewportN: 10}
    await page.evaluate(scrollToBottomBrowser, timeout, viewportN);
};

module.exports = {
    withBrowser,
    withPage,
    auth,
    retry,
    vimeoRequest,
    scrollToBottom
};
