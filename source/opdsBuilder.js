import fs from "fs";

import opds from "opds";

// Внутренний массив для хранения книг
const books = [];

/**
 * Добавляет книгу в каталог
 * @param {string} title — название книги
 * @param {string} author — имя автора
 * @param {string} fb2Path — путь к .fb2 файлу (относительный или абсолютный URL)
 */
export function addBookToOPDS(title, authors, fb2Path) {
    books.push({
        title: title,
        updated: new Date(),
        authors: authors,
        links: [
            {
                rel: "acquisition/open-access",
                href: fb2Path,
                type: "application/fb2"
            }
        ]
    });
}

/**
 * Сохраняет накопленные книги в OPDS-файл
 * @param {string} fileName — имя файла (например, "catalog.opds")
 * @param {string} title — заголовок каталога
 */
export function saveOPDS(fileName, title) {
    const xml = opds.create({
        title: title,
        books: books
    });

    fs.writeFileSync(fileName, xml);
    console.log(`OPDS-каталог "${title}" успешно сохранён в ${fileName}`);
}
