import { fileURLToPath } from 'url';
import path from "path";

import dotenv from "dotenv";

import { build } from "./source/site_builder.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = __dirname;

const booksDir = process.env.PATH_TO_BOOKS ?? path.join(rootDir, "..");

await build(booksDir, rootDir);
