const test = require('ava')
const path = require('path')
const imgs2pdf = require('../api/imgs2pdf')
const fs = require('fs')

const IMGS = [...[...Array(3).keys()].map(n => buildPath(`fixtures/bundle/screens/${n}.png`))]
const SOURCE = buildPath('fixtures/bundle/screens') //tempy.file({extension: 'png'});
const DEST = buildPath('fixtures/bundle/screens/bundle.pdf')

test.after.always(() => fs.unlink(DEST, () => {}))

test('imgs2pdf', async t => {
    t.false(fs.existsSync(DEST))
    await imgs2pdf(IMGS, SOURCE, DEST)
    t.true(fs.existsSync(DEST))
    fs.copyFileSync(DEST, buildPath('snapshot/bundle.pdf'))
})

function buildPath (_path) {
    return path.join(__dirname, _path)
}
