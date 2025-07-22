function Image(el)
  -- Получаем alt-текст как обычную строку
  local alt_text = pandoc.utils.stringify(el.caption)

  -- Проверяем, совпадает ли он с "cover" (с учётом пробелов)
  if alt_text:match("^%s*cover%s*$") then
    return {} -- удаляем изображение
  end

  return el
end