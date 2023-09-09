const meow = require('meow')
const prompts = require('prompts')
const path = require('path')
const fs = require('fs-extra')
const isValidPath = require('is-valid-path')
const isEmail = require('util-is-email').default
const Fuse = require('fuse.js')
const { uniqBy } = require("lodash");
const cheerio = require("cheerio");
const req = require('requestretry');
const j = req.jar();
const request = req.defaults({ jar: j, retryDelay: 500, fullResponse: true });

const cli = meow(`
Usage
    $ vmdown [CourseUrl]

Options
    --all, -a           Get all courses
    --email, -e         Your email
    --password, -p      Your password
    --videos, -v        Save or skip saving of videos (default: true)
    --markdown, -m      Save each lesson's description into md file (default: true)
    --images, -i        Save each lesson's description into image (default: true)
    --pdf               Put all images into pdf (default: true)
    --extension, -x     Choose video format (default: .mp4)
    --quality, -q       Choose quality from: 1080p / 720p / 540p / 360p / 240p (default: highest available)
    --directory, -d     Directory to save (default: ./videos)
    --framework, -f     Framework to use between nightmare, puppeteer, puppeteer-cluster, puppeteer-socket and playwright (default: puppeteer) (Options available: 'p', 'n', 'pc', 'pw', 'ps)
    --overwrite, -o     Overwrite if resource exists (values: 'yes' or 'no'), default value is 'no'
    --headless, -h      Enable headless (values: 'yes' or 'no'), default value is 'yes'
    --concurrency, -c

Examples
    $ vmdown
    $ vmdown -a
    $ vmdown [url] [-e user@gmail.com] [-p password] [-d dirname] [-v true/false] [-m true/false] [-i true/false] [--pdf true/false] [-o yes/no] [-h yes/no] [-c number]
`, {
    hardRejection: false,
    flags        : {
        help       : { alias: 'h' },
        version    : { alias: 'v' },
        email      : { type: 'string', alias: 'e' },
        password   : { type: 'string', alias: 'p' },
        all        : { type: 'boolean', alias: 'a' },
        markdown   : { type: 'boolean', alias: 'm', default: true },
        videos     : { type: 'boolean', alias: 'v', default: true },
        images     : { type: 'boolean', alias: 'i', default: true },
        pdf        : { type: 'boolean', default: true },
        directory  : { type: 'string', alias: 'd' },//, default: process.cwd()
        extension  : { type: 'string', alias: 'x', default: '.mp4' },
        quality    : { type: 'string', alias: 'q', default: '1080p' },
        concurrency: { type: 'number', alias: 'c', default: 10 },
        framework  : { type: 'string', alias: 'f', default: 'p' },
        overwrite  : { type: 'string', alias: 'o', default: 'no' },
        headless  : { type: 'string', alias: 'h', default: 'yes' },

    }
})

// https://player.vimeo.com/external/364140610.hd.mp4?s=427585ece1589ab3e99bd4f3348d9a51519b4152&profile_id=175&download=1
// https://vod-progressive.akamaized.net/exp=1673964257~acl=%2Fvimeo-prod-skyfire-std-us%2F01%2F2828%2F14%2F364140610%2F1948098428.mp4~hmac=d33cfb14b8aeab2f4116214f750d51b2922da8b75a7ad7b3088bcda26a9188dc/vimeo-prod-skyfire-std-us/01/2828/14/364140610/1948098428.mp4
// const errorHandler = err => (console.log('\u001B[1K'), logger.fail(String(err)), process.exit(1))
// const errorHandler = err => (console.error(err), logger.fail(String(err)), process.exit(1))
// const errorHandler = err => console.error('err:', err)

const getCoursesForSearch = async (searchFromLocalFile) => {
    if (searchFromLocalFile && await fs.exists(path.resolve(__dirname, 'json/search-courses.json'))) {
        console.log('LOAD FROM LOCAL SEARCH FILE');
        return require(path.resolve(__dirname, 'json/search-courses.json'))
    }

    const { body } = await request(`https://www.vuemastery.com/courses/`)
    const $ = cheerio.load(body)

    let courses = $('.playlist-card:not(.nuxt-link-active)')
        .map((i, elem) => {
            // console.log('--', $(elem).find('.playlist-card-content-title').text())
            // console.log($(elem).attr('href'));
            return {
                title: $(elem).find('.playlist-card-content-title').text(),
                value: `https://www.vuemastery.com${$(elem).attr('href')}`,
                //url  : $(elem).attr('href'),

            }
        })
        .get();
    courses = uniqBy(courses, 'title')
    await fs.writeFile(`./json/search-courses.json`, JSON.stringify(courses, null, 2), 'utf8')
    return courses
}
const askOrExit = question => prompts({ name: 'value', ...question }, { onCancel: () => process.exit(0) }).then(r => r.value);

const folderContents = async (folder) => {
    const options = [];
    await fs.readdir(folder, function (err, files) {
        //handling error
        if (err) {
            return console.log('Unable to scan directory: ' + err);
        }
        //listing all files using forEach
        files.forEach(function (file) {
            options.push({
                title: file,
                value: path.join(folder, file)
            });
        });
    });
    return options;
}

async function commonFlags(flags) {
    const email = flags.email || await askOrExit({
        type    : 'text',
        message : 'Enter email',
        validate: isEmail
    })
    const password = flags.password || await askOrExit({
        type    : 'password',
        message : 'Enter password',
        validate: value => value.length < 5 ? `Sorry, password must be longer` : true
    })

    const downDir = flags.directory
        ? path.resolve(flags.directory)
        : path.resolve(await askOrExit({
            type    : 'text',
            message : `Enter a directory to save a file (eg: ${path.resolve(process.cwd())})`,
            initial : './videos',
            validate: isValidPath
        }))

    const videos = flags.videos || await askOrExit({
        type    : 'toggle',
        name    : 'value',
        message : 'Include videos if it exists?',
        initial : flags.videos,
        active  : 'yes',
        inactive: 'no'
    })

    const markdown = flags.markdown || await askOrExit({
        type    : 'toggle',
        name    : 'value',
        message : 'Save each lesson\'s description into md file',
        initial : flags.markdown,
        active  : 'yes',
        inactive: 'no'
    })

    const images = flags.images || await askOrExit({
        type    : 'toggle',
        name    : 'value',
        message : 'Save each lesson\'s description into image',
        initial : flags.images,
        active  : 'yes',
        inactive: 'no'
    })
    const pdf = flags.pdf || await askOrExit({
        type    : 'toggle',
        name    : 'value',
        message : 'Save all images into pdf',
        initial : flags.pdf,
        active  : 'yes',
        inactive: 'no'
    })
    const concurrency = flags.concurrency || await askOrExit({
        type   : 'number',
        message: `Enter concurrency`,
        initial: 10
    })

    const extension = ['.mp4'].includes(flags.extension)
        ? flags.extension
        : await askOrExit({
            type   : 'select',
            message: 'Which format of videos should be used for download?',
            choices: [
                {
                    title: 'MP4',
                    value: '.mp4',
                }
            ],
            initial: 0
        })

    const quality = ['1080p', '720p', '540p', '360p', '240p'].includes(flags.quality)
        ? flags.quality
        : await askOrExit({
            type   : 'select',
            message: 'Which quality should be downloaded?',
            choices: [
                {
                    title: '1080p',
                    value: '1080p',
                },
                {
                    title: '720p',
                    value: '720p',
                },
                {
                    title: '540p',
                    value: '540p',
                },
                {
                    title: '360p',
                    value: '360p',
                },
                {
                    title: '240p',
                    value: '240p',
                }

            ],
            initial: 0
        })

    const framework = ['n', 'p', 'pw', 'pc', 'ps'].includes(flags.framework)
        ? flags.framework
        : await askOrExit({
            type   : 'select',
            message: 'Which framework do you want to use?',
            choices: [
                {
                    title: 'Puppeteer',
                    value: 'p',
                },
                {
                    title: 'Nightmare',
                    value: 'n',
                },
                {
                    title: 'Playwright',
                    value: 'pw',
                },
                {
                    title: 'Puppeteer-cluster',
                    value: 'pc',
                },
                {
                    title: 'Puppeteer-socket',
                    value: 'ps',
                },
            ],
            initial: 0
        })

    const overwrite = (['yes', 'no', 'y', 'n'].includes(flags.overwrite)
        ? flags.overwrite
        : await askOrExit({
            type   : 'select',
            message: 'Do you want to overwrite when the file name is the same?',
            choices: [
                {
                    title: 'Yes',
                    value: 'yes'
                },
                {
                    title: 'No',
                    value: 'no'
                }
            ],
            initial: 1
        }))

    const headless = (['yes', 'no', 'y', 'n'].includes(flags.headless)
        ? flags.headless
        : await askOrExit({
            type   : 'select',
            message: 'Enable headless?',
            choices: [
                {
                    title: 'Yes',
                    value: 'yes'
                },
                {
                    title: 'No',
                    value: 'no'
                }
            ],
            initial: 1
        }))

    return {
        email,
        password,
        downDir,
        videos,
        markdown,
        images,
        concurrency,
        extension,
        quality,
        pdf,
        framework,
        overwrite,
        headless
    };
}

module.exports = async () => {
    console.log('__dirname ', __dirname );
    console.log('__filename', __filename);
    console.log('fs.realpathSync(__filename)', fs.realpathSync(__filename));
    const { flags, input } = cli
    let all = flags.all
    let fileChoices;

    // console.log('cli', { flags, input });
    // const fileChoices = await folderContents(path.resolve(process.cwd(), 'json'))

    if (all || (input.length === 0 && await askOrExit({
        type: 'confirm', message: 'Do you want all courses?', initial: false
    }))) {
        const file = flags.file || await askOrExit({
            type   : (fileChoices = await folderContents(path.resolve(__dirname, 'json'))).length ? 'confirm' : null,
            message: 'Do you want download from a file',
            initial: false
        })
        const filePath = flags.file || await askOrExit({
            type   : (file && fileChoices.length) ? 'autocomplete' : null,
            message: `Enter a file path eg: ${path.resolve(__dirname, 'json/*.json')} `,
            choices: fileChoices,
            //validate: isValidPath
        })
        const options = await commonFlags(flags);
        return ({ ...options })//file, filePath,
    }

    //check if course url is provided, if yes then hide the options
    const searchOrDownload = flags.file || await askOrExit({
        type   : input.length === 0 ? 'confirm' : null,
        message: 'Choose "Y" if you want to search for a course otherwise choose "N" if you have a link for download',
        initial: true
    })

    if (input.length === 0 && searchOrDownload === false) {
        input.push(await askOrExit({
            type    : 'text',
            message : 'Enter url for download.',
            initial : 'https://www.vuemastery.com/courses/intro-to-vue-3/intro-to-vue3', //'https://www.vuemastery.com/courses/intro-to-vue-js',
            validate: value => value.includes('vuemastery.com') ? true : 'Url is not valid'
        }))
    } else {
        let searchCoursesFile = false;
        if (await fs.exists(path.resolve(__dirname, 'json/search-courses.json'))) {
            searchCoursesFile = true;
        }
        const foundSearchCoursesFile = await askOrExit({
            type   : (searchCoursesFile && input.length === 0 && !flags.file) ? 'confirm' : null,
            message: 'Do you want to search for a courses from a local file (which is faster)',
            initial: true
        })
        input.push(await askOrExit({
            type   : input.length === 0 ? 'autocomplete' : null,
            message: 'Search for a course',
            choices:  await getCoursesForSearch(foundSearchCoursesFile),
            suggest: (input, choices) => {
                if (!input) return choices;
                // reset = true;
                const fuse = new Fuse(choices, {
                    keys: ['title', 'value']
                })
                return fuse.search(input).map(i => i.item);
            },
        }))
    }

    const options = await commonFlags(flags);
    // const dir = await askSaveDirOrExit()
    const courseUrl = input[0]
    return ({ url: courseUrl, ...options })
}
