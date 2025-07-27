const fs = require("fs");
const path = require("path");

// 3-rd paty
const readDir = require("fs-readdir-recursive");

// Не работает локально
jest.mock('../source/cache', () => ({
  tryRestoreFileFromCache: jest.fn().mockResolvedValue(false),
  saveFileToCache: jest.fn().mockResolvedValue(false)
}));

const siteBuilder = require("../source/site_builder.js");

test("buildSite", async () => {
  fs.rmSync("./test_sitebuilder/dest", {
    recursive: true,
    force: true,
  });

  fs.mkdirSync("./test_sitebuilder/dest");
  fs.mkdirSync("./test_sitebuilder/dest/docs");
  fs.mkdirSync("./test_sitebuilder/dest/docs/.vuepress");
  fs.mkdirSync("./test_sitebuilder/dest/docs/.vuepress/public");
  fs.mkdirSync("./test_sitebuilder/dest/docs/.vuepress/public/img");
  fs.mkdirSync("./test_sitebuilder/dest/docs/.vuepress/public/files");

  fs.copyFileSync(
    "./test_sitebuilder/source/docs/.vuepress/config.json",
    "./test_sitebuilder/dest/docs/.vuepress/config.json"
  );

  await siteBuilder.build("./test_sitebuilder/source/", "./test_sitebuilder/dest/");

  const foundFiles = readDir("./test_sitebuilder/dest_correct", () => true);

  foundFiles.forEach((filename) => {
    const correctFilename = path.join("./test_sitebuilder/dest_correct", filename);
    const testFilename = path.join("./test_sitebuilder/dest", filename);
  
    // console.log('correct ' + correctFilename);
    // console.log('test ' + testFilename);

    let correctFile, testFile;
  
    // Проверяем, это ZIP-файл или нет
    if (filename.toLowerCase().endsWith(".zip") 
      || filename.toLowerCase().endsWith(".epub")) {
      // Читаем как Buffer (без кодировки)
      correctFile = fs.readFileSync(correctFilename);
      testFile = fs.readFileSync(testFilename);
    } else {
      // Читаем как текст в кодировке UTF-8
      correctFile = fs.readFileSync(correctFilename, "utf-8");
      testFile = fs.readFileSync(testFilename, "utf-8");
    }
  
    expect(testFile).toEqual(correctFile);
  });
});

// TODO нет проверки на то, что генерируются все нужные файлы
//   на экспорт, а лишние не генерируются