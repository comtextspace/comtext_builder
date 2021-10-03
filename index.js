const path = require('path');

const siteBuilder = require('./src/site_builder.js');

siteBuilder.build(path.join(path.dirname(__filename), '..'), path.dirname(__filename));
