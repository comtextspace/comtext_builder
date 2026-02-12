import { build } from "./source/site_builder.js";

const sourcePath = process.argv[2];
const destPath = process.argv[3];
const cachePath = process.argv[4];
const commitHash = process.argv[5];

build(sourcePath, destPath, cachePath, commitHash);
