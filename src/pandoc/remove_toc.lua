return {
    {
      Para = function(elem)
        -- Проверяем, состоит ли параграф только из одного элемента Str со значением '[[TOC]]'
        if #elem.content == 1 and elem.content[1].t == 'Str' and elem.content[1].text == '[[TOC]]' then
          return {}  -- Удаляем весь параграф
        else
          return elem  -- Оставляем параграф без изменений
        end
      end,
    }
  }