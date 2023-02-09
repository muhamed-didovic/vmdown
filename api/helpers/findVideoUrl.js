const { orderBy } = require("lodash");
const findVideoUrl = (str, pageUrl) => {
    // (?:\bconfig|window\.playerConfig)\s*=\s*({.+?};?\s*var)
    const regex = /\b(?:playerC|c)onfig\s*=\s*({.+?})(?:\s*;|\n)/ // /playerConfig = {(.*)}; var/gm
    let res = regex.exec(str);
    let configParsed;
    if (res !== null && typeof res[0] !== "undefined") {
        try {
            // console.log('res', res[1]);
            configParsed = res[1].trim().replace('var', '').trim().replace(/(;\s*$)/g, "");
            // configParsed = configParsed.replace(/(; var\s*$)/g, '');
            // configParsed = configParsed.replace(/(;\s*$)/g, '');
            // console.log('---', configParsed);
            configParsed = JSON.parse(`${configParsed}`);
            let progressive = configParsed.request.files.progressive;

            if (!progressive.length) {
                // console.log('Noooooooooooooooooooooooooooooooooooooooooooooooo', url);
                return null;
            }

            // console.log('progressive', url, progressive);
            let video = orderBy(progressive, ['width'], ['desc'])[0];
            // console.log('video', video);
            return video.url;
        } catch (err) {
            console.log('error with findVideoUrl:', url, '-->err:', err);
            console.log('json config:', configParsed);
            console.log('res:', res[1]);
            // await fs.writeFile(path.join(dest, 'markdown', `${course.title}.md`), md, 'utf8')//-${Date.now()}
            // fs.writeFileSync(`./json/test.txt`, res, 'utf8')
            throw err;
        }

    }
    console.log('NO VIDEO FOUND:', url);
    // fs.writeFileSync(`./json/no-config-found-${Date.now()}.txt`, str, 'utf8')
    return null;
}

module.exports = findVideoUrl;
