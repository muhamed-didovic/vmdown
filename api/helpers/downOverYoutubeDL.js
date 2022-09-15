// @ts-check
const fileSize = require('./fileSize')
const { formatBytes } = require('./writeWaitingInfo');
const FileChecker = require('./fileChecker');
const path = require('path')
const fs = require('fs-extra')
const Promise = require('bluebird')
const youtubedl = require("youtube-dl-wrap")
const retry = require("./retry");

const pRetry = require('@byungi/p-retry').pRetry
const pDelay = require('@byungi/p-delay').pDelay

const getFilesizeInBytes = filename => {
    return fs.existsSync(filename) ? fs.statSync(filename)["size"] : 0;
};

const download = (url, dest, {
    localSizeInBytes,
    remoteSizeInBytes,
    downFolder,
    index = 0,
    ms
}) => new Promise(async (resolve, reject) => {
    const videoLogger = FileChecker.createLogger(downFolder);
    await fs.remove(dest) // not supports overwrite..
    let name = dest + index;
    ms.update(name, {
        text : `to be processed by youtube-dl... ${dest.split('/').pop()} Found:${localSizeInBytes}/${remoteSizeInBytes}`,
        color: 'blue'
    });
    // console.log(`to be processed by youtube-dl... ${dest.split('/').pop()} Found:${localSizeInBytes}/${remoteSizeInBytes}`)
    await retry(async () => {
        const youtubeDlWrap = new youtubedl()
        let youtubeDlEventEmitter = youtubeDlWrap
            .exec([
                url,
                '--all-subs',
                '--referer', 'https://vuemastery.com/',
                "-o", path.toNamespacedPath(dest),
                '--socket-timeout', '5'
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
            .on("close", () => {
                //ms.succeed(dest, { text: `${index}. End download ytdl: ${dest} Found:${localSizeInBytes}/${remoteSizeInBytes} - Size:${formatBytes(getFilesizeInBytes(dest))}` })//.split('/').pop()
                ms.remove(name);
                console.log(`${index}. End download ytdl: ${dest} Found:${localSizeInBytes}/${remoteSizeInBytes} - Size:${formatBytes(getFilesizeInBytes(dest))}`);
                // videoLogger.write(`${dest} Size:${getFilesizeInBytes(dest)}\n`);
                FileChecker.writeWithOutSize(downFolder, dest)
                resolve()
            })

    }, 6, 1e3, true);
});

const downloadVideo = async (url, dest, {
    localSizeInBytes,
    remoteSizeInBytes,
    downFolder,
    index,
    ms
}) => {
    try {
        await pRetry(() => download(url, dest,
            {
                localSizeInBytes,
                remoteSizeInBytes,
                downFolder,
                index,
                ms
            }), {
            retries        : 3,
            onFailedAttempt: error => {
                console.log(`Attempt ${error.attemptNumber} failed. There are ${error.retriesLeft} retries left.`);
                // 1st request => Attempt 1 failed. There are 4 retries left.
                // 2nd request => Attempt 2 failed. There are 3 retries left.
                // …
            }
        })
    } catch (e) {
        console.log('eeee', e);
        ms.remove(dest, { text: `Issue with downloading` });
        //reject(e)
    }
}


/**
 * @param file
 * @param {import("fs").PathLike} dest
 * @param downFolder
 * @param index
 * @param ms
 */
module.exports = async ({ downFolder, dest, vimeoUrl: url, overwrite, index, ms } = {}) => {
    console.log('overwrite:', overwrite);
    //const {overwrite} = opts;
    //const dest = path.join(downloadFolder, course.title)
    // console.log('url', url);
    //const url = file.url;
    //let remoteFileSize = file.size;
    const name = dest + index;
    ms.add(name, { text: `Checking if video is downloaded: ${dest.split('/').pop()}` });
    // console.log(`Checking if video is downloaded: ${dest.split('/').pop()}`);

    //check if mpd is returned instead of mp4, so we need to check if we have video in videos.txt
    let isDownloaded = false;
    let localSize = getFilesizeInBytes(`${dest}`)
    let localSizeInBytes = formatBytes(getFilesizeInBytes(`${dest}`))

    isDownloaded = FileChecker.isCompletelyDownloadedWithOutSize(downFolder, dest)
    console.log('isDownloaded', isDownloaded);

    if (isDownloaded && overwrite === 'no') {
        //ms.succeed(name, { text: `${index}. Video already downloaded: ${dest.split('/').pop()} - ${localSizeInBytes}/${formatBytes(remoteFileSize)}` });
        ms.remove(name);
        console.log(`${index}. Video already downloaded: ${dest.split('/').pop()} - ${localSizeInBytes}}`);// /${formatBytes(remoteFileSize)
        // console.log(`${index}. Video already downloaded: ${dest.split('/').pop()} - ${localSizeInBytes}/${formatBytes(remoteFileSize)}`.blue);
        // downloadBars.create(100, 100, { eta: 0, filename: dest })
        return;
    } else {
        ms.update(name, { text: `${index} Start download video: ${dest.split('/').pop()} - ${localSizeInBytes}} ` });// /${formatBytes(remoteFileSize)
        // console.log(`${index} Start ytdl download: ${dest.split('/').pop()} - ${localSizeInBytes}/${formatBytes(remoteFileSize)} `);
        return await download(url, dest, {
            localSizeInBytes,
            remoteSizeInBytes: formatBytes(0),
            downFolder,
            index,
            ms
        });
    }
}

