// const url = require('url')
const path = require('path')
const fs = require('fs-extra')
// const cliProgress = require("cli-progress")
const _ = require("lodash");
const { login, waitDeffered, getCourses } = require("./helpers");
const createPageCapturer = require("./createPageCapturer")
const sitemap = require("../../json/search-courses.json");
// const downloadVideo = require("../helpers/downloadVideo");
const imgs2pdf = require("../helpers/imgs2pdf");
const Promise = require("bluebird");
const Spinnies = require('dreidels');
const ms = new Spinnies();

const Nightmare = require('nightmare')
// Nightmare.use(waitDeffered('.video-wrapper iframe[src]'))
// require('nightmare-await-jquery-selectors');
const downOverYoutubeDL = require("../helpers/downOverYoutubeDL");

Nightmare.action('deferredWait', function (done) {
   var attempt = 0;
    var self = this;

    function doEval() {
        self.evaluate_now(
            function (done) {
                return(document.querySelector(selector) !== null);
            },
            function (result) {
                if (result) {
                    done(null, true);
                } else {
                    attempt++;
                    if (attempt < 10) {
                        setTimeout(doEval, 2000);
                    } else {
                        done(null, false);
                    }
                }
            },
            '#elem');
    };
    doEval();
    return this;

    /*this.evaluate_now((selector) => {
        //query the document for all elements that match `selector`
        //note that `document.querySelectorAll` returns a DOM list, not an array
        //as such, convert the result to an Array with `Array.from`
        //return the array result
        return Array.from(document.querySelectorAll(selector))
            //extract and return the text for each element matched
            .map((element) => element.innerText);
        //pass done as the first argument, other arguments following
    }, done, selector)*/
});

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
    overwrite,
    url = null
}) => {
    const courses = url ? sitemap.filter(course => course.value.includes(url)) : sitemap;

    if (!courses.length) {
        return console.log('No course(s) found for download')
    }
    console.log('Courses found:', courses.length);

    const n = Nightmare({
        Promise       : require('bluebird'),
        switches      : { 'force-device-scale-factor': '1' },
        show          : false, // Set to true while development
        frame         : true, //false
        useContentSize: true,
        //minHeight             : 4000,
        enableLargerThanScreen: true,
        width                 : 1595,
        waitTimeout           : 60e3,
        loadTimeout           : 45*1000,
        // waitTimeout: 5 * 1000,
        // maxHeight: 16384,
        // minHeight:7425,
        /*maxWidth              : 1595,
        minWidth              : 1595,*/
        // openDevTools: {
        //     mode: 'detach'
        // },
    })

    //login user
    await login(n, email, password)

    let cnt = 0;
    ms.add('capture', { text: `Start Nightmare Capturing...` });
    await Promise
        // .resolve(() => getCourses(n))
        .mapSeries(courses, async ({value}) => {//
            ms.update('capture', { text: `Nightmare Capturing course... ${++cnt} of ${courses.length} ${value}` });
            return await createPageCapturer(n, value, saveDir, videoFormat, quality, markdown, images, ms)
        }, {
            concurrency: 1
        })
        .then(async courses => {
            courses = courses.flat()
            await fs.ensureDir(path.resolve(process.cwd(), 'json'))
            await fs.writeFile(`./json/first-course-nightmare.json`, JSON.stringify(courses, null, 2), 'utf8')
            ms.succeed('capture', { text: `Capturing done for total lessons: ${cnt}...` });
            // console.log('1courses', courses);
            return courses.filter(c => !!c?.vimeoUrl)//.filter(Boolean)
        })
        .then(async courses => {
            if (videos) {
                // create new container
                await Promise.map(courses, async (lesson, index) => {
                    return await downOverYoutubeDL({
                        ...lesson,
                        overwrite,
                        index,
                        ms
                    })
                }, { concurrency: 10 })
            }
            return courses
        })
        .then(async (courses) => {
            await fs.ensureDir(path.resolve(process.cwd(), 'json'))
            await fs.writeFile(`./json/courses-new.json`, JSON.stringify(courses, null, 2), 'utf8')
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
                            path.join(saveDir, courseName, 'nightmare', 'screenshots'),
                            path.join(saveDir, courseName, 'nightmare', 'screenshots', `${courseName}.pdf`)
                        )
                    )
                    .then(() => {
                        ms.succeed('pdf', { text: `Pdf is done...` });
                        // return
                    })
            }
        })
        .catch(error => {
            console.error('nightmare error:', error)
        })
        .finally(async () => {
            ms.stopAll()
            await n.end()
        })


}


module.exports = scraper;
