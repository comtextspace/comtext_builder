const path = require("path");
const dotenv = require("dotenv");

dotenv.config();

const siteBuilder = require("./source/site_builder.js");

const rootDir = path.dirname(__filename);
const booksDir = process.env.PATH_TO_BOOKS ?? path.join(rootDir, "..");

await siteBuilder.build(booksDir, rootDir);
