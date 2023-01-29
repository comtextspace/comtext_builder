const siteBuilder = require("../src/site_builder.js");

test("buildSite", () => {
  siteBuilder.build("./test_sitebuilder/fixtures/", "./test_sitebuilder/dest/");
  
});
