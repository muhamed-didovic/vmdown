const downloadCourse = require("./api/downloadCourse.js");
const cli = require("./api/cli.js");

const main = async () => {
    try {
        console.time();
        const options = await cli();
        // console.log('options', options);

        await downloadCourse({ ...options });
        console.log("\x1b[36m%s\x1b[0m", "\n\n All downloads finished.\n");
        console.timeEnd();
    } catch (err) {
        console.error('Error thrown', err);
    }
};

main();
