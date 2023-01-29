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

  fs.copyFileSync(
    "./test_sitebuilder/source/docs/.vuepress/config.json",
    "./test_sitebuilder/dest/docs/.vuepress/config.json"
  );

  siteBuilder.build("./test_sitebuilder/source/", "./test_sitebuilder/dest/");

  const foundFiles = readDir("./test_sitebuilder/dest_correct", () => true);

  foundFiles.forEach((filename) => {
    correctFilename = path.join("./test_sitebuilder/dest_correct", filename);
    testFilename = path.join("./test_sitebuilder/dest", filename);

    correctFile = fs.readFileSync(correctFilename, "utf-8");
    testFile = fs.readFileSync(testFilename, "utf-8");

    console.log(correctFilename);
    expect(testFile).toEqual(correctFile);
  });
});
