const createBrowserGetter = require("get-puppeteer-browser");
const puppeteer = require("puppeteer-core");
const findChrome = require("chrome-finder");
const fs = require("fs-extra");
const delay = require("../helpers/delay");
const path = require("path");
const sanitize = require("sanitize-filename")
const remote = require("promisify-remote-file-size");
// const downOverYoutubeDL = require("../helpers/downOverYoutubeDL");
const { stripHtml } = require("string-strip-html");
const { retry } = require("../helpers/retry");
const { NodeHtmlMarkdown } = require('node-html-markdown')
const createHtmlPage = require("../helpers/createHtmlPage");
const nhm = new NodeHtmlMarkdown();

const v = {
    __meta__        : {
        lastModifiedBy  : 'UNKNOWN',
        lastModifiedDate: '2021-09-16T21:34:53.449Z'
    },
    author          : 'Adam Jahr',
    belongsToCourse : 1516789793545,
    body            : '<p><br><br># 1) The Vue Instance<br><br>**Welcome**<br>This is the beginning of Vue Mastery’s Intro to Vue course. Throughout this series you will learn the fundamentals of Vue while we build this product page together.<br><br><br>![](https://d2mxuefqeaa7sj.cloudfro',
    cloudStoragePath: 'lessons/vue-instance.mp4',
    codingChallenge : '<a href="https://codepen.io/VueMastery/pen/qxwZBQ" target="_blank">Start the Challenge</a> <hr> <a href="https://codepen.io/VueMastery/pen/JpVXXw" target="_blank">View the Solution</a>',
    date            : '2018-02-21T00:00:00-05:00',
    description     : 'This lesson covers how to get your data from your JavaScript to show up in your HTML.',
    downloadLink    : 'https://player.vimeo.com/external/258707456.hd.mp4?s=8b98589a2a3f3482ea9272d076fbb6c9fb578eaf&profile_id=175&download=1',
    duration        : '00:05:44',
    facebookImage   : { '0': 1526928912677 },
    free            : true,
    id              : 1517861162312,
    image           : { '0': 1526928912677 },
    lessonNumber    : 1,
    lock            : false,
    markdown        : '.....',

    order                   : 0,
    parentId                : 0,
    slug                    : 'vue-instance',
    socialSharingDescription: "I'm becoming a Vue Master by watching Intro to Vue.js: The Vue Instance.",
    status                  : 'published',
    title                   : 'The Vue Instance',
    twitterImage            : { '0': 1526928912677 },
    uploadedToCloudStorage  : true,
    videoEmbedId            : '258707456'
}
const withBrowser = async (fn, opts) => {
    const getBrowser = createBrowserGetter(puppeteer, {
        headless: opts.headless === 'yes' ? 'new' : false, //run false for dev memo
        Ignorehttpserrors: true, // ignore certificate error
        waitUntil        : 'networkidle2',
        defaultViewport  : {
            width : 1920,
            height: 1080
        },
        timeout          : 60e3,
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
    // const client = await page.target().createCDPSession();
    // await client.send('Network.enable');
    // await client.send('Page.enable');
    try {
        return await fn(page);//,client
    } finally {
        // console.log('page close');
        // await client.detach();
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
    return sanitize(newTitle)//.replace('/', '\u2215')) ///[<>:"/\\|?*\u0000-\u001F]/g

}

const saveMarkdown = async (text, file) => {
    await fs.writeFile(file, text, { encoding: 'utf-8' });
};

const saveHtml2Markdown = async (text, file) => {
    await fs.writeFile(file, nhm.translate(stripHtml(text).result, 'utf8'))
};

/*const retry = async (fn, retriesLeft = 5, interval = 1000, exponential = false) => {
    try {
        const val = await fn();
        return val;
    } catch (error) {
        if (retriesLeft) {
            console.log('....socket retrying left (' + retriesLeft + ')');
            console.log('socket error', error);
            await new Promise(r => setTimeout(r, interval));
            return retry(fn, retriesLeft - 1, exponential ? interval*2 : interval, exponential);
        } else {
            console.log('Max retries reached');
            throw error
            //throw new Error('Max retries reached');
        }
    }
};*/

const makeScreenshot = async (page, downDir) => {
    const courseName = getCourseName(page)
    const fileName = await getValidFileName(page);

    await page.waitForSelector('#lessonContent')
    await page.waitForSelector('#lessonContent .body > .title')
    await page.waitForSelector('#lessonContent .lesson-body')
    await page.waitForSelector('.video-wrapper iframe[src]')
    await delay(2e3) //5e3

    //save screenshot
    const $sec = await page.$('#lessonContent')
    if (!$sec) throw new Error(`Parsing failed!`)
    await delay(1e3) //5e3
    await fs.ensureDir(path.join(downDir, courseName, 'sockets', 'screenshots'))
    await $sec.screenshot({
        path          : path.join(downDir, courseName, 'sockets', 'screenshots', `${fileName}.png`),
        type          : 'png',
        omitBackground: true,
        delay         : '500ms'
    })

    // ms.update('capture', { text: `Puppeteer Capturing... ${++cnt} of ${courses.length} ${link}` });
    await delay(5e3)
};

// const downloadManager = createDownloadManager(5);

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
        /*if (json?.d?.b?.d?.expires) {
            const auth = json?.d?.b?.d?.auth;
            console.log('auth', auth);
            return auth
        }*/
        return null;
    } catch (error) {
        console.error(error);
        console.log('ERRROR with message', message);
        return null;
    }
};
const getFilesizeInBytes = filename => {
    let p = path.resolve(__dirname, filename);
    return fs.existsSync(p) ? fs.statSync(p)["size"] : 0;
};
const downloadResources = async (video, page, nhm, downDir, overwrite) => {
    const courseName = getCourseName(page) || video.belongsToCourse.toString();

    //path.join('videos', courseName, `${newTitle}${videoFormat}`)
    // console.log('---------------courseName', courseName, 'page.url()', page.url());
    const directory = path.resolve(downDir, courseName);
    await fs.ensureDir(directory);
    await fs.ensureDir(path.join(directory, 'sockets'))

    const title = await getValidFileName(page);//, video.title
    const fileName = title; //`${video.lessonNumber}. ${title}`

    await Promise.all([
        (async () => {
            //save resources
            if (video?.resources) {
                const resources = Object
                    .values(video.resources)
                    .map(item => {
                        return Object.values(item)[0]
                    })
                    .join('<br>')
                // console.log('resources', resources);
                await fs.ensureDir(path.resolve(directory, 'sockets', 'resources'));
                await fs.writeFile(path.join(downDir, courseName, 'sockets', 'resources', `${fileName}-resources.md`), nhm.translate(resources), 'utf8')
            }
        })(),
        (async () => {
            //save markdown
            await fs.ensureDir(path.resolve(directory, 'sockets', 'markdown'));
            await saveMarkdown(video.markdown, path.resolve(directory, 'sockets', 'markdown', `${fileName}.md`));
        })(),
        (async () => {
            //save codingChallenge
            if (video?.codingChallenge) {
                await fs.ensureDir(path.resolve(directory, 'sockets', 'challenges'));
                await fs.writeFile(path.join(downDir, courseName, 'sockets', 'challenges', `${fileName}s.md`), nhm.translate(video.codingChallenge), 'utf8')
            }
        })(),
        makeScreenshot(page, downDir),
        createHtmlPage(page, path.join(downDir, courseName, 'sockets', 'html'), `${fileName}`),
    ])

    //save html to markdown
    // await saveHtml2Markdown(video.body, path.resolve(directory, 'sockets', 'markdown', `${fileName}-body.md`));


    // const remoteFileSize = await remote(video.downloadLink);
    // const dest = path.join(process.cwd(), downDir, courseName, `${fileName}.mp4`);
    // console.log('dest', dest)
    // console.log('size', remoteFileSize,  getFilesizeInBytes(dest), 'page.url()', page.url())
    /*if (remoteFileSize == getFilesizeInBytes(dest)) {
        console.log(`Video exists: ${remoteFileSize}, ${getFilesizeInBytes(`${dest}`)} dest: ${dest}`);
        return Promise.resolve();
    } else {
        console.log('--------file not found so it should be downloaded:', dest, 'page.url()', page.url());
        //remove file just in case
        //await fs.remove(dest)
    }*/


    //downloadManager.addTask(video.downloadLink, path.resolve(directory, `${fileName}.mp4`));

};

module.exports = {
    getCourseName,
    getValidFileName,
    saveMarkdown,
    withBrowser,
    withPage,
    makeScreenshot,
    parseMessage,
    downloadResources
}
