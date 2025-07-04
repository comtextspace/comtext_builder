function Image(el)
    -- Убираем начальный слэш у src
    el.src = el.src:sub(2)
    return el
  end