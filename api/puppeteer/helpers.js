const createBrowserGetter = require("get-puppeteer-browser");
const puppeteer = require("puppeteer-core");
const findChrome = require("chrome-finder");
const auth = async (page, email, password) => {
    await page.click('button[class="button inverted"]');
    await page.click('button[class="button link"]');

    await page.focus('input[placeholder="Account Email"]');
    await page.keyboard.type(email)
    await page.focus('input[placeholder="Password"]');
    await page.keyboard.type(password)

    await page.click('button[class="button primary -full"]')
    await page.click('button[class="button primary -full"]')
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
async function retry(fn, retriesLeft = 5, interval = 1000, exponential = false) {
    try {
        const val = await fn();
        return val;
    } catch (error) {
        if (retriesLeft) {
            console.log('....puppeteer retrying left (' + retriesLeft + ')');
            await new Promise(r => setTimeout(r, interval));
            return retry(fn, retriesLeft - 1, exponential ? interval*2 : interval, exponential);
        } else {
            console.log('Max retries reached');
            throw error
            //throw new Error('Max retries reached');
        }
    }
}

const withBrowser = async (fn) => {
    //const browser = await puppeteer.launch({/* ... */});
    const getBrowser = createBrowserGetter(puppeteer, {
        executablePath: findChrome(),
        headless      : true, // Set to false while development
        debounce      : 500,

        defaultViewport: null,
        args           : [
            '--no-sandbox',
            '--start-maximized', // Start in maximized state
        ],
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
    try {
        return await fn(page);
    } finally {
        await page.close();
    }
}

module.exports = {
    withBrowser,
    withPage,
    auth,
    retry
};
