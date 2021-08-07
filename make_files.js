const fs = require('fs');
const path = require('path');

const YAML = require('yaml');
const _ = require('lodash');

const workDir = path.dirname(__filename);

const destImageDir = path.join(workDir, 'docs', '.vuepress', 'public', 'img');
const destMdDir = path.join(workDir, 'docs');
const vuepressConfigPath = path.join(workDir, 'docs', '.vuepress', 'config.json');

const configFilename = 'comtext.yml';

const sourceDir = '..';

const readYamlFile = (filename) => {
  const file = fs.readFileSync(filename, 'utf-8');
  return YAML.parse(file);
};

const readConfig = () => {
  const configPath = path.join(sourceDir, configFilename);
  return readYamlFile(configPath);
};

const config = readConfig();

const movePages = () => {
  config.pages.forEach((pageFilename) => {
    const sourseFilename = path.join(sourceDir, pageFilename);
    const destFilename = path.join(destMdDir, pageFilename);
    fs.copyFileSync(sourseFilename, destFilename);
  });
};

const concatFiles = (sourceFiles, destPath) => {
  const bookContent = sourceFiles.map((filename) => fs.readFileSync(filename, 'utf-8'));
  fs.writeFileSync(destPath, bookContent.join(''));
};

const moveBook = (bookConfigFilename) => {
  const bookConfig = readYamlFile(path.join(sourceDir, bookConfigFilename));
  const bookDir = path.join(sourceDir, path.dirname(bookConfigFilename));

  const bookFiles = bookConfig.files.map((filename) => path.join(bookDir, filename));
  const destBookPath = path.join(destMdDir, bookConfig.filename);

  concatFiles(bookFiles, destBookPath);

  if (_.has(bookConfig, 'cover')) {
    const sourceCoverPath = path.join(bookDir, bookConfig.cover);
    const destCoverPath = path.join(destImageDir, bookConfig.cover);
    fs.copyFileSync(sourceCoverPath, destCoverPath);
  }

  const sourceImagesPath = path.join(bookDir, 'img');

  if (fs.existsSync(sourceImagesPath)) {
    const images = fs.readdirSync(sourceImagesPath);
    images.forEach((imageFilename) => {
      const sourceImg = path.join(sourceImagesPath, imageFilename);
      const destImg = path.join(destImageDir, imageFilename);
      fs.copyFileSync(sourceImg, destImg);
    });
  }
};

const moveBooks = () => {
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

movePages();
moveBooks();
updateVuepressConfig();
