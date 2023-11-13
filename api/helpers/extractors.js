const path = require('path')
const fs = require("fs-extra");
const sanitize = require("sanitize-filename");
const downloadCode = require("./downloadCode");
const cheerio = require("cheerio");
function getGitHubZipUrl(githubUrl) {
    const urlParts = new URL(githubUrl);
    const pathParts = urlParts.pathname.split('/');

    // Check if the URL points to a specific branch or the main repository page
    if (pathParts.length === 3) {
        // Main repository page
        return `https://github.com/${pathParts[1]}/${pathParts[2]}/archive/main.zip`;
    } else if (pathParts.length > 4 && pathParts[3] === 'tree') {
        // Specific branch
        return `https://github.com/${pathParts[1]}/${pathParts[2]}/archive/${pathParts[4]}.zip`;
    } else {
        // Invalid URL format
        return 'Invalid GitHub URL';
    }
}

async function extractResources(page, dest, title, nhm, scraper) {
    let html;
    if (scraper === 'nightmare') {
        html = await page
            .wait('.body > .title')
            .wait('.lesson-body')
            .evaluate(function () {
                return Array.from(document.body.querySelectorAll('ul.styled-list'), txt => txt.outerHTML)[0]
            })
    } else {
        html = await page.evaluate(
            () => Array.from(document.body.querySelectorAll('ul.styled-list'), txt => txt.outerHTML)[0]
        );
    }
    //https://github.com/Code-Pop/Intro-to-Vue-3/tags
    // https://github.com/github/Code-Pop/Intro-to-Vue-3/archive/refs/heads/main.tar.gz
    // https://api.github.com/repos/codecourse/Intro-to-Vue-3/zipball
    //https://github.com/github/codeql/archive/refs/heads/main.tar.gz
    //https://github.com/<username>/<repository>/archive/<branch>.zip
    if (html?.includes('github.com')) {
        const $ = cheerio.load(html);
        let url = $('a').attr('href');
        url = getGitHubZipUrl(url);
        await downloadCode({
            url,//: `https://api.github.com/repos/codecourse/${ course.github_repository.split('/').pop() }/zipball`,
            downFolder: dest,
            dest: path.join(dest, `${ title }.zip`)
        })
    }

    //console.log('html', html);
    // if (html) {
    //     await fs.ensureDir(dest);
    //     await fs.writeFile(path.join(dest, `${title}.md`), nhm.translate(html), 'utf8')
    // }

    return html;
}

async function extractChallenges(page, dest, title, nhm, scraper) {
    let html;
    if (scraper === 'nightmare') {
        html = await page
            .wait('.body > .title')
            .wait('.lesson-body')
            .evaluate(function () {
                return Array.from(document.body.querySelectorAll('h3 + div'), txt => txt.outerHTML)[1]
            })
    } else {
        html = await page.evaluate(
            () => Array.from(document.body.querySelectorAll('h3 + div'), txt => txt.outerHTML)[1]
        );
    }

    if (html?.includes('github.com')) {
        const $ = cheerio.load(html);
        let url = $('a').attr('href');
        url = getGitHubZipUrl(url);

        await downloadCode({
            url,//: `https://api.github.com/repos/codecourse/${ course.github_repository.split('/').pop() }/zipball`,
            downFolder: dest,
            dest: path.join(dest, `${ title }-challenge.zip`)
        })
    }
    // console.log('html', html);
    // if (html) {
    //     await fs.ensureDir(dest);
    //     await fs.writeFile(path.join(dest, `${title}.md`), nhm.translate(html), 'utf8')
    // }

    return html;
}

module.exports = {
    extractResources,
    extractChallenges
}

