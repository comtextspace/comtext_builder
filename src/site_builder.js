const fs = require('fs');
const path = require('path');

const YAML = require('yaml');
const _ = require('lodash');

let workDir;
let destImageDir;
let destMdDir;
let vuepressConfigPath;

const IMAGE_DIR = 'img';

const configFilename = 'comtext.yml';

let sourceDir;

const readYamlFile = (filename) => {
  const file = fs.readFileSync(filename, 'utf-8');
  return YAML.parse(file);
};

const readConfig = () => {
  const configPath = path.join(sourceDir, configFilename);
  return readYamlFile(configPath);
};

let config;

const concatFiles = (sourceFiles) => {
  const bookContent = sourceFiles.map((filename) => fs.readFileSync(filename, 'utf-8'));
  return bookContent.join('');
};

const moveFiles = (soursePath, destPath) => {
  if (fs.existsSync(soursePath)) {
    const images = fs.readdirSync(soursePath);
    images.forEach((imageFilename) => {
      const sourceImg = path.join(soursePath, imageFilename);
      const destImg = path.join(destPath, imageFilename);
      fs.copyFileSync(sourceImg, destImg);
    });
  }
};

const movePages = () => {
  config.pages.forEach((pageFilename) => {
    const sourseFilename = path.join(sourceDir, pageFilename);
    const destFilename = path.join(destMdDir, pageFilename);
    fs.copyFileSync(sourseFilename, destFilename);
  });
  // перемещение изображений для страниц
  const sourceImagesPath = path.join(sourceDir, IMAGE_DIR);
  moveFiles(sourceImagesPath, destImageDir);
};

const moveBook = (bookConfigFilename) => {
  const bookConfig = readYamlFile(path.join(sourceDir, bookConfigFilename));
  const bookDir = path.join(sourceDir, path.dirname(bookConfigFilename));

  const bookFiles = bookConfig.files.map((filename) => path.join(bookDir, filename));
  const destBookPath = path.join(destMdDir, bookConfig.filename);

  console.log(bookFiles);

  let bookContent = concatFiles(bookFiles);

  if (_.has(bookConfig, 'cover')) {
    const sourceCoverPath = path.join(bookDir, bookConfig.cover);
    const destCoverPath = path.join(destImageDir, bookConfig.cover);
    fs.copyFileSync(sourceCoverPath, destCoverPath);

    const coverMdLink = `![](${path.join(IMAGE_DIR, bookConfig.cover)})`;
    bookContent = bookContent.replaceAll('[[cover]]', coverMdLink);
  }

  fs.writeFileSync(destBookPath, bookContent);

  const sourceImagesPath = path.join(bookDir, IMAGE_DIR);
  moveFiles(sourceImagesPath, destImageDir);
};

// eslint-disable-next-line consistent-return
const moveBooks = () => {
  if (config.books === null) {
    return null;
  }

  config.books.forEach((bookConfigFilename) => {
    moveBook(bookConfigFilename);
  });
};

const updateVuepressConfig = () => {
  const vuepressConfig = JSON.parse(fs.readFileSync(vuepressConfigPath, 'utf-8'));

  vuepressConfig.title = _.get(config, 'vuepress.title', '');
  vuepressConfig.base = _.get(config, 'vuepress.base', '/');

  fs.writeFileSync(vuepressConfigPath, JSON.stringify(vuepressConfig));
};

const build = (source = '..', dest = '.') => {
  sourceDir = source;
  workDir = dest;

  destImageDir = path.join(workDir, 'docs', '.vuepress', 'public', 'img');
  destMdDir = path.join(workDir, 'docs');
  vuepressConfigPath = path.join(workDir, 'docs', '.vuepress', 'config.json');

  config = readConfig();

  movePages();
  moveBooks();
  updateVuepressConfig();
};

module.exports.build = build;
