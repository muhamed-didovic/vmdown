const he = require('he')
// const delay = require("../delay")
const { createWebsocketMessageListener } = require("./message");
const { retry, makeScreenshot, parseMessage, downloadVideo } = require("./helpers");
const { NodeHtmlMarkdown } = require("node-html-markdown");
const nhm = new NodeHtmlMarkdown();

module.exports = async (page, coursesArray, link, downDir) => {
    const client = await page.target().createCDPSession();
    await client.send('Network.enable');
    await client.send('Page.enable');
    createWebsocketMessageListener(page, client)
        .register(async (message) => {
            const video = parseMessage(message);
            if (video && !coursesArray.includes(video.downloadLink)) {
                coursesArray.push(video.downloadLink)
                // console.log('video', video.downloadLink);
                await downloadVideo(video, page, nhm, downDir)
            }
        })

    await page.goto(he.decode(link), { waitUntil: ["networkidle2"], timeout: 61e3 });
    //check if source is locked
    /* let locked = await page.evaluate(
         () => Array.from(document.body.querySelectorAll('.locked-action'), txt => txt.textContent)[0]
     );
     if (locked) {
         console.log('LOCKEDDDDDDD');
         return;
     }*/
    await retry(async () => {//return
        console.log('URL TO VISIT', he.decode(link),);
        await page.waitForSelector('.video-wrapper iframe[src]')
    }, 6, 1e3, true)
    //await auth(page, email, password);
    await makeScreenshot(page, downDir);
    return Promise.resolve();
};


