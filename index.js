const puppeteerScraper = require("./api/puppeteer/scraper");
const nightmareScraper = require("./api/nightmare/scraper");
const cli = require("./api/cli.js");

const Bluebird = require('bluebird');
Bluebird.config({ longStackTraces: true });
global.Promise = Bluebird

const main = async () => {
    try {
        console.time();
        const options = await cli();
        console.log('options', options);
        if (options.framework === 'n') {
            await nightmareScraper({ ...options })
        } else {
            await puppeteerScraper({ ...options });
        }

        console.log("\x1b[36m%s\x1b[0m", "\n\n All downloads finished.\n");
        console.timeEnd();
    } catch (err) {
        console.error('Error thrown', err);
    }
};

main();
