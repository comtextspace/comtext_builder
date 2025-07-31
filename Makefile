# Цель по умолчанию
.DEFAULT_GOAL := help

# Список фиктивных целей (не соответствуют файлам)
.PHONY: help install test dev lint lint-fix

# Вывод цветного сообщения
define print_step
    @echo "\033[1;36m⚙️  Выполняется: $@\033[0m"
endef

# Установка зависимостей
install:
	$(call print_step)
	yarn install

# Запуск тестов
test: install
	$(call print_step)
	yarn test

# Запуск режима разработки документации
dev: install
	$(call print_step)
	yarn docs:dev --clean-cache

# Проверка линтером
lint: install
	$(call print_step)
	yarn lint

# Автоисправление lint-ошибок
lint-fix: install
	$(call print_step)
	yarn lint-fix

# Цель по умолчанию — показ справки
help:
	$(call print_step)
	@echo "Доступные цели:"
	@echo "  make install    — Установить зависимости"
	@echo "  make test       — Запустить тесты"
	@echo "  make dev        — Запустить сайт"
	@echo "  make lint       — Проверить код линтером"
	@echo "  make lint-fix   — Исправить ошибки линтера"