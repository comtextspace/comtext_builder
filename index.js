const path = require('path');

const siteBuilder = require('./src/site_builder.js');

siteBuilder.build('..', path.dirname(__filename));
