const fs = require("fs");
const path = require("path");

// 3-rd paty
const readDir = require("fs-readdir-recursive");

const siteBuilder = require("../src/site_builder.js");

test("buildSite", () => {
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

  siteBuilder.build("./test_sitebuilder/source/", "./test_sitebuilder/dest/");

  const foundFiles = readDir("./test_sitebuilder/dest_correct", () => true);

  foundFiles.forEach((filename) => {
    correctFilename = path.join("./test_sitebuilder/dest_correct", filename);
    testFilename = path.join("./test_sitebuilder/dest", filename);

    // console.log('correct ' + correctFilename);
    // console.log('test ' + testFilename);

    correctFile = fs.readFileSync(correctFilename, "utf-8");
    testFile = fs.readFileSync(testFilename, "utf-8");

    expect(testFile).toEqual(correctFile);
  });
});

// TODO нет проверки на то, что генерируются все нужные файлы
//   на экспорт, а лишние не генерируются