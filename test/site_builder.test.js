const siteBuilder = require('../src/site_builder.js');

test('buildSite', () => {
  siteBuilder.build('./test/fixtures/', './test/dest/');
  expect(1).toBe(3);
});
