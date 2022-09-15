const Spinnies = require('dreidels');
const fs = require("fs-extra");
const path = require("path");
const delay = require("../helpers/delay");
const ms = new Spinnies();

const isLogged = async page => {
    try {
        const [notLogged, logged] = await Promise.all([
            (async () => {
                // check is 'Login' visible
                try {
                    let text = await page.$eval('#__layout > div > div > div > header > div > nav > div.navbar-secondary.notlogged > button.button.primary', txt => txt.textContent);
                    return text === 'Login'
                } catch (e) {
                    //console.log('1111', e);
                    return false;
                }

            })(),
            (async () => {
                //check if "Sign out" is visible
                try {
                    const text = await page.$eval('#__layout > div > div > div > header > div > nav > div.navbar-secondary > button', elem => elem.innerText)
                    return text === 'Sign Out'
                } catch (e) {
                    //console.log('22222', e);
                    return false;
                }
            })(),
        ])

        // console.log('text', { notLogged, logged });

        /*if (notLogged === 'Login') {
            return true
        }
        return false*/
        return logged && !notLogged;
    } catch (e) {
        //console.log('-----', e);
        return false;
    }
};

const auth = async (page, email, password) => {

    if (!email || !password) {
        console.log('No Credentials');
        return
    }

    const logged = await isLogged(page)
    if (logged) {
        return;
    }
    const name = `login_${Math.random().toString().replace(/\./,'')}`
    ms.add(name, { text: `Checking authentication...` });
    // ms.update(name, { text: "User is not logged in, trying login...." });
    await page.waitForSelector('text=Login')
    await page.click('text=Login')

    await page.fill('form > div:nth-child(3) > input', email)
    await page.fill('form > div.form-group.-inline > input', password)
    await page.click('form > div.form-actions > button')
    await page.waitForSelector('#__layout > div > div > div > header > div > nav > div.navbar-secondary > a')
    const text = await page.$eval('#__layout > div > div > div > header > div > nav > div.navbar-secondary > button', elem => {
        return elem.innerText;
    })
    // console.log('text', text);
    if (text !== 'Sign Out') {
        // ms.fail(name, { text: "Cannot login. Check your user credentials. \n WARNING: Just free videos will be downloaded" });
        ms.remove(name)
        throw new Error('Auth failed')
    }
    // await browser.close()
    // console.log("User successfully logged in.");
    // ms.succeed(name, { text: "User successfully logged in." });
    ms.remove(name)
    return true;
};

/**
 * Retries the given function until it succeeds given a number of retries and an interval between them. They are set
 * by default to retry 5 times with 1sec in between. There's also a flag to make the cooldown time exponential
 * @author Daniel Iñigo <danielinigobanos@gmail.com>
 * @param {Function} fn - Returns a promise
 * @param {Number} retriesLeft - Number of retries. If -1 will keep retrying
 * @param {Number} interval - Millis between retries. If exponential set to true will be doubled each retry
 * @param {Boolean} exponential - Flag for exponential back-off mode
 * @return {Promise<*>}
 */
async function retry(fn, retriesLeft = 5, interval = 1000, exponential = false) {
    try {
        const val = await fn();
        return val;
    } catch (error) {
        if (retriesLeft) {
            console.log('....playwright retrying left (' + retriesLeft + ')');
            console.error('playwright retrying error:', error);
            await new Promise(r => setTimeout(r, interval));
            return retry(fn, retriesLeft - 1, exponential ? interval*2 : interval, exponential);
        } else {
            console.log('Max retries reached');
            throw error
            //throw new Error('Max retries reached');
        }
    }
}


module.exports = {
    retry,
    auth,
}
