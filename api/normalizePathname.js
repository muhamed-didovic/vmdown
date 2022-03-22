const url = require('url')

module.exports = _path => {
    return (new url.URL(_path, 'https://thebook.io')).pathname.replace(/\/+$/, '')
}
