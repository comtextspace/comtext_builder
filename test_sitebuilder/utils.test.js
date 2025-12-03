import { convertPoemBlocks } from "../source/utils.js";

// Предполагается, что convertPoemBlocks определена выше или импортирована

test("convertPoemBlocks – базовое преобразование стихотворения", () => {
  const input = `Дальше идет стихотворение

| **Стихотворение**
|
| Ешь ананасы,
| рябчиков жуй,
| день твой последний
| приходит, буржуй.
|
| Ешь ананасы,
| рябчиков жуй,
| день твой последний
| приходит, буржуй.

Стихотворение закончилось`;

  const expected = `Дальше идет стихотворение

> **Стихотворение**
>
> Ешь ананасы, \\
> рябчиков жуй, \\
> день твой последний \\
> приходит, буржуй.
>
> Ешь ананасы, \\
> рябчиков жуй, \\
> день твой последний \\
> приходит, буржуй.

Стихотворение закончилось`;

  expect(convertPoemBlocks(input)).toBe(expected);
});

test("convertPoemBlocks – стихотворение без пустых строк", () => {
  const input = `Начало

| Строка 1
| Строка 2
| Строка 3

Конец`;

  const expected = `Начало

> Строка 1 \\
> Строка 2 \\
> Строка 3

Конец`;

  expect(convertPoemBlocks(input)).toBe(expected);
});

test("convertPoemBlocks – несколько отдельных блоков", () => {
  const input = `Блок 1:

| А
| Б

Обычный текст

| В
| Г`;

  const expected = `Блок 1:

> А \\
> Б

Обычный текст

> В \\
> Г`;

  expect(convertPoemBlocks(input)).toBe(expected);
});

test("convertPoemBlocks – текст без стихотворений", () => {
  const input = `Обычный
текст
без вертикальных черт.`;

  expect(convertPoemBlocks(input)).toBe(input);
});

test("convertPoemBlocks – стихотворение в конце текста", () => {
  const input = `Текст

| Последняя
| строфа`;

  const expected = `Текст

> Последняя \\
> строфа`;

  expect(convertPoemBlocks(input)).toBe(expected);
});

test("convertPoemBlocks – стихотворение в начале текста", () => {
  const input = `| Первая
| строфа

Обычный текст`;

  const expected = `> Первая \\
> строфа

Обычный текст`;

  expect(convertPoemBlocks(input)).toBe(expected);
});

test("convertPoemBlocks – строки с пробелами после |", () => {
  const input = `|  Заголовок  
|  
|  Текст  
|  конец`;

  const expected = `>  Заголовок  
>
>  Текст   \\
>  конец`;

  expect(convertPoemBlocks(input)).toBe(expected);
});

test("convertPoemBlocks – markdown таблица не изменяется", () => {
  const input = `Обычный текст

| Заголовок 1 | Заголовок 2 |
|-------------|-------------|
| Ячейка A    | Ячейка B    |
| Ячейка C    | Ячейка D    |

Продолжение текста`;

  expect(convertPoemBlocks(input)).toBe(input);
});