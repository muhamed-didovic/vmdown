const fs = require('fs');
const Path = require('path');
const fileSize = require('./fileSize')
const Axios = require('axios')

const getFilesizeInBytes = filename => {
    // console.log('stats', filename);
    let p = Path.resolve(__dirname, filename);
    return fs.existsSync(p) ? fs.statSync(p)["size"] : 0;
};

const downloadVideo = async (url, dest, ms, multibar) => {
    // console.log('URL', url);
    const remoteFileSize = await fileSize(url);
    //ms.add(url, { text: `Checking if video is downloaded: ${dest.split('/').pop()}` });
    /*if (remoteFileSize == getFilesizeInBytes(`${dest}`)) {
        //ms.succeed(url, { text: `Video exists: ${remoteFileSize}, ${getFilesizeInBytes(`${dest}`)} dest: ${dest}` });
        console.log(`Video exists: ${remoteFileSize}, ${getFilesizeInBytes(`${dest}`)} dest: ${dest}`);
        return Promise.resolve();
    }*/

    const { data, headers } = await Axios({
        url,
        method      : 'GET',
        responseType: 'stream'
    })
    const totalLength = headers['content-length']


    const m = multibar.create(totalLength, 0, {file: dest});
    //const b2 = multibar.create(1000, 0);

    const writer = fs.createWriteStream(
        Path.resolve(__dirname, dest)
    )
    let len = 0;
    data.on('data', (chunk) => {
        // console.log('chunk', chunk);
        //ms.update(url, {text : `chunk length: ${chunk.length}`})
        //progressBar.tick(chunk.length)
        m.update(len += chunk.length);//, {filename: "helloworld.txt"}
    })
    data.pipe(writer)

    return new Promise((resolve, reject) => {
        writer.on('finish', () => {
            //ms.succeed(url, { text: `Video download url: ${url}` });//
            m.stop()
            return resolve();
        })
        writer.on('error', reject)
    })

}


module.exports = downloadVideo;
