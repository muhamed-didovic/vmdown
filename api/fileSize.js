const remote = require('remote-file-size')

const getFileSize = (url) => {
    return new Promise((resolve, reject) => {
        remote(url, function(err, size) {
            if( err ) reject(err);
            resolve(size);
        });
    });
}

module.exports = getFileSize;
