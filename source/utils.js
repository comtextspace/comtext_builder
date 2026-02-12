// utils.js

export function convertPoemBlocks(text) {
  const lines = text.split("\n");
  const result = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmedLine = line.trimStart();

    // Проверяем: начинается ли с |, и содержит ли только один |
    if (trimmedLine.startsWith("|") && (line.match(/\|/g) || []).length === 1) {
      // Это потенциальная строка стихотворения
      const block = [];
      while (
        i < lines.length &&
        lines[i].trimStart().startsWith("|") &&
        (lines[i].match(/\|/g) || []).length === 1
      ) {
        block.push(lines[i]);
        i++;
      }

      const contents = block.map(l => l.replace(/^\|\s?/, ""));

      for (let j = 0; j < contents.length; j++) {
        const current = contents[j];
        const isCurrentEmpty = current.trim() === "";

        if (isCurrentEmpty) {
          result.push(">");
        } else {
          const hasNext = j + 1 < contents.length;
          const isNextEmpty = hasNext ? contents[j + 1].trim() === "" : true;

          if (hasNext && !isNextEmpty) {
            result.push(`> ${current} \\`);
          } else {
            result.push(`> ${current}`);
          }
        }
      }
    } else {
      result.push(line);
      i++;
    }
  }

  return result.join("\n");
}

// Функция для запуска таймера
export function startTimer() {
  return Date.now();
}

// Функция для завершения таймера и вывода результата
export function endTimer(start) {
  const end = Date.now();
  console.log(`Операция заняла ${end - start} мс`);
}