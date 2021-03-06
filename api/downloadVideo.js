const fs = require('fs');
const Path = require('path');
const remote = require('promisify-remote-file-size')
const Axios = require('axios')

const getFilesizeInBytes = filename => {
    let p = Path.resolve(__dirname, filename);
    return fs.existsSync(p) ? fs.statSync(p)["size"] : 0;
};

const downloadVideo = async (url, dest, ms, multibar) => {
    // console.log('URL', url);
    const remoteFileSize = await remote(url);
    if (remoteFileSize == getFilesizeInBytes(`${dest}`)) {
        console.log(`Video exists: ${remoteFileSize}, ${getFilesizeInBytes(`${dest}`)} dest: ${dest}`);
        return Promise.resolve();
    }

    const { data, headers } = await Axios({
        url,
        method      : 'GET',
        responseType: 'stream'
    })
    const totalLength = headers['content-length']
    const m = multibar.create(totalLength, 0, { filename: dest.split('/').pop() });

    const writer = fs.createWriteStream(
        Path.resolve(__dirname, dest)
    )
    let len = 0;
    data.on('data', (chunk) => {
        m.update(len += chunk.length);//, {filename: "helloworld.txt"}
    })
    data.pipe(writer)

    return new Promise((resolve, reject) => {
        writer.on('finish', () => {
            m.stop()
            return resolve();
        })
        writer.on('error', (error) => {
            m.stop()
            return reject(error);
        })
    })
}


module.exports = downloadVideo;
