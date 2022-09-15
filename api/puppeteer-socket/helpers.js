const fs = require("fs-extra");
// const createBrowserGetter = require("get-puppeteer-browser");
const puppeteer = require("puppeteer");
const findChrome = require("chrome-finder");
const delay = require("../helpers/delay");
const path = require("path");
const { createDownloadManager } = require("./downloader");
const Path = require("path");
const remote = require("promisify-remote-file-size");

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

const getValidFileName = async (page) => {//fileName
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

const retry = async (fn, retriesLeft = 5, interval = 1000, exponential = false) => {
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
};

const makeScreenshot = async (page, downDir) => {
    const courseName = getCourseName(page)
    const fileName = await getValidFileName(page);

    //save screenshot
    const $sec = await page.$('#lessonContent')
    if (!$sec) throw new Error(`Parsing failed!`)
    await delay(1e3) //5e3
    await fs.ensureDir(path.join(process.cwd(), downDir, courseName, 'puppeteer-socket-screenshots'))
    await $sec.screenshot({
        path          : path.join(process.cwd(), downDir, courseName, 'puppeteer-socket-screenshots', `${fileName}.png`),
        type          : 'png',
        omitBackground: true,
        delay         : '500ms'
    })

    // ms.update('capture', { text: `Puppeteer Capturing... ${++cnt} of ${courses.length} ${link}` });
    await delay(5e3)
};

const downloadManager = createDownloadManager(5);

const parseMessage = message => {
    try {
        const json = JSON.parse(message);
        if (json?.d?.b?.p === 'flamelink/environments/production/content/lessons/en-US') {
            const courseInfo = json.d.b.d;
            // console.log('courseInfo', courseInfo);
            const firstKey = Array.from(Object.keys(courseInfo))[0];
            // console.log('firstKey', firstKey);
            if (Number.isInteger(+firstKey)) {
                return courseInfo[firstKey];
            }
        }
        return null;
    } catch (error) {
        console.error(error);
        return null;
    }
};
const getFilesizeInBytes = filename => {
    let p = Path.resolve(__dirname, filename);
    return fs.existsSync(p) ? fs.statSync(p)["size"] : 0;
};
const downloadVideo = async (video, page, nhm, downDir) => {
    const courseName = getCourseName(page) || video.belongsToCourse.toString();

    //path.join(process.cwd(), 'videos', courseName, `${newTitle}${videoFormat}`)
    // console.log('---------------courseName', courseName, 'page.url()', page.url());
    const directory = path.resolve(process.cwd(), downDir, courseName);
    await fs.ensureDir(directory);
    await fs.ensureDir(path.join(directory, 'markdown-ps'))

    const title = await getValidFileName(page);//, video.title
    const fileName = title; //`${video.lessonNumber}. ${title}`

    //save resources
    if (video?.resources) {
        const resources = Object
            .values(video.resources)
            .map(item => {
                return Object.values(item)[0]
            })
            .join('<br>')
        // console.log('resources', resources);
        await fs.writeFile(path.join(process.cwd(), downDir, courseName, 'markdown-ps', `${fileName}-resources.md`), nhm.translate(resources), 'utf8')
    }
    //save markdown
    await saveTextFile(video.markdown, path.resolve(directory, 'markdown-ps', `${fileName}.md`));

    const remoteFileSize = await remote(video.downloadLink);
    const dest = path.join(process.cwd(), downDir, courseName, `${fileName}.mp4`);
    // console.log('dest', dest)
    // console.log('size', remoteFileSize,  getFilesizeInBytes(dest), 'page.url()', page.url())
    if (remoteFileSize == getFilesizeInBytes(dest)) {
        console.log(`Video exists: ${remoteFileSize}, ${getFilesizeInBytes(`${dest}`)} dest: ${dest}`);
        return Promise.resolve();
    } else {
        console.log('--------file not found:', dest, 'page.url()', page.url());
        //remove file just in case
        await fs.remove(dest)
    }

    downloadManager.addTask(video.downloadLink, path.resolve(directory, `${fileName}.mp4`));
};

module.exports = {
    getCourseName,
    getValidFileName,
    saveTextFile,
    withBrowser,
    withPage,
    retry,
    makeScreenshot,
    parseMessage,
    downloadVideo
}
