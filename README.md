# Downloader and scraper for vuemastery.com

[![npm](https://badgen.net/npm/v/vmdown)](https://www.npmjs.com/package/vmdown)
[![Downloads](https://img.shields.io/npm/dm/vmdown.svg?style=flat)](https://www.npmjs.org/package/vmdown)
[![Hits](https://hits.seeyoufarm.com/api/count/incr/badge.svg?url=https%3A%2F%2Fgithub.com%2Fmuhamed-didovic%2Fvmdown&count_bg=%2379C83D&title_bg=%23555555&icon=&icon_color=%23E7E7E7&title=hits&edge_flat=false)](https://hits.seeyoufarm.com)
[![license](https://flat.badgen.net/github/license/muhamed-didovic/vmdown)](https://github.com/muhamed-didovic/vmdown/blob/main/LICENSE)

## Requirement
- Node 18
- yt-dlp (https://github.com/yt-dlp/yt-dlp)
- If you have Apple silicon add: --arch=x64 when you want to install package

## Install
```sh
npm i -g vmdown
```

#### without Install
```sh
npx vmdown
```

## CLI
```sh
Usage
    $ vmdown [CourseUrl]

Options
    --all, -a           Get all courses
    --email, -e         Your email
    --password, -p      Your password
    --videos, -v        Save or skip saving of videos (default: true)
    --markdown, -m      Save each lesson's description into md file (default: true)
    --images, -i        Save each lesson's description into image (default: true)
    --pdf               Put all images into pdf (default: true)
    --extension, -x     Choose video format (default: mp4)
    --quality, -q       Choose quality from: 1080p / 720p / 540p / 360p / 240p (default: 1080p)
    --directory, -d     Directory to save (default: ./videos)
    --framework, -f     Framework to use between nightmare, puppeteer, puppeteer-cluster, puppeteer-socket and playwright (default: puppeteer) (Options available: 'p', 'n', 'pc', 'pw', 'ps')
    --overwrite, -o     Overwrite if resource exists (values: 'yes' or 'no'), default value is 'no'
    --headless, -h      Enable headless (values: 'yes' or 'no'), default value is 'yes'
    --concurrency, -c

Examples
    $ vmdown
    $ vmdown -a
    $ vmdown [url] [-e user@gmail.com] [-p password] [-d dirname] [-v true/false] [-m true/false] [-i true/false] [-pdf true/false] [-o yes/no] [-h yes/no] [-c number]
```

## License
MIT
