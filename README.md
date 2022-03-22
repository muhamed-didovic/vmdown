# Downloader and scraper for vuemastery.com

[![npm](https://badgen.net/npm/v/vmdown)](https://www.npmjs.com/package/vmdown)

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
    --concurrency, -c

Examples
    $ vmdown
    $ vmdown -a
    $ vmdown [url] [-e user@gmail.com] [-p password] [-d dirname] [-v true/false] [-m true/false] [-i true/false] [--pdf true/false] [-c number]
```

## License
MIT
