const fs = require('fs');
const path = require('path');

const prefix_path = './';

const dest_image_path = prefix_path + 'builder/docs/.vuepress/public/img/';
const dest_md_path = prefix_path + 'builder/docs/';

const source_image_folder = 'img';

function getMdFiles(dir, files_){
    files_ = files_ || [];
    var files = fs.readdirSync(dir);
    for (var i in files){
        var name = dir + '/' + files[i];
        if (!fs.statSync(name).isDirectory()){
            if (path.parse(name).ext === '.md') {
                files_.push(name);
            }
        }
    }
    return files_;
}

function getFiles(dir, files_){
    files_ = files_ || [];
    var files = fs.readdirSync(dir);
    for (var i in files){
        var name = dir + '/' + files[i];
        if (!fs.statSync(name).isDirectory()){
            files_.push(name);
        }
    }
    return files_;
}

function concatFiles(folder, out_file){
    var files = getMdFiles(folder);
    
    var result = '';
    
    for (var file_index in files) {
        var str = files[file_index];
       
        var buf = fs.readFileSync(str);
    
        result += buf;
    }

    fs.writeFileSync(out_file, result);
}

function copyImages(folder, out_file){
    var images = getFiles(folder + '/' + source_image_folder);
    
    for (var file_index in images) {
        var str = images[file_index];
              
        fs.copyFileSync(str, dest_image_path + path.parse(str).base);
    
    }
}


const book = '01';

concatFiles(prefix_path + 'Т' + book, dest_md_path + book + '.md');
copyImages(prefix_path + 'Т' + book, '');





