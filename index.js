const libs = require("./api/libs");
const cli = require("./api/cli.js");

/*const Bluebird = require('bluebird');
Bluebird.config({ longStackTraces: true });
global.Promise = Bluebird;*/

process.on('unhandledRejection', error => {
    // console.log('>>>>>error:', error);
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

        /*const map = {
            'n' : nightmareScraper,
            'p' : puppeteerScraper,
            'pw': playwright,
            'pc': puppeteerCluster,
            'ps': require("./api/puppeteer-socket/scraper")
        }*/
        const scrape = libs[options.framework] || libs.p;
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

