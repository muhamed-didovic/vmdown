// const playwright = require("../api/playwright/scraper");
// const puppeteerScraper = require("./api/puppeteer/scraper");
// const puppeteerCluster = require("./api/puppeteer-cluster/scraper");
// const nightmareScraper = require("./api/nightmare/scraper");
// const puppeteerSocket = require("./api/puppeteer-socket/scraper");

/*const map = {
    'n' : nightmareScraper,
    'p' : puppeteerScraper,
    'pw': playwright,
    'pc': puppeteerCluster,
    'ps': require("../api/puppeteer-socket/scraper")
}*/

libs = module.exports;

// Lazy load only on usage
libs.__defineGetter__("n", function () {
    return require("../api/nightmare/scraper");
});

libs.__defineGetter__("p", function () {
    return require("../api/puppeteer/scraper");
});

libs.__defineGetter__("pw", function () {
    return require("../api/playwright/scraper");
});

libs.__defineGetter__("pc", function () {
    return require("../api/puppeteer-cluster/scraper")
});

libs.__defineGetter__("ps", function () {
    return require("../api/puppeteer-socket/scraper");
});
