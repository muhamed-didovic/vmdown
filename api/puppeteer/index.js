const createBrowserGetter = require("get-puppeteer-browser");
const puppeteer = require("puppeteer-core");
const findChrome = require("chrome-finder");
const createPageCapturer = require("./createPageCapturer");
const getBrowser = createBrowserGetter(puppeteer, {
    executablePath: findChrome(),
    headless      : true, // Set to false while development
    debounce      : 500,
    // defaultViewport: null,
    // args           : [
    //     '--no-sandbox',
    //     '--start-maximized', // Start in maximized state
    // ],
})

module.exports = getBrowser

// const capturePage = createPageCapturer(browser)
