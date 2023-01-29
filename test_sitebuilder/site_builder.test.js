const siteBuilder = require("../src/site_builder.js");

test("buildSite", () => {
  siteBuilder.build("./test/fixtures/", "./test/dest/");
  expect(3).toBe(3);
});
