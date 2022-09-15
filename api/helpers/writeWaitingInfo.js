'use strict';

const cleanLine = require('./cleanLine')


function writeWaitingInfo(state, materialsName, ms, name, localSizeInBytes, remoteSizeInBytes) {
    // cleanLine();
    // console.log(value.percentage, value.totalSizeBytes, value.timeRemainingSeconds, value.rateBytesPerSecond)
    const percent   = (state.percentage*100).toFixed(2),
          // transferred = formatBytes(state.size.transferred),
          total     = formatBytes(state.totalSizeBytes),
          remaining = secondsToHms(state.timeRemainingSeconds),
          speed     = formatBytes(state.rateBytesPerSecond);
    // t = `Downloading: ${percent}% | ${transferred} / ${total} | ${speed}/sec | ${remaining} - ${materialsName}`,
    const t = `Downloading: ${state.percentage}% of ${total} at ${speed} in ${remaining} | ${name} Found:${localSizeInBytes}/${remoteSizeInBytes}`
    //process.stdout.write(text);
    // msg.text = t

    ms.update(name, { text: t, color: 'blue' });
}

function formatBytes(bytes, decimals) {
    if (bytes == 0) return '0 Bytes';
    let k     = 1024,
        dm    = decimals || 2,
        sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'],
        i     = Math.floor(Math.log(bytes)/Math.log(k));
    return parseFloat((bytes/Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

function secondsToHms(sec) {
    const h = Math.floor(sec/3600);
    const m = Math.floor(sec%3600/60);
    const s = Math.floor(sec%3600%60);
    var hh = h < 10 ? '0' + h : h;
    var mm = m < 10 ? '0' + m : m;
    var ss = s < 10 ? '0' + s : s;
    return `${hh}:${mm}:${ss}`;
}

module.exports = {
    writeWaitingInfo,
    formatBytes
}
