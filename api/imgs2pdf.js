const PDFDocument = require('pdfkit')
const fs = require('fs-extra')
const imgSize = require('image-size')
const path = require("path");

const Bluebird = require('bluebird');
Bluebird.config({ longStackTraces: true });
global.Promise = Bluebird

/*const folderContents = async (folder) => {
    //const options = [];
    return await fs.readdirSync(folder, (err, files) => {
        //handling error
        if (err) {
            return console.log('Unable to scan directory: ' + err);
        }
        console.log('folder', folder, 'files', files);
        //listing all files using forEach
        return files
            .filter(file => {
                //options.push(path.join(folder, file));
                return file.includes('.png')
            })
            .map(file => {
                console.log('fileee:', file);
                return path.join(folder, file)
            });

        // console.log('options', options);
        //return options;
    });

}*/

const folderContents = async (folder) => {
    const options = [];
    await fs.readdir(folder, (err, files) => {
        //handling error
        if (err) {
            return console.log('Unable to scan directory: ' + err);
        }
        //listing all files using forEach
        files.forEach(function (file) {
            if (file.includes('.png')) {
                options.push(path.join(folder, file));
            }

        });
    });
    return options;
}
const convert = (imgs, dest) => new Promise((resolve, reject) => {
    const doc = new PDFDocument({ autoFirstPage: false })

    doc.pipe(fs.createWriteStream(dest))
        .on('finish', resolve)
        .on('error', reject)

    for (const img of imgs) {
        const { width, height } = imgSize(img)
        doc.addPage({ size: [width, height] }).image(img, 0, 0)
    }

    doc.end()
})

module.exports = async (images, courseName, saveDir) => {
    const savePath = path.join(process.cwd(), saveDir, courseName, 'screens');
    await fs.ensureDir(savePath)
    return Promise
        .resolve()
        .then(async () =>  await folderContents(savePath))
        .then(async (imgs) => {
            //console.log('--imgs', imgs);
            return await convert(imgs, path.join(savePath, `${courseName}.pdf`))
        })

}//();

