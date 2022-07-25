const fs = require("fs-extra");
const path = require("path");
const cliProgress = require("cli-progress");
const requestProgress = require("request-progress");
const request = require("request");

function createDownloader(options) {
  const { onFinish, onProgress } = options;
  let isDownloading = false;
  return {
    isWorking() {
      return isDownloading;
    },
    start(task) {
      if (fs.existsSync(task.filePath)) {
        onFinish(task);
        return;
      }
      const tempFileName = `${task.filePath}.downloading`;
      if (fs.existsSync(tempFileName)) {
        return;
      }
      isDownloading = true;
      requestProgress(request(task.url))
        .on('progress', (state) => onProgress(task, state))
        .on('end', () => {
          fs.moveSync(tempFileName, task.filePath);
          isDownloading = false;
          onFinish(task);
        })
        .on('error', () => {
          isDownloading = false;
        })
        .pipe(fs.createWriteStream(tempFileName));
    }
  }
}

const STATUS = {
  PENDING: 'pending    ',
  DOWNLOADING: 'downloading',
  COMPLETED: 'completed  '
}

function createDownloadManager(max) {
  const taskQueue = []
  const stateMap = new Map();
  const progressBarContainer = new cliProgress.MultiBar({
    clearOnComplete: false,
    hideCursor: true,
    format: '{status} [{bar}] {percentage}% | ETA: {eta}s | {value}/{total} | {filename}'
  }, cliProgress.Presets.rect);
  const progressMap = new Map();

  let progressTimer = null;
  function getProgressBar(filePath) {
    let progressBar = progressMap.get(filePath);
    if (!progressBar) {
      progressBar = progressBarContainer.create(100, 0, { filename: path.basename(filePath) })
      progressMap.set(filePath, progressBar);
    }
    return progressBar;
  }
  function onProgress(task, state) {
    const { filePath } = task;
    stateMap.set(filePath, state);
  }
  function onFinish(task) {
    const { filePath } = task;
    const state = stateMap.get(filePath);
    const progressBar = getProgressBar(filePath);
    progressBar.update(state.size.total, { status: STATUS.COMPLETED });
    progressMap.delete(filePath);
    stateMap.delete(filePath);
    schedule();
  }
  const downloaderPool = new Array(max).fill(0).map(() => createDownloader({
    onProgress,
    onFinish
  }));
  function schedule() {
    while (true) {
      const downloader = downloaderPool.find(d => !d.isWorking());
      if (downloader) {
        const task = taskQueue.shift();
        if (task) {
          downloader.start(task);
          continue;
        }
      }
      break;
    }
  }
  function progress() {
    clearTimeout(progressTimer);
    Array.from(stateMap.keys()).forEach(filePath => {
      const state = stateMap.get(filePath);
      const progressBar = getProgressBar(filePath);
      progressBar.setTotal(state.size.total);
      progressBar.update(state.size.transferred, { status: STATUS.DOWNLOADING });
    });
    taskQueue.forEach(({ filePath }) => {
      const progressBar = getProgressBar(filePath);
      progressBar.update(0, { status: STATUS.PENDING });
    })
    setTimeout(() => progress(), 1000);
  }
  progress();
  return {
    addTask(url, filePath) {
      const task = { url, filePath };
      taskQueue.push(task);
      schedule();
    }
  }
}

module.exports = {
  createDownloadManager
}