const fs = require("fs-extra");
// const createBrowserGetter = require("get-puppeteer-browser");
const puppeteer = require("puppeteer");
const findChrome = require("chrome-finder");
const { createWebsocketMessageListener } = require("./message");
const { parseMessage, downloadVideo } = require("./course");

const withBrowser = async (fn) => {
    //const browser = await puppeteer.launch({/* ... */});
    /*const getBrowser = createBrowserGetter(puppeteer, {
        executablePath: findChrome(),
        headless      : false, // Set to false while development
        debounce      : 500,

        defaultViewport: null,
        args           : [
            '--no-sandbox',
            '--start-maximized', // Start in maximized state
        ],
    })
    const browser = await getBrowser();*/
    const browser = await puppeteer.launch(
        {
            headless       : true, //false for dev env
            defaultViewport: { width: 1920, height: 1080 }
        }
    );
    try {
        return await fn(browser);
    } finally {
        await browser.close();
    }
}
const withPage = (browser) => async (fn) => {
    const page = await browser.newPage();
    /* createWebsocketMessageListener(page)
         .register((message) => {
             const video = parseMessage(message);
             if (video) {
                 console.log('video', video);
                 downloadVideo(video, page)
             }
         })*/

    try {
        return await fn(page);
    } finally {
        await page.close();
    }
}

const getCourseName = page => page.url().split('/').reduce((courseName, segment, index, segments) => {
    if (segment === 'courses') {
        return segments[index + 1]
    }
    return courseName;
}, '');

const getValidFileName = async (page, fileName) => {
    await page.waitForSelector('h1.title')
    await page.waitForSelector('h4.list-item-title')

    let title = await page.evaluate(
        () => Array.from(document.body.querySelectorAll('h1.title'), txt => txt.textContent)[0]
    );

    const allTitles = await page.evaluate(
        () => Array.from(document.body.querySelectorAll('h4.list-item-title'),
            txt => txt.textContent)
    );

    const newTitle = allTitles.filter(t => t.includes(title))[0]
    // console.log('newTitle', newTitle);
    //fileName.replace(/[<>"/\\|*\u0000-\u001F]/g, "-");
    return newTitle.replace('/', '\u2215')

}///[<>:"/\\|?*\u0000-\u001F]/g

const saveTextFile = async (text, file) => {
    await fs.writeFile(file, text, { encoding: 'utf-8' });
};

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

module.exports = {
    getCourseName,
    getValidFileName,
    saveTextFile,
    withBrowser,
    withPage,
    retry
}
