const url = require('url')
const path = require('path')
const fs = require('fs-extra')
const cliProgress = require("cli-progress")
const _ = require("lodash");


const { login } = require("./helpers");
const createPageCapturer = require("./createPageCapturer")
const sitemap = require("../../json/sitemap.json");
const downloadVideo = require("../downloadVideo");
const imgs2pdf = require("../imgs2pdf");

const Spinnies = require('dreidels');
const ms = new Spinnies();

const Nightmare = require('nightmare')

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

    const n = Nightmare({
        switches      : { 'force-device-scale-factor': '1' },
        show          : true, // Set to true while development
        frame         : true, //false
        useContentSize: true,
        //minHeight             : 4000,
        enableLargerThanScreen: true,
        width                 : 1595,
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
        .mapSeries(courses, async (pageUrl) => {
            ms.update('capture', { text: `Nightmare Capturing... ${++cnt} of ${courses.length} ${pageUrl}` });
            return await createPageCapturer(n, pageUrl, saveDir, videoFormat, quality, markdown, images, ms)
        }, {
            concurrency: 1
        })
        .then(async courses => {
            await fs.ensureDir(path.resolve(process.cwd(), 'json'))
            await fs.writeFile(`./json/first-course-nightmare.json`, JSON.stringify(courses, null, 2), 'utf8')
            ms.succeed('capture', { text: `Capturing done for total lessons: ${cnt}...` });
            // console.log('1courses', courses);
            return courses.filter(c => !!c?.vimeoUrl)
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
                            path.join(process.cwd(), saveDir, courseName, 'nightmare-screenshots'),
                            path.join(process.cwd(), saveDir, courseName, 'nightmare-screenshots', `${courseName}.pdf`)
                        )
                    )
                    .then(() => {
                        ms.succeed('pdf', { text: `Pdf is done...` });
                        // return
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
