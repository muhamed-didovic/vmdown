const playwright = require("./api/playwright/scraper");
const puppeteerScraper = require("./api/puppeteer/scraper");
const nightmareScraper = require("./api/nightmare/scraper");

const cli = require("./api/cli.js");

const Bluebird = require('bluebird');
Bluebird.config({ longStackTraces: true });
global.Promise = Bluebird;

process.on('unhandledRejection', error => {
    //TypeError: Cannot read properties of null (reading 'session')
    // TypeError: Cannot read properties of null (reading '_sendMayFail')
    if (!error.message.includes('Cannot read properties of null (')) {
        console.error('!!!!!!!!Here is unhandledRejection:', error);
    }
});

(async () => {
    try {
        console.time();
        const options = await cli();
        console.log('options', options);

        const map = {
            'n' : nightmareScraper,
            'p' : puppeteerScraper,
            'pw': playwright
        }
        const scrape = map[options.framework] || map.p;
        await scrape({...options})
        /*if (options.framework === 'pw'){
            await playwright({...options});
        } else if (options.framework === 'p'){
            await puppeteerScraper({...options});
        } else if (options.framework === 'n'){
            await nightmareScraper({...options});
        }*/

        console.log("\x1b[36m%s\x1b[0m", "\n\n All downloads finished.\n");
        console.timeEnd();
    } catch (err) {
        console.error('Error thrown', err);
    }
})();

