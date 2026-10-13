# DriftWatch

Self-hosted сервис визуальных регрессионных тестов для команд, которые хотят хранить скриншоты в своей инфраструктуре и не платить за их количество.

> **Статус: ранний MVP.** Уже работают захват страниц, сравнение с baseline, approve/reject через API и хранение на диске или в S3. Web UI, CLI и комментарии в GitHub PR пока находятся в roadmap.

[English README](README.md)

## Для чего нужен проект

DriftWatch снимает страницу через Playwright, сравнивает PNG с последним одобренным baseline, сохраняет новый снимок и diff, после чего ждёт решения ревьюера. Полностью совпавшие снимки одобряются автоматически.

```text
CI / API-клиент
      │ POST /builds
      ▼
 Fastify API ──► Redis / BullMQ ──► Playwright worker
      │                                  │
      │                                  ├─ детерминированный скриншот
      │                                  ├─ последний approved baseline
      │                                  └─ pixelmatch → diff PNG + процент
      ▼
PostgreSQL + файловое или S3-совместимое хранилище
```

Структура TypeScript-монорепозитория:

- `apps/api` — Fastify API проектов, билдов, ревью и изображений;
- `apps/worker` — BullMQ-воркер с Playwright и pixelmatch;
- `packages/core` — общие типы, Drizzle-схема PostgreSQL, diff и адаптеры хранилищ;
- `demo-app` — тестовая страница для smoke-сценария.

## Быстрый старт через Docker

Нужны Docker и Compose. Первый запуск может занять несколько минут из-за установки Chromium.

```sh
docker compose up --build
```

Будут доступны API на `http://localhost:3000`, демо-страница на `http://localhost:8080`, а также PostgreSQL, Redis и MinIO.

Создайте проект — API-ключ будет показан только один раз:

```sh
curl -X POST http://localhost:3000/api/v1/projects \
  -H 'content-type: application/json' \
  -d '{"name":"my-app"}'
```

Отправьте визуальный билд, подставив полученный ключ:

```sh
curl -X POST http://localhost:3000/api/v1/builds \
  -H 'content-type: application/json' \
  -H 'x-api-key: dw_REPLACE_ME' \
  -d '{"branch":"main","captures":[{"name":"home","url":"http://demo-app","maskSelectors":[".timestamp"]}]}'
```

Получите билд через `GET /api/v1/builds/:id` и одобрите первый снимок, чтобы сделать его baseline:

```sh
curl -X POST http://localhost:3000/api/v1/snapshots/SNAPSHOT_ID/review \
  -H 'content-type: application/json' \
  -H 'x-api-key: dw_REPLACE_ME' \
  -d '{"review":"approved"}'
```

Повторный билд должен дать `unchanged` и diff `0`. Измените `demo-app/style.css` и запустите ещё один билд — появятся статус `changed` и diff-картинка.

Удалить dev-окружение вместе с данными:

```sh
docker compose down -v
```

## Локальная разработка

Нужны Node.js 20+, PostgreSQL, Redis и Chromium для Playwright.

```sh
cp .env.example .env
npm ci
npm run install:browsers
npm run db:push --workspace @driftwatch/api
```

В отдельных терминалах:

```sh
npm run dev:api
npm run dev:worker
python3 -m http.server 8080 --directory demo-app
```

Скрипт `scripts/dev-infra.sh` рассчитан на Debian/Ubuntu с установленным PostgreSQL 17. Для Windows, macOS и других Linux-дистрибутивов переносимым вариантом остаётся Docker Compose.

Проверки перед коммитом:

```sh
npm run check
docker compose config --quiet
```

## API

| Метод | Маршрут | Авторизация | Назначение |
| --- | --- | --- | --- |
| `POST` | `/api/v1/projects` | нет | Создать проект и один раз вернуть API-ключ |
| `GET` | `/api/v1/whoami` | `x-api-key` | Получить текущий проект |
| `POST` | `/api/v1/builds` | `x-api-key` | Поставить в очередь от 1 до 50 снимков |
| `GET` | `/api/v1/builds` | `x-api-key` | Последние 20 билдов со счётчиками |
| `GET` | `/api/v1/builds/:id` | `x-api-key` | Снимки и URL изображений |
| `POST` | `/api/v1/snapshots/:id/review` | `x-api-key` | Одобрить или отклонить снимок |
| `GET` | `/healthz` | нет | Проверка процесса API |

Capture поддерживает поля `name`, `url`, `browser`, `viewport`, `fullPage`, `maskSelectors` и `delayMs`. Постоянный ключ baseline внутри проекта — `name--browser--WIDTHxHEIGHT`.

## Стабильность скриншотов

Воркер фиксирует UTC, локаль `en-US`, `deviceScaleFactor: 1` и reduced motion. Анимации отключаются, загрузка ждёт `networkidle` и web fonts, доступна дополнительная задержка и маскирование динамических областей CSS-селекторами. Сравнение использует `pixelmatch` с порогом `0.1`.

## Безопасность и готовность к production

Учётные данные в Compose предназначены только для локальной разработки. Текущий MVP рассчитан на доверенную сеть: создание проектов и файловые URL изображений не защищены, а capture URL может обращаться ко всем адресам, доступным воркеру. Не выставляйте сервис напрямую в интернет; перед развёртыванием прочитайте [SECURITY.md](SECURITY.md).

## Roadmap

- [x] API, воркер, PNG-diff, baseline-review, файловое/S3-хранилище
- [x] Docker Compose и unit-тесты ядра
- [ ] Web UI со списком билдов, сравнением и approve/reject
- [ ] CLI и статусы/комментарии в GitHub PR
- [ ] Firefox/WebKit в CI и пул браузеров
- [ ] Усиление авторизации, rate limits и ограничение сети воркера
- [ ] Поиск flaky-снимков и настраиваемые правила diff

## Участие в разработке

См. [CONTRIBUTING.md](CONTRIBUTING.md). Перед pull request запустите `npm run check`. Уязвимости сообщайте по инструкции из [SECURITY.md](SECURITY.md).

## Лицензия

[MIT](LICENSE)
