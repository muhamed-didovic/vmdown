const delay = function(time) {
    return new Promise(function(resolve) {
        setTimeout(resolve, time);
    });
}

// const sleep = ms => new Promise(res => setTimeout(res, ms));

module.exports = delay;
