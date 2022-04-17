const url = require('url')
const path = require('path')
const fs = require('fs-extra')
const he = require('he')
const sharp = require("sharp")
const cliProgress = require("cli-progress")
const _ = require("lodash");
const colors = require('colors');

const { NodeHtmlMarkdown } = require("node-html-markdown");

const sitemap = require("../../json/sitemap.json");
const downloadVideo = require("../downloadVideo");
const imgs2pdf = require("../imgs2pdf");

const Spinnies = require('dreidels');
const ms = new Spinnies();

const Bluebird = require("bluebird");
const Nightmare = require('nightmare')
Nightmare.Promise = Bluebird

// const installPlugin = require('nightmare-screenshoter').installPlugin;
// installPlugin(Nightmare);

// const screenshotSelector = require('nightmare-screenshot-selector');
// Nightmare.action('screenshotSelector', screenshotSelector)

const login = async (n, email, password) => {
    ms.add('login', { text: `Checking authentication...` });
    await n.goto('https://www.vuemastery.com/')
        .wait('button[class="button inverted"]')
        .click('button[class="button inverted"]')
        .wait('button[class="button link"]')
        .click('button[class="button link"]')
        .type('form > div:nth-child(3) > input', email)
        .type('form > div.form-group.-inline > input', password)
        .click('form > div.form-actions > button')
        .wait('#__layout > div > div > div > header > div > nav > div.navbar-secondary > a')
        .evaluate(() => document.querySelector('#__layout > div > div > div > header > div > nav > div.navbar-secondary > button').innerText)
        .then((text) => {
            if (text !== 'Sign Out') {
                ms.fail('login', { text: "Cannot login. Check your user credentials. \n WARNING: Just free videos will be downloaded" });
                throw new Error('Auth failed')
            }
            ms.succeed('login', { text: "User successfully logged in." });
        })
};
const makeScreenshots = async (n, saveDir, courseName, newTitle) => {
    const name = (Math.random() + 1).toString(36).substring(7)
    ms.add(name, { text: `Start screenshot...` });
    await fs.ensureDir(path.join(process.cwd(), saveDir, courseName, 's'))
    await fs.ensureDir(path.join(process.cwd(), saveDir, courseName, 'screenshots'))

    const dimensions = await n
        .wait('.body > .title')
        .wait('.lesson-body')
        .wait(5e3)
        //.pdf('generated2.pdf')
        .evaluate(function () {

            /*let sheet = window.document.styleSheets[0];
            sheet.insertRule('#firstHeading:before { content: none }', sheet.cssRules.length);*/
            const dimensions = document.querySelector('.relative');
            console.log('dimensions', dimensions.scrollWidth, dimensions.scrollHeight);
            return {
                width : dimensions.scrollWidth,
                height: dimensions.scrollHeight //+ 100//+ 600
            }
        });
    //console.log('dimensions', dimensions);
    const height = dimensions.height;
    ms.succeed(name, { text: `Capturing height: ${height}` });
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

        ms.update(name, { text: `scroll to ${offset} of ${height} Resizing to 1595x${remainder + viewportMagicNumber}` });

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
        .toFile(path.join(process.cwd(), saveDir, courseName, 'screenshots', `${newTitle}.png`))

    /*await n.pdf('generated3.pdf', {
        printBackground: true,
        pageSize       : {
            height,//: Math.ceil(height*254/96*100),
            width: 1595, //Math.ceil(width*254/96*100)
        },
        marginsType    : 1

    });*/
    //ms.succeed(name, { text: `Screenshots done for ${newTitle}...` });
    console.log(`Screenshots done for ${newTitle}...`);
    ms.remove(name)

};
const extractVimeoUrl = async (iframeSrc, n, quality) => {
    return await n
        .goto(iframeSrc)
        .wait('#player')
        .evaluate(() => document.body.textContent)
        .then(async content => {
            //await n.wait(5e3);
            let newString;
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
            //console.log('selectedVideo', selectedVideo);
            return selectedVideo
        })
};

const scraper = async ({
    email,
    password,
    downDir  : saveDir,
    extension: videoFormat,
    quality,
    videos,
    images,
    markdown,
    pdf,
    url = null
}) => {
    const courses = url ? sitemap.filter(course => course.includes(url)) : sitemap;

    if (!courses.length) {
        return console.log('No course(s) found for download')
    }
    console.log('Courses found:', courses.length);
    const nhm = new NodeHtmlMarkdown();
    const n = Nightmare({
        switches              : { 'force-device-scale-factor': '1' },
        show                  : false, //false
        frame                 : true, //false
        useContentSize        : true,
        //minHeight             : 4000,
        enableLargerThanScreen: true,
        width                 : 1595,
        // maxHeight: 16384,
        // minHeight:7425,
        /*maxWidth              : 1595,
        minWidth              : 1595,*/
         openDevTools: {
             mode: 'detach'
         },
    })

    //login user
    await login(n, email, password)

    let cnt = 0;
    ms.add('capture', { text: `Start Nightmare Capturing...` });
    await Promise
        .mapSeries(courses, async (pageUrl) => {
            pageUrl = he.decode(pageUrl)
            ms.update('capture', { text: `Nightmare Capturing... ${++cnt} of ${courses.length} ${pageUrl}` });
            let lock = false;

            //
            await n
                .goto(pageUrl)
                // .wait('.lesson-video-wrapper')
                // .wait('h1.title')
                // .wait('body')

                // .wait('.body > .title')
                // .wait('.relative')

                .wait('#lessonContent')
                .evaluate(() => {
                    return {
                        locked: Array.from(document.body.querySelectorAll('.locked-action'), txt => txt.textContent)[0],
                    }
                })
                .then(({ locked }) => {
                    if (locked) {
                        lock = true;
                    }
                })
            //console.log('lock', lock);
            //check if access is allowed
            if (lock) {
                // ms.fail('capture', { text: `Can't Capture lesson ${pageUrl} lesson is locked: ${lock}` });
                return;
            }

            return n
                //.pdf('generated1.pdf')
                .wait('iframe')
                .wait(1000)
                .evaluate(() => {
                    return {
                        //locked   : Array.from(document.body.querySelectorAll('.locked-action'), txt => txt.textContent)[0],
                        title    : Array.from(document.body.querySelectorAll('h1.title'), txt => txt.textContent)[0],
                        allTitles: Array.from(document.body.querySelectorAll('h4.list-item-title'), txt => txt.textContent),
                        md       : Array.from(document.body.querySelectorAll('#lessonContent'), txt => txt.outerHTML)[0],
                        iframeSrc: Array.from(document.body.querySelectorAll('iframe[src]'), ({ src }) => src)[0],
                    }
                })
                .then(async ({ title, allTitles, md = null, iframeSrc }) => {
                    console.log(`vimeoUrl ${title} ${iframeSrc}`.blue);
                    //get course name
                    let courseName = pageUrl.replace("https://www.vuemastery.com/courses/", "");
                    if (courseName.includes('/')) {
                        try {
                            courseName = courseName.split("/")[0];
                        } catch (e) {
                            console.log('Issue with course name:', courseName, e);
                            return;
                        }
                    }

                    //get title of lesson
                    const newTitle = allTitles.filter(t => t.includes(title))[0]

                    await Promise.all([
                        (async () => {
                            //create markdown
                            if (markdown) {
                                await fs.ensureDir(path.join(process.cwd(), saveDir, courseName, 'markdown'))
                                await fs.writeFile(path.join(process.cwd(), saveDir, courseName, 'markdown', `${newTitle}.md`), nhm.translate(md), 'utf8')
                            }
                        })(),
                        (async () => {
                            //create image of course info
                            if (images) {
                                await makeScreenshots(n, saveDir, courseName, newTitle, ms)
                                //remove smaller images
                                await fs.remove(path.join(process.cwd(), saveDir, courseName, 's'))
                            }
                        })(),
                    ])

                    const selectedVideo = await extractVimeoUrl(iframeSrc, n, quality);

                    return {
                        pageUrl,
                        courseName,
                        dest    : path.join(process.cwd(), saveDir, courseName, `${newTitle}${videoFormat}`),
                        imgPath : path.join(process.cwd(), saveDir, courseName, 'screenshots', `${newTitle}.png`),
                        vimeoUrl: selectedVideo.url
                    };

                })
        }, {
            concurrency: 1
        })
        .then(courses => {
            ms.succeed('capture', { text: `Capturing done for total lessons: ${cnt}...` });
            // console.log('1courses', courses);
            return courses.filter(c => !!c.vimeoUrl)
        })
        .then(async courses => {
            if (videos) {
                // create new container
                const multibar = new cliProgress.MultiBar({
                    clearOnComplete: false,
                    hideCursor     : true
                }, cliProgress.Presets.shades_grey);

                await Promise.map(courses, async ({
                    dest,
                    vimeoUrl
                }) => await downloadVideo(vimeoUrl, dest, ms, multibar), { concurrency: 10 })
                multibar.stop();
            }
            return courses;
        })
        .then(async (courses) => {
            await fs.ensureDir(path.resolve(process.cwd(), 'json'))
            await fs.writeFile(`./json/courses.json`, JSON.stringify(courses, null, 2), 'utf8')
            if (pdf && images) {
                ms.add('pdf', { text: `Start to create to pdf...` });
                const groupedCourses = _(courses)
                    .groupBy('courseName')
                    .map(function (items, courseName) {
                        return {
                            courseName,
                            images: _.map(items, 'imgPath')
                        };
                    })
                    .value();
                return await Promise
                    .map(groupedCourses, async ({ courseName, images }) => await imgs2pdf(
                            images,
                            path.join(process.cwd(), saveDir, courseName, 'screenshots'),
                            path.join(process.cwd(), saveDir, courseName, 'screenshots', `${courseName}.pdf`)
                        )
                    )
                    .then(() => {
                        ms.succeed('pdf', { text: `Pdf is done...` });
                        return
                    })
            }
        })
        //.catch(console.error)
        .finally(async () => {
            ms.stopAll()
            await n.end()
        })


}


module.exports = scraper;
