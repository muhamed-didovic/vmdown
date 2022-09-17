const retry = require("../helpers/retry");
const he = require("he");
const auth = async (page, email, password) => {
    return await retry(async () => {//return
        await page.waitForSelector('button[data-test="loginBtn"]')
        await page.click('button[data-test="loginBtn"]')

        await page.waitForSelector('input[placeholder="Account Email"]')
        await page.focus('input[placeholder="Account Email"]');
        await page.keyboard.type(email)
        await page.focus('input[placeholder="Password"]');
        await page.keyboard.type(password)

        // await page.click('form > div.form-actions > button')
        await page.waitForSelector('button[data-test="signSubmit"]')
        await page.click('button[data-test="signSubmit"]')
        await page.waitForSelector('button[data-test="signOut"]')
        const text = await page.$eval('#__layout > div > div > div > header > div > nav > div.navbar-secondary > button', elem => {
            return elem.innerText;
        })
        // console.log('1text---', text);
        if (text !== 'Sign Out') {
            // ms.fail(name, { text: "Cannot login. Check your user credentials. \n WARNING: Just free videos will be downloaded" });
            throw new Error('Auth failed')
        }
        return true;
    }, 6, 1e3, true)


    // const cookies = await page.cookies()
    // const cookieJson = JSON.stringify(cookies)
    // fs.writeFileSync('cookies.json', cookieJson)


    /*await page.click('button[class="button inverted"]');
    await page.click('button[class="button link"]');

    await page.focus('input[data-test="inputEmail"]');
    await page.keyboard.type(email)
    await page.focus('input[data-test="inputPassword"]');
    await page.keyboard.type(password)

    await page.click('button[class="button primary -full"]')
    await page.click('button[class="button primary -full"]')*/
}

module.exports = auth;
