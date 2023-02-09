// @ts-check
const fileSize = require('./fileSize')
const { formatBytes } = require('./writeWaitingInfo');
const FileChecker = require('./fileChecker');
const retries = require('./retrier');
const path = require('path')
const fs = require('fs-extra')
const Promise = require('bluebird')

// const youtubedl = require("youtube-dl-wrap")
const YTDlpWrap = require('yt-dlp-wrap').default;
// const youtubedl = require('yt-dlp-wrap').default;
// const youtubedl = require('yt-dlp-wrap-extended').default;
// const retry = require("./retry");

const getFilesizeInBytes = filename => {
    return fs.existsSync(filename) ? fs.statSync(filename)["size"] : 0;
};

const download = async (url, dest, {
    localSizeInBytes,
    remoteSizeInBytes,
    downFolder,
    index = 0,
    ms
}) => {

    //const videoLogger = FileChecker.createLogger(downFolder);
    await fs.remove(dest) // not supports overwrite..
    let name = dest + index;
    ms.update(name, {
        text : `to be processed by yt-dlp... ${dest.split('/').pop()} Found:${localSizeInBytes}/${remoteSizeInBytes}`,
        color: 'blue'
    });
    const youtubeDlWrap = new youtubedl()
    // console.log(`to be processed by yt-dlp... ${dest.split('/').pop()} Found:${localSizeInBytes}/${remoteSizeInBytes}`)
    return await retry(async () => {
        return new Promise(async (resolve, reject) => {
            let youtubeDlEventEmitter = await youtubeDlWrap
                .exec([
                    url,
                    '--all-subs',
                    '--referer', 'https://vuemastery.com/',
                    '-o', path.toNamespacedPath(dest),
                    '--socket-timeout', '10',
                    '--retries', 'infinite',
                    '--fragment-retries', 'infinite',
                    // '--no-check-certificate',
                    // '--download-archive', 'downloaded.txt'
                    // '--prefer-insecure'
                    // '--progress'
                ])
                .on("progress", (progress) => {
                    ms.update(name, { text: `${index}. Downloading: ${progress.percent}% of ${progress.totalSize} at ${progress.currentSpeed} in ${progress.eta} | ${dest.split('/').pop()} Found:${localSizeInBytes}/${remoteSizeInBytes}` })
                })
                // .on("youtubeDlEvent", (eventType, eventData) => console.log(eventType, eventData))
                .on("error", (error) => {
                    ms.remove(name, { text: error })
                    console.log('error--', error)
                    //ms.remove(dest);
                    /*fs.unlink(dest, (err) => {
                        reject(error);
                    });*/
                    reject(error);

                })
                /*.on('ytDlpEvent', (eventType, eventData) =>
                    console.log('eventType:',eventType, 'eventData:',eventData)
                )*/
                .on("close", () => {
                    //ms.succeed(dest, { text: `${index}. End download ytdl: ${dest} Found:${localSizeInBytes}/${remoteSizeInBytes} - Size:${formatBytes(getFilesizeInBytes(dest))}` })//.split('/').pop()
                    ms.remove(name);
                    console.log(`${index}. End download yt-dlp: ${dest} Found:${localSizeInBytes}/${remoteSizeInBytes} - Size:${formatBytes(getFilesizeInBytes(dest))}`);
                    // videoLogger.write(`${dest} Size:${getFilesizeInBytes(dest)}\n`);
                    FileChecker.writeWithOutSize(downFolder, dest)
                    resolve()
                })
        });
    }, 6, 1e3, true);

};

const retry = async (fn, retriesLeft = 5, interval = 1000, exponential = false, page = false) => {
    try {
        const val = await fn()
        return val
    } catch (error) {
        if (retriesLeft) {
            console.log('.... retrying left (' + retriesLeft + ')')
            console.log('retrying err', error)
            if (page) {
                const browserPage = await page.evaluate(() => location.href)
                console.log('----retrying err on url', browserPage)
                await fs.ensureDir(path.resolve(process.cwd(), 'errors'))
                await page.screenshot({
                    path: path.resolve(process.cwd(), `errors/${new Date().toISOString()}.png`),
                    // path    : path.join(process., sanitize(`${String(position).padStart(2, '0')}-${title}-full.png`)),
                    fullPage: true
                });
            }
            await new Promise(r => setTimeout(r, interval))
            return retry(fn, retriesLeft - 1, exponential ? interval*2 : interval, exponential, page)//page,
        } else {
            console.log('Max retries reached')
            throw error
        }
    }
}

const newDownload = async (url, dest, {
    // file,
    localSizeInBytes,
    remoteSizeInBytes,
    downFolder,
    index = 0,
    ms
}) => {
    return new Promise(async (resolve, reject) => {
        // console.log('file', file);
        // const { skipVimeoDownload, vimeoUrl } = file;

        // const videoLogger = createLogger(downFolder);
        // await fs.remove(dest) // not supports overwrite..
        //let name = dest + index;
        ms.update(dest, {
            text : `to be processed by yt-dlp... ${dest.split('/').pop()} Found:${localSizeInBytes}/${remoteSizeInBytes}`,
            color: 'blue'
        });
        // console.log(`to be processed by youtube-dl... ${dest.split('/').pop()} Found:${localSizeInBytes}/${remoteSizeInBytes} - ${url}`)
        // return Promise.resolve()
        // https://player.vimeo.com/texttrack/17477597.vtt?token=6321c441_0x383403d52f6fdaa619c98c88b50efbb63b6d0096

        // yt-dlp -v --retries 'infinite' --fragment-retries 'infinite' --referer "https://vuemastery.com/" "https://player.vimeo.com/video/429439600?h=73c87a798c&autoplay=1&app_id=122963"

        const ytDlpWrap = new YTDlpWrap();
        let ytDlpEventEmitter = ytDlpWrap
            .exec([
                url,

                "--write-subs",
                "--write-auto-sub",

                '--referer', 'https://vuemastery.com/',
                "-o", path.resolve(dest),
                '--socket-timeout', '5',

                // '-v',
                '--retries', 'infinite',
                '--fragment-retries', 'infinite'

                // "-o", path.toNamespacedPath(dest),
                // '--socket-timeout', '5',
                //...(skipVimeoDownload ? ['--skip-download'] : []),
            ])
            .on('ytDlpEvent', (eventType, eventData) =>
                // console.log(eventType, eventData)
                //65.0% of   24.60MiB at    6.14MiB/s ETA 00:01
                ms.update(dest, { text: `${eventType}: ${eventData} | ${dest.split('/').pop()} Found:${localSizeInBytes}/${remoteSizeInBytes}` })
            )
            // .on("youtubeDlEvent", (eventType, eventData) => console.log(eventType, eventData))
            .on("error", (error) => {
                // ms.remove(dest, { text: error })
                if (!error.message.includes('Unable to extract info section')) {
                    console.log('URL:', url, 'dest:', dest, 'error--', error)
                }
                console.log('------> tu smo');
                /*fs.unlink(dest, (err) => {
                    reject(error);
                });*/
                //return Promise.reject(error)
                //if (!error.message.includes('Unable to download video subtitles')) {
                reject(error);
                //}

            })
            .on("close", () => {
                //ms.succeed(dest, { text: `${index}. End download yt-dlp: ${dest} Found:${localSizeInBytes}/${remoteSizeInBytes} - Size:${formatBytes(getFilesizeInBytes(dest))}` })//.split('/').pop()
                // ms.remove(dest);
                console.log(`${index}. End download yt-dlp: ${dest} Found:${localSizeInBytes}/${remoteSizeInBytes} - Size:${formatBytes(getFilesizeInBytes(dest))}`);
                // videoLogger.write(`${dest} Size:${getFilesizeInBytes(dest)}\n`);
                FileChecker.writeWithOutSize(downFolder, dest)
                // videoLogger.write(`${dest} Size:${getFilesizeInBytes(dest)}\n`);
                // return Promise.resolve()
                resolve()
            })
    })
}

/**
 * @param file
 * @param {import("fs").PathLike} dest
 * @param downFolder
 * @param index
 * @param ms
 */
module.exports = async ({
    downFolder,
    dest,
    vimeoUrl: url,
    overwrite,
    index = (Math.random() + 1).toString(36).substring(7),
    ms
} = {}) => {
    //const dest = path.join(downloadFolder, course.title)
    // console.log('url', url);
    //const url = file.url;
    //let remoteFileSize = file.size;
    // const name = dest + index;
    ms.add(dest, { text: `Checking if video is downloaded: ${dest.split('/').pop()}` });
    // console.log(`Checking if video is downloaded: ${dest.split('/').pop()}`);

    //check if mpd is returned instead of mp4, so we need to check if we have video in videos.txt
    let isDownloaded = false;
    let localSize = getFilesizeInBytes(`${dest}`)
    let localSizeInBytes = formatBytes(getFilesizeInBytes(`${dest}`))

    isDownloaded = FileChecker.isCompletelyDownloadedWithOutSize(downFolder, dest)
    // console.log('isDownloaded', isDownloaded);

    if (isDownloaded && overwrite === 'no') {
        //ms.succeed(dest, { text: `${index}. Video already downloaded: ${dest.split('/').pop()} - ${localSizeInBytes}/${formatBytes(remoteFileSize)}` });
        ms.remove(dest);
        console.log(`${index}. Video already downloaded: ${dest.split('/').pop()} - ${localSizeInBytes}}`);// /${formatBytes(remoteFileSize)
        // console.log(`${index}. Video already downloaded: ${dest.split('/').pop()} - ${localSizeInBytes}/${formatBytes(remoteFileSize)}`.blue);
        // downloadBars.create(100, 100, { eta: 0, filename: dest })
        return;
    } else {
        ms.update(dest, { text: `${index} Start download video: ${dest.split('/').pop()} - ${localSizeInBytes}} ` });// /${formatBytes(remoteFileSize)
        // console.log(`${index} Start ytdl download: ${dest.split('/').pop()} - ${localSizeInBytes}/${formatBytes(remoteFileSize)} `);
        await retrier(async () => await newDownload(url, dest, {
                localSizeInBytes,
                remoteSizeInBytes: formatBytes(0),
                downFolder,
                index,
                ms
            })
        )
        ms.remove(dest)
    }
}

