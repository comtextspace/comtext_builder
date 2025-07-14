const fs = require("fs");
const path = require("path");

const YAML = require("yaml");
const _ = require("lodash");

const { execSync } = require("child_process");

let workDir;
let destImageDir;
let destPublicDir;
let destMdDir;
let destFilesDir;
let vuepressConfigPath;

const IMAGE_DIR = "img";
const FILE_DIR = "files";

const configFilename = "comtext.yml";

let sourceDir;

const readYamlFile = (filename) => {
  const file = fs.readFileSync(filename, "utf-8");
  return YAML.parse(file);
};

const readConfig = () => {
  const configPath = path.join(sourceDir, configFilename);
  return readYamlFile(configPath);
};

let config;

const concatFiles = (sourceFiles) => {
  const bookContent = sourceFiles.map((filename) =>
    fs.readFileSync(filename, "utf-8")
  );
  return bookContent.join("");
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

const moveBookFromConfig = (bookConfigFilename) => {
  console.log('moveBookFromConfig: ' + bookConfigFilename)
  const bookConfig = readYamlFile(path.join(sourceDir, bookConfigFilename));
  const bookDir = path.join(sourceDir, path.dirname(bookConfigFilename));

  const bookFiles = bookConfig.files.map((filename) =>
    path.join(bookDir, filename)
  );
  const destBookPath = path.join(destMdDir, bookConfig.filename);
  const destFilePath = path.join(
    destFilesDir,
    bookConfig.filename.replace(".md", ".ct")
  );

  let bookContent = concatFiles(bookFiles);

  if (_.has(bookConfig, "cover")) {
    const sourceCoverPath = path.join(bookDir, bookConfig.cover);
    const destCoverPath = path.join(destImageDir, bookConfig.cover);
    fs.copyFileSync(sourceCoverPath, destCoverPath);

    const coverMdLink = `![](/${path.join(IMAGE_DIR, bookConfig.cover)})`;
    bookContent = bookContent.replace("[[cover]]", coverMdLink);
  }

  fs.writeFileSync(destBookPath, bookContent);
  fs.writeFileSync(destFilePath, bookContent);

  const sourceImagesPath = path.join(bookDir, IMAGE_DIR);
  moveFiles(sourceImagesPath, destImageDir);

  const fb2FilePath = path.join(
    destFilesDir,
    bookConfig.filename.replace(".md", ".fb2")
  );

  if (!_.has(bookConfig, "export")) {
    return
  }

  if (bookConfig.export.includes('fb2')) {
    console.log('Export to fb2');
    
    const pandocCommand =
      `pandoc ${destFilePath} ` +
      `-s -f markdown -t fb2 -o ${fb2FilePath} ` +
      `--resource-path=${destPublicDir} ` +
      `--lua-filter=src/pandoc/filter.lua`;

    const res = execSync(pandocCommand);
    console.log(pandocCommand);
    console.log('' + res);
  }
};

const moveBookMd = (bookMdFilename) => {
  console.log('moveBookMd: ' + bookMdFilename)
  const bookFilename = path.join(sourceDir, bookMdFilename);
  const bookDir = path.join(sourceDir, path.dirname(bookMdFilename));

  const destBookPath = path.join(destMdDir, path.basename(bookMdFilename));
  const destFilePath = path.join(
    destFilesDir,
    path.basename(bookMdFilename).replace(".md", ".ct")
  );

  let bookContent = concatFiles([bookFilename]);
  
  fs.writeFileSync(destBookPath, bookContent);
  fs.writeFileSync(destFilePath, bookContent);

  const sourceImagesPath = path.join(bookDir, IMAGE_DIR);
  moveFiles(sourceImagesPath, destImageDir);

  const fb2FilePath = path.join(
    destFilesDir,
    path.basename(bookMdFilename).replace(".md", ".fb2")
  );

  // TODO возможно, нужна возможность отключать экспорт
  // как сделано для yaml конфига
  // if (!_.has(bookConfig, "export")) {
  //   return
  // }

  console.log('Export to fb2');
    
  const pandocCommand =
    `pandoc ${destFilePath} ` +
    `-s -f markdown -t fb2 -o ${fb2FilePath} ` +
    `--resource-path=${destPublicDir} ` +
    `--lua-filter=src/pandoc/remove_toc.lua ` +
    `--lua-filter=src/pandoc/filter.lua`;

  const res = execSync(pandocCommand);
  console.log(pandocCommand);
  console.log('' + res);
};

// eslint-disable-next-line consistent-return
const moveBooks = () => {
  if (config.books === null) {
    return null;
  }

  config.books.forEach((bookFilename) => {
    const ext = path.extname(bookFilename)

    if (ext == '.yml') {
      moveBookFromConfig(bookFilename);
    } else if (ext == '.md') {
      moveBookMd(bookFilename);
    } else {
      throw new Error(`Неизвестное расширение файла книги "${bookFilename}"`); 
    }
  });
};

const updateVuepressConfig = () => {
  const vuepressConfig = JSON.parse(
    fs.readFileSync(vuepressConfigPath, "utf-8")
  );

  vuepressConfig.title = _.get(config, "vuepress.title", "");
  vuepressConfig.base = _.get(config, "vuepress.base", "/");

  if (_.has(config, "vuepress.revisionmeProjectId")) {
    vuepressConfig.revisionmeProjectId = config.vuepress.revisionmeProjectId;
  }

  fs.writeFileSync(vuepressConfigPath, JSON.stringify(vuepressConfig));
};

const build = (source = "..", dest = ".") => {
  sourceDir = source;
  workDir = dest;

  destImageDir = path.join(workDir, "docs", ".vuepress", "public", "img");
  destPublicDir = path.join(workDir, "docs", ".vuepress", "public");
  destMdDir = path.join(workDir, "docs");
  destFilesDir = path.join(workDir, "docs", ".vuepress", "public", "files");
  vuepressConfigPath = path.join(workDir, "docs", ".vuepress", "config.json");

  config = readConfig();
  try {
    // перемещение файлов
    const sourceFilesPath = path.join(sourceDir, FILE_DIR);
    moveFiles(sourceFilesPath, destFilesDir);    
    
    movePages();
    moveBooks();
    updateVuepressConfig();
  } catch (err) {
    console.log(err)
  }
};

module.exports.build = build;
