const path = require("path");
const fs = require("fs-extra");
const remote = require('promisify-remote-file-size')
const {
          getCourseName,
          getValidFileName,
          saveTextFile
      } = require("./helpers");
const { createDownloadManager } = require("./downloader")
const Path = require("path");
const delay = require("../delay");


const downloadManager = createDownloadManager(5);

function parseMessage(message) {
    try {
        const json = JSON.parse(message);
        if (json?.d?.b?.p === 'flamelink/environments/production/content/lessons/en-US') {
            const courseInfo = json.d.b.d;
            // console.log('courseInfo', courseInfo);
            const firstKey = Array.from(Object.keys(courseInfo))[0];
            // console.log('firstKey', firstKey);
            if (Number.isInteger(+firstKey)) {
                return courseInfo[firstKey];
            }
        }
        return null;
    } catch (error) {
        console.error(error);
        return null;
    }
}

const getFilesizeInBytes = filename => {
    let p = Path.resolve(__dirname, filename);
    return fs.existsSync(p) ? fs.statSync(p)["size"] : 0;
};

const downloadVideo = async (video, page, nhm) => {
    const courseName = getCourseName(page) || video.belongsToCourse.toString();

    //path.join(process.cwd(), 'videos', courseName, `${newTitle}${videoFormat}`)
    // console.log('---------------courseName', courseName, 'page.url()', page.url());
    const directory = path.resolve(process.cwd(), 'videos', courseName);
    await fs.ensureDir(directory);
    await fs.ensureDir(path.join(directory, 'markdown-ps'))

    const title = await getValidFileName(page);//, video.title
    const fileName = title; //`${video.lessonNumber}. ${title}`

    //save resources
    if (video?.resources) {
        const resources = Object
            .values(video.resources)
            .map(item => {
                return Object.values(item)[0]
            })
            .join('<br>')
        // console.log('resources', resources);
        await fs.writeFile(path.join(process.cwd(), 'videos', courseName, 'markdown-ps', `${fileName}-resources.md`), nhm.translate(resources), 'utf8')
    }
    //save markdown
    await saveTextFile(video.markdown, path.resolve(directory, 'markdown-ps', `${fileName}.md`));


    const remoteFileSize = await remote(video.downloadLink);
    const dest = path.join(process.cwd(), 'videos', courseName, `${fileName}.mp4`);
    // console.log('dest', dest)
    // console.log('size', remoteFileSize,  getFilesizeInBytes(dest), 'page.url()', page.url())
    if (remoteFileSize == getFilesizeInBytes(dest)) {
        console.log(`Video exists: ${remoteFileSize}, ${getFilesizeInBytes(`${dest}`)} dest: ${dest}`);
        return Promise.resolve();
    } else {
        console.log('--------file not found:', dest, 'page.url()', page.url());
        //remove file just in case
        await fs.remove(dest)
    }

    downloadManager.addTask(video.downloadLink, path.resolve(directory, `${fileName}.mp4`));
};

module.exports = {
    downloadVideo,
    parseMessage,
    getValidFileName
}
