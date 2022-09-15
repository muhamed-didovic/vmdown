const path = require("path");

/**
 * Retries the given function until it succeeds given a number of retries and an interval between them. They are set
 * by default to retry 5 times with 1sec in between. There's also a flag to make the cooldown time exponential
 * @param {Function} fn - Returns a promise
 * @param {Number} retriesLeft - Number of retries. If -1 will keep retrying
 * @param {Number} interval - Millis between retries. If exponential set to true will be doubled each retry
 * @param page
 * @param {Boolean} exponential - Flag for exponential back-off mode
 * @return {Promise<*>}
 */
const retry = async (fn, retriesLeft = 5, interval = 1000, exponential = false) => {
    try {
        const val = await fn()
        return val
    } catch (error) {
        if (retriesLeft) {
            console.log('.... retrying left (' + retriesLeft + ')')
            console.log('retrying err', error)
            await fs.ensureDir(path.resolve(process.cwd(), 'errors'))
            await page.screenshot({
                path: path.resolve(process.cwd(), `errors/${new Date().toISOString()}.png`),
                // path    : path.join(process., sanitize(`${String(position).padStart(2, '0')}-${title}-full.png`)),
                fullPage: true
            });
            await new Promise(r => setTimeout(r, interval))
            return this.retry(fn, retriesLeft - 1, exponential ? interval*2 : interval, page, exponential)
        } else {
            console.log('Max retries reached')
            throw error
        }
    }
}

module.exports = retry;
