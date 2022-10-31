// Check https://www.vuemastery.com/sitemap.xml For New Items
const https = require('https');
const path = require("path");
const fs = require("fs-extra");

async function getSitemapUrls() {
    return new Promise(function (resolve, reject) {
        https.get(`https://www.vuemastery.com/sitemap.xml`, res => {
            res.setEncoding("utf8");
            let body = "";
            res.on("data", data => {
                body += data;
            });
            res.on("end", () => {

                const regex = /www.vuemastery.com\/courses\/(.*?)<\/loc>/gui;
                let m;
                let out = [];
                while ((m = regex.exec(body)) !== null) {
                    if (m.index === regex.lastIndex) {
                        regex.lastIndex++;
                    }
                    m.forEach((match) => {
                        if (match.indexOf('<') < 0 && match.length){
                            console.log('match', match);
                            out.push(`https://www.vuemastery.com/courses/` + match);
                        }

                    });
                }
                console.log('Found videos or links:', out.length);
                resolve(out);
            });
            res.on('error', (e) => {
                reject(e)
            });
        });
    })
}

async function GetLinks() {
    let data = await getSitemapUrls();
    // const date = new Date().toISOString();
    //write course into file
    fs.writeFileSync(`./json/sitemap.json`, JSON.stringify(data, null, 2), 'utf8')
    console.log(`Courses and videos are saved in file: ${path.join(process.cwd(), `json/sitemap.json`)}`);
}

GetLinks();
// const a =  require('../json/sitemap.json').map(item => ({title: item.replace('https://www.vuemastery.com/courses/', ''), value: item}))
// console.log('await ', a);
