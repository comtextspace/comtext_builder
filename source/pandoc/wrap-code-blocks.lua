-- Lua-фильтр для оборачивания CodeBlock и DisplayMath в Para
-- Это необходимо для соответствия XSD схеме FB2, которая требует,
-- чтобы элементы <code> были внутри <p>, а не напрямую под <section>

return {
  {
    CodeBlock = function(elem)
      -- Оборачиваем CodeBlock в Para с Code внутри
      -- Это гарантирует, что в FB2 <code> будет внутри <p>
      local code_text = elem.text
      local code_elem = pandoc.Code(code_text)
      return pandoc.Para({code_elem})
    end,
    
    Para = function(elem)
      -- Обрабатываем Para, который содержит только DisplayMath
      -- Pandoc конвертирует DisplayMath в <code> в FB2, и если Para содержит только Math,
      -- то <code> может оказаться напрямую под <section>
      if #elem.content == 1 and elem.content[1].t == "Math" then
        local math_elem = elem.content[1]
        if math_elem.mathtype == "DisplayMath" then
          -- Заменяем Math на Code внутри Para
          local code_elem = pandoc.Code(math_elem.text)
          return pandoc.Para({code_elem})
        end
      end
      return elem
    end
  }
}
