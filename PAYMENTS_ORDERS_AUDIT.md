# Аудит оплаты, заказов и безопасности taxi-project-template

Дата аудита: 2026-09-23

Статус документа: первая зафиксированная редакция по результатам статического аудита. Код приложения на этом этапе не изменялся.

## 1. Краткий вывод

Шаблон пока нельзя считать готовым к приёму реальных платежей без исправлений уровня P0.

Главные блокеры:

1. Итоговая цена зависит от значения, присланного браузером, и не пересчитывается независимо на сервере.
2. Честному пользователю доплаты могут начисляться дважды, а скидка — вычитаться дважды.
3. Stripe webhook подтверждает поездку без полной проверки статуса платежа, суммы и валюты.
4. Fulfillment и письма не защищены от конкурентной повторной доставки webhook.
5. Два поля Stripe имеют смешанную семантику: в `stripePaymentIntentId` сначала записывается Checkout Session ID (`cs_...`), а потом PaymentIntent ID (`pi_...`).
6. Повтор создания бронирования может создать несколько поездок и несколько Checkout Session.
7. Server action изменения настроек не проверяет роль администратора. Через него можно менять валюту, комиссии и разрешённые способы оплаты.
8. Владелец поездки может через API сам назначить водителя/автомобиль и поставить произвольный административный статус.
9. UI проверяет купон в таблице `Coupon`, а сервер создания поездки применяет код из `DiscountCode`.
10. Production dependency audit обнаружил 17 известных уязвимостей: 4 critical, 5 high, 6 moderate и 2 low.

## 2. Что уже проверено

### 2.1 Статические команды

- `npm run lint` — завершился успешно, но с предупреждениями.
- `npx tsc --noEmit` — завершился успешно без ошибок типов.
- `npm audit --omit=dev` — завершился с ошибкой из-за 17 уязвимостей.
- Git working tree до аудита был чистым.
- Отслеживаемых `.env` с секретами и явных Stripe/Resend/private-key маркеров в текущем checkout не обнаружено.

### 2.2 Проверенная документация

- Официальная документация Stripe Checkout fulfillment.
- Официальная документация Stripe Node по проверке подписи webhook.
- Официальная документация Google Routes API `computeRoutes`.
- Официальная документация Resend по idempotency keys.

Ключевые подтверждённые требования Stripe:

- webhook обязателен; redirect после Checkout не является гарантированным источником fulfillment;
- одна fulfillment-функция должна безопасно вызываться несколько раз, в том числе конкурентно;
- перед fulfillment необходимо повторно получить Checkout Session и проверить `payment_status`;
- `checkout.session.completed` не следует безусловно трактовать как окончательно оплаченный заказ;
- для отложенных методов оплаты используются `checkout.session.async_payment_succeeded` и `checkout.session.async_payment_failed`;
- Stripe может повторно доставлять события, а порядок разных типов событий не гарантирован.

## 3. P0 — блокеры реальной оплаты

### P0.1. Клиент управляет базой расчёта цены

Файлы:

- `app/booking/page.tsx`
- `app/api/trips/route.ts`
- `components/booking-map.tsx`
- `lib/validations.ts`

Текущий поток:

1. Браузер получает расстояние через Google Directions.
2. Браузер вычисляет `basePrice + distance * pricePerKm + extras - discount`.
3. Уже итоговое значение отправляется как `items[0].price` и `total`.
4. Сервер читает `items[0].price` как `clientSentBasePrice`.
5. Сервер делает только `Math.max(clientSentBasePrice, tariffBase)`.

Последствия:

- атакующий может отправить цену, равную только `basePrice`/`minPrice`, независимо от длины маршрута;
- `pricePerKm`, `pricePerMin`, зоны, расстояние и длительность не являются серверным источником истины;
- поле `total` проходит Zod-валидацию, но сервером фактически игнорируется;
- сервер принимает до 50 `items`, но использует только первый элемент;
- неактивный тариф можно заказать напрямую по ID, поскольку проверяется существование, но не `isActive`.

Обязательное исправление:

1. Удалить клиентские `price`, `total` и e-commerce-массив `items` из доверенного контракта создания поездки.
2. Принимать отдельный `tariffPlanId`.
3. Передавать выбранные в Places Autocomplete координаты pickup/dropoff либо place ID.
4. На сервере вызывать Google Routes API:
   - `POST https://routes.googleapis.com/directions/v2:computeRoutes`;
   - серверный `GOOGLE_MAPS_ROUTES_API_KEY`;
   - `X-Goog-FieldMask: routes.distanceMeters,routes.duration`;
   - ключ ограничить в Google Cloud только Routes API и, где возможно, серверной инфраструктурой.
5. Рассчитывать цену только на сервере из текущего активного тарифа и текущих настроек.
6. Хранить фактически использованные distance/duration/rates в поездке для последующего аудита.
7. Возвращать клиенту рассчитанную сервером сумму либо добавить отдельный quote endpoint.

Рекомендуемая формула должна быть явно согласована с владельцем шаблона:

`max(basePrice + distanceKm * pricePerKm + durationMinutes * pricePerMin, minPrice, zoneMinPrice) + extras - discount`

Сейчас UI использует `basePrice + distance * pricePerKm`, а `pricePerMin` вообще не использует. Нельзя молча включать `pricePerMin`, пока не определена бизнес-семантика тарифов.

### P0.2. Доплаты и скидка применяются дважды

Файлы:

- `app/booking/page.tsx`
- `app/api/trips/route.ts`

Текущий UI отправляет `price` уже после:

- airport surcharge;
- luggage fee;
- child-seat fee;
- promo discount.

Сервер затем:

- повторно добавляет airport/luggage/child-seat fees;
- повторно применяет скидку.

Последствия:

- честный клиент может дважды оплатить extras;
- скидка может быть вычтена дважды;
- итог UI, БД и Stripe может расходиться;
- `basePrice` в поездке фактически сохраняет сумму с extras, а не базовый тариф.

Обязательное исправление:

- передавать структурированные поля `luggageCount`, `luggageSize`, `childSeatCount`;
- не кодировать финансовые параметры внутри свободного текста `notes`;
- определять airport surcharge на сервере по подтверждённому месту/типу place, а не по наличию английского слова `airport` в строке;
- `notes` хранить отдельно только как пользовательский текст;
- хранить отдельные денежные компоненты либо JSON snapshot breakdown;
- все денежные вычисления делать в minor units или через Decimal, а не через цепочку Float/Number.

### P0.3. Небезопасный Stripe fulfillment

Файлы:

- `app/api/stripe/webhooks/route.ts`
- `app/api/stripe/confirm/route.ts`
- `app/api/trips/route.ts`
- `prisma/schema.prisma`

Подтверждённые дефекты:

1. `checkout.session.completed` вызывает подтверждение поездки без проверки `session.payment_status`.
2. Не проверяются `amount_total` и `currency` против сохранённого заказа.
3. `confirmTrip` доверяет одному metadata trip ID.
4. Redirect endpoint проверяет `paid`, но тоже не сверяет сумму/валюту.
5. Redirect изменяет данные через публичный GET.
6. Обновление `paymentStatus` и `status` разбито на несколько запросов без атомарного перехода.
7. Внутренний текст исключения Stripe/БД возвращается клиенту из confirm endpoint.
8. В `checkout.session.completed` объект из webhook используется напрямую; рекомендуемый Stripe flow — единая функция получает Session по ID заново и проверяет её состояние.
9. Нет поддержки `checkout.session.async_payment_succeeded`/`async_payment_failed`.
10. Код обрабатывает `checkout.session.expired`, но текущая инструкция Stripe не подписывает endpoint на это событие.

Обязательное исправление:

- создать одну серверную `fulfillCheckoutSession(sessionId)`;
- вызывать её из webhook и из server-side success/confirm flow;
- внутри заново получать Checkout Session у Stripe;
- требовать ожидаемый `mode === "payment"`;
- разрешать fulfillment только при допустимом финальном `payment_status`;
- получать поездку по отдельному уникальному `stripeCheckoutSessionId` и дополнительно сверять metadata/client reference;
- сравнивать Stripe `amount_total` с сохранённым `totalMinor`;
- сравнивать Stripe currency с сохранённой нормализованной валютой;
- проверять, что PaymentIntent не привязан к другой поездке;
- выполнять атомарный conditional update, чтобы только один обработчик получил право на side effects;
- возвращать наружу нейтральные ошибки, детали писать только в server logs;
- redirect endpoint должен быть идемпотентным и не заменять webhook.

### P0.4. Смешаны Checkout Session ID и PaymentIntent ID

Файлы:

- `app/api/trips/route.ts`
- `app/api/stripe/webhooks/route.ts`
- `prisma/schema.prisma`

Поле `stripePaymentIntentId` сначала получает `stripeSession.id` (`cs_...`), затем перезаписывается `paymentIntent.id` (`pi_...`).

Последствия:

- невозможно надёжно определить, что хранится в поле;
- обработчики разных событий зависят от порядка доставки;
- `payment_intent.succeeded` без metadata может не найти поездку;
- refund lookup неоднозначен;
- поле не имеет unique constraint.

Обязательное исправление схемы:

- `stripeCheckoutSessionId String? @unique`;
- `stripePaymentIntentId String? @unique`;
- `paymentStatus` заменить со свободной строки на enum;
- добавить `paidAt`, `refundedAmountMinor` и при необходимости `paymentFailureCode`;
- для legacy-строк провести миграцию по префиксам `cs_`/`pi_` до добавления уникальных индексов;
- при создании Session указывать:
  - `client_reference_id: trip.id`;
  - `metadata.tripId`;
  - `payment_intent_data.metadata.tripId`, чтобы metadata была и на PaymentIntent;
  - Stripe idempotency key при API create.

### P0.5. Webhook и письма не идемпотентны при конкуренции

Файлы:

- `app/api/stripe/webhooks/route.ts`
- `lib/email.ts`

Текущий алгоритм:

1. Читает поездку.
2. Если она ещё не `CONFIRMED`, обновляет.
3. Отправляет письма.

Два конкурентных события (`checkout.session.completed` и `payment_intent.succeeded`) могут оба прочитать `PENDING`, оба обновить поездку и оба отправить письма.

Кроме того, `sendEmail` перехватывает ошибку Resend и возвращает `null`, а `sendBookingEmails` использует `Promise.allSettled`, после чего вызывающий код логирует успех даже при полном отказе отправки.

Обязательное исправление:

- использовать conditional `updateMany`/transaction как атомарный claim перехода;
- side effects выполняет только обработчик, реально изменивший одну строку;
- передавать Resend idempotency key отдельно для письма клиенту и администратору, например:
  - `trip-paid-customer/<tripId>`;
  - `trip-paid-admin/<tripId>`;
- учитывать, что Resend хранит idempotency keys 24 часа; для долговременной гарантии добавить outbox/email-delivery state в БД;
- не скрывать ошибку отправки от вызывающего кода;
- решить политику retry: webhook должен вернуть 500 только для retryable критических ошибок, но не откатывать уже подтверждённый платёж.

### P0.6. Ошибочная обработка failed/expired/refund

Файл: `app/api/stripe/webhooks/route.ts`

Проблемы:

- `payment_intent.payment_failed` сразу отменяет поездку, хотя пользователь может повторить ввод карты в той же Checkout Session и затем успешно оплатить;
- поздний success после cancellation может подтвердить поездку без явной state-machine policy;
- любой `charge.refunded`, включая частичный refund, ставит `Trip.status = REFUNDED`;
- при refund `paymentStatus` остаётся `paid`;
- не учитывается сумма возврата;
- поездка, уже `IN_PROGRESS`/`COMPLETED`, может быть переведена webhook в неподходящее состояние без бизнес-правил.

Обязательное исправление:

- не отменять бронь на единичном `payment_intent.payment_failed`; отмечать payment failure и оставлять возможность retry до expiry/cancel;
- окончательно закрывать неоплаченный card booking по `checkout.session.expired` либо явной отмене;
- задать state machine допустимых переходов trip/payment status;
- различать partial и full refund;
- обновлять и trip status, и payment status согласованно;
- хранить amount refunded в minor units;
- не делать автоматический operational rollback поездки после начала выполнения без ручной политики.

### P0.7. Нет idempotency создания бронирования

Файлы:

- `app/booking/page.tsx`
- `app/api/trips/route.ts`
- `lib/order-number.ts`
- `prisma/schema.prisma`

Двойной клик частично блокируется UI-флагом, но повтор HTTP-запроса, retry reverse proxy или потерянный ответ создадут новую поездку и новую Checkout Session.

Также `generateOrderNumber` использует race-prone алгоритм «найти последний номер и прибавить один». Уникальный индекс обнаружит конфликт, но вставка поездки упадёт; fallback применяется только если упал сам поиск/расчёт номера.

Обязательное исправление:

- клиент генерирует `bookingRequestId` один раз на попытку бронирования и сохраняет до успешного ответа;
- `Trip.bookingRequestId` получает unique constraint;
- повторный POST с тем же ключом возвращает существующую поездку/Checkout URL либо создаёт новую Session по чётким правилам;
- Stripe Session create получает стабильный idempotency key;
- номер поездки генерировать через DB sequence/counter либо retry insert на unique conflict;
- не использовать `Math.random` как основной fallback идентификатор финансовой операции.

### P0.8. Неавторизованный server action настроек

Файл: `app/actions/settings.ts`

`updateSettings` не вызывает `auth()` и не проверяет роль `ADMIN`.

Через action изменяются:

- валюта;
- airport/luggage/child-seat fees;
- card/cash payment flags;
- email администратора;
- вся публичная конфигурация;
- валюта всех тарифов через `tariffPlan.updateMany`.

Защита страницы `/admin/settings` не заменяет авторизацию внутри server action.

Обязательное исправление:

- общая helper-функция `requireAdmin()`;
- вызов в начале каждого mutation server action;
- строгая Zod-валидация server-side;
- ограничение валют поддерживаемым allowlist;
- все fee >= 0 и ограничены разумным максимумом;
- запрет конфигурации, при которой одновременно выключены card и cash;
- аудит изменений финансовых настроек.

### P0.9. Владелец поездки может менять административные поля

Файл: `app/api/trips/[id]/route.ts`

Текущий PATCH разрешён администратору или владельцу поездки, но принимает:

- произвольный `status`;
- `driverName`;
- `driverPhone`;
- `vehicleId`;
- `driverId`.

Пользователь может сам поставить `COMPLETED`, `REFUNDED`, назначить водителя и автомобиль.

Обязательное исправление:

- текущий PATCH сделать admin-only;
- валидировать статус enum и допустимый переход;
- для клиента создать отдельный endpoint отмены;
- клиентская отмена должна проверять ownership, время до поездки, текущий статус и refund policy;
- `REFUNDED` нельзя выставлять вручную без связанной записи о возврате либо отдельной административной процедуры.

### P0.10. Две несовместимые модели промокодов

Файлы:

- `app/booking/page.tsx`
- `app/api/coupons/validate/route.ts`
- `app/api/discounts/validate/route.ts`
- `app/api/trips/route.ts`
- `prisma/schema.prisma`

UI вызывает `/api/coupons/validate`, который читает legacy `Coupon`.

Создание поездки читает `DiscountCode`.

Последствия:

- UI может показать «Coupon applied», но сервер не найдёт этот код;
- сервер может применить другой тип/значение скидки;
- legacy `Coupon` содержит min amount, max discount, usage limit и used, но booking flow их не использует;
- `DiscountCode` не содержит usage limit;
- endpoint администратора управляет `DiscountCode`, а UI клиента проверяет другую таблицу.

Обязательное исправление:

- выбрать одну модель; для текущей админки логичнее оставить `DiscountCode` и удалить/мигрировать legacy `Coupon`;
- UI переключить на `/api/discounts/validate` только для предварительного отображения;
- при booking всегда повторно проверять скидку на сервере;
- решить бизнес-требования min amount/max discount/usage limit/per-user limit;
- usage limit резервировать/увеличивать атомарно только при успешной оплате либо по чёткой reservation policy;
- нормализовать code (`trim().toUpperCase()`) при create/update/lookup;
- `PERCENT` должен быть > 0 и <= 100;
- `FIXED` должен быть > 0 и не превышать допустимый итог;
- нулевая сумма требует отдельного flow без Stripe либо запрета полного обнуления card payment.

## 4. P1 — высокий приоритет до production

### P1.1. Строгая валидация бронирования

Файл: `lib/validations.ts`

Нужно заменить текущую e-commerce схему на taxi booking schema:

- ровно один `tariffPlanId`;
- обязательные pickup/dropoff;
- обязательные подтверждённые координаты/place IDs;
- обязательные name/phone;
- обязательный email для guest checkout;
- email нормализовать `trim().toLowerCase()`;
- строковые max lengths;
- notes с разумным пределом;
- дата должна быть валидной и не в прошлом;
- передавать timezone/IANA zone либо ISO instant с offset;
- passengers <= `tariff.maxPassengers`;
- luggageCount <= `tariff.maxLuggage`;
- extras count — целые неотрицательные числа с пределами;
- payment method привести к одному enum (`STRIPE`/`CASH`), убрать неоднозначный `CARD`;
- запрет pickup == dropoff и нулевого маршрута;
- защита от чрезмерной суммы/дистанции.

Текущий UI помечает email как optional, но backend требует `guestEmail` для гостя. Поэтому гость без email проходит клиентскую форму, а сервер отвечает ошибкой. UI и server contract нужно согласовать.

### P1.2. Сервер должен проверять разрешённый способ оплаты

Файлы:

- `app/api/trips/route.ts`
- `app/actions/settings.ts`

UI скрывает выключенные способы, но прямой API-запрос всё равно может выбрать любой.

Нужно на сервере проверять:

- `STRIPE` разрешён только при `enableCardPayment`;
- `CASH` разрешён только при `enableCashPayment`;
- хотя бы один способ включён;
- если Stripe key/webhook не настроены, card booking должен fail fast понятной operational ошибкой, а не создавать зависший заказ.

### P1.3. Неавторизованные CMS server actions

Файл: `app/actions/cms.ts`

Без `auth()`/`ADMIN` доступны mutation actions:

- `updatePage`;
- `togglePageVisibility`;
- `createPage`;
- `seedCMSPages`.

Это позволяет менять Terms, Privacy, payment/cancellation wording и публичный контент.

Нужно:

- `requireAdmin()` в каждой mutation action;
- Zod-валидация ID, slug, title, content;
- ограничение длины;
- политика sanitization/рендеринга CMS content;
- seed action убрать из runtime UI либо ограничить отдельным deployment/admin flow.

### P1.4. Base URL нельзя строить из непроверенного Host

Файл: `app/api/trips/route.ts`

Fallback строит URL как `https://${request.headers.get("host")}`.

Если `NEXT_PUBLIC_APP_URL`/`NEXTAUTH_URL` отсутствуют и инфраструктура пропускает произвольный Host, Stripe success/cancel URL может уйти на чужой домен.

Нужно:

- в production требовать явный `NEXT_PUBLIC_APP_URL`/`APP_URL`;
- валидировать URL при startup;
- не использовать Host header как production fallback;
- localhost fallback разрешать только в development.

### P1.5. Некорректный статус ошибки создания Stripe Session

Файл: `app/api/trips/route.ts`

Поездка создаётся до Checkout Session. Если Stripe API падает, поездка остаётся `PENDING/unpaid` без session ID.

Нужно:

- использовать `paymentStatus = CHECKOUT_CREATION_FAILED` либо удалить неактивированную поездку по безопасной политике;
- возвращать `tripId` только если это помогает retry того же bookingRequestId;
- не создавать новую поездку при retry;
- добавить cleanup job для abandoned/failed bookings;
- задавать разумный `expires_at` Checkout Session, подходящий для бронирования такси.

### P1.6. Tariff и discount admin API не валидируют финансовые данные

Файлы:

- `app/api/tariffs/route.ts`
- `app/api/tariffs/[id]/route.ts`
- `app/api/discounts/route.ts`
- `app/api/discounts/[id]/route.ts`

Проблемы:

- `parseFloat`/`parseInt` без проверки finite/range;
- возможны отрицательные цены;
- произвольная currency;
- `maxPassengers`/`maxLuggage` могут быть отрицательными;
- zones не валидируются на minKm/maxKm/minPrice, пересечения и порядок;
- PATCH spread-ит весь body в Prisma update, то есть mass assignment;
- malformed zones в PATCH молча превращаются в null;
- discount type/value/date не проходят Zod;
- lowercase discount code создаётся, а booking lookup ищет uppercase.

Нужно использовать явные Zod create/update schemas и allowlist полей.

### P1.7. Payment/trip state machine

Свободная строка `paymentStatus` допускает опечатки и невозможные комбинации.

Рекомендуемые отдельные enum:

- Trip: `PENDING`, `CONFIRMED`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`, `REFUNDED` (возможно `PARTIALLY_REFUNDED`).
- Payment: `UNPAID`, `CHECKOUT_PENDING`, `PROCESSING`, `PAID`, `FAILED`, `PARTIALLY_REFUNDED`, `REFUNDED`.

Нужно формально определить допустимые переходы и одну функцию, которая их применяет.

### P1.8. Денежная модель

Сейчас смешаны Prisma Decimal, JS Number и Float-настройки.

Нужно:

- хранить критические payment amount/refund amount в integer minor units либо использовать Decimal до самой границы Stripe;
- не предполагать, что любая валюта имеет 2 decimal places;
- ограничить список валют теми, для которых реализация корректно формирует minor units;
- сохранять snapshot валюты и breakdown в Trip, чтобы изменение тарифа не меняло историю;
- UI должен форматировать `trip.currency`, а не жёстко выводить `€`.

### P1.9. Guest trip access

Файлы:

- `app/api/trips/[id]/route.ts`
- `app/trips/[id]/page.tsx`

Постороннему по CUID возвращаются:

- trip number;
- trip status;
- payment status;
- pickup date/time;
- tariff name.

CUID трудно угадать, но это не полноценная авторизация.

Нужно:

- генерировать отдельный guest access token;
- хранить только хеш токена;
- передавать raw token в success URL/secure cookie;
- без owner/admin/token возвращать 404 либо ещё более минимальный ответ;
- не строить безопасность только на непредсказуемости ID.

### P1.10. PII в логах

`app/api/trips/route.ts` логирует весь request body и validated data, включая имя, email, телефон, адреса, дату и notes.

Нужно:

- убрать полные payload logs;
- использовать structured logging с request/booking ID;
- редактировать PII;
- не логировать Stripe secrets, webhook signatures и reset tokens;
- разделить development debug и production logs.

### P1.11. Auth/admin hardening

Файлы:

- `lib/auth.ts`
- `lib/auth.config.ts`
- `app/api/auth/register/route.ts`
- `app/api/auth/forgot-password/route.ts`
- `app/api/auth/reset-password/route.ts`
- `.env.example`

Найдено:

- `allowDangerousEmailAccountLinking: true` для Google;
- код ожидает `GOOGLE_ID`/`GOOGLE_SECRET`, а `.env.example` описывает `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`;
- email не нормализуется единообразно;
- reset token хранится открытым текстом;
- reset password разрешает пароль от 6 символов, регистрация — от 8;
- после password reset существующие JWT sessions не отзываются;
- роль admin также выводится из совпадения email с `ADMIN_EMAIL`, что требует аккуратного владения и нормализации адреса.

Нужно:

- отключить dangerous account linking либо реализовать явное безопасное связывание;
- унифицировать env names;
- нормализовать email перед lookup/create и admin comparison;
- хранить SHA-256 хеш reset token;
- усилить единую password policy;
- добавить механизм session version/token invalidation после reset;
- не позволять публичной регистрации захватить зарезервированный admin email без подтверждённого bootstrap flow.

### P1.12. Dependency vulnerabilities

`npm audit --omit=dev` обнаружил:

- 17 vulnerabilities;
- 4 critical;
- 5 high;
- 6 moderate;
- 2 low.

Затронуты, в частности:

- Auth.js / `next-auth` beta;
- Next.js;
- nodemailer dependency chain;
- DOMPurify;
- undici;
- PostCSS;
- qs;
- uuid через Resend/Svix chain;
- yaml и другие transitive packages.

Нельзя слепо запускать `npm audit fix --force`: текущий audit предлагает breaking-переход до Next 16 и обновления вне заданных диапазонов.

План:

1. Зафиксировать отдельную ветку dependency upgrade.
2. Обновить `next-auth` как минимум до версии с исправлениями advisory и прогнать auth regression.
3. Проверить совместимую исправленную ветку Next 14; если полного исправления для 14 нет — запланировать controlled migration на поддерживаемую major.
4. Обновить прямые зависимости Resend, sanitizer и почтовые пакеты.
5. Повторить `npm audit --omit=dev`, lint, typecheck, build и auth/payment E2E.

### P1.13. Полная запись StoreSettings сериализуется в браузер

Файлы:

- `app/layout.tsx`
- `components/providers/settings-provider.tsx`
- `app/actions/settings.ts`
- `prisma/schema.prisma`

`RootLayout` выполняет `prisma.storeSettings.findFirst()` без `select`, приводит результат через `as unknown as StoreSettingsData` и передаёт его в клиентский `SettingsProvider`. TypeScript-приведение не удаляет лишние свойства объекта во время выполнения. Provider затем целиком кладёт `initialSettings` в клиентский React Context.

Это подтверждено существующими `.next/server/app/*.rsc`: в RSC payload сериализована полная запись, включая внутренний `id`, `taxiLicense` и `googleMapsApiKey`. В проверенном build `googleMapsApiKey` равен `null`, поэтому признаков утечки реально заполненного ключа сейчас нет. Однако любое будущее непустое значение этого поля будет передано клиенту на каждой странице.

Текущие Google Maps client components используют отдельный `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`; поле БД `googleMapsApiKey` приложением не используется. Серверный ключ будущего Routes API должен храниться только в `GOOGLE_MAPS_ROUTES_API_KEY` и никогда не попадать в public settings.

Нужно:

- определить отдельный `PublicStoreSettings` DTO;
- выбирать публичные поля через явный Prisma `select` до server/client boundary;
- удалить `as unknown as StoreSettingsData`;
- не включать `googleMapsApiKey`, внутренний `id`, timestamps и любые будущие server-only поля;
- `getSettings()` разделить на публичное чтение и защищённое admin-only чтение/изменение;
- удалить legacy `googleMapsApiKey` из БД, если оно действительно не используется, либо явно классифицировать его как публичный browser key и всё равно не смешивать с серверным Routes key;
- добавить regression test, проверяющий отсутствие запрещённых полей/маркерного секрета в HTML/RSC payload.

### P1.14. Публичные документы противоречат реализованным payment/cancellation flows

Файлы:

- `app/terms/page.tsx`
- `app/privacy/page.tsx`
- `app/cookies/page.tsx`
- `app/actions/cms.ts`
- `README.md`

Найдено:

- публичные Terms говорят, что все платежи проходят через Stripe, хотя booking поддерживает cash; (сайт должен поддерживать оба варианта и писать про это в условиях)
- публичные Terms обещают бесплатную отмену в течение 5 минут либо до назначения водителя; (у нас же есть редактирование этих данных в CMS что бы владелец сам выбирал)
- CMS seed обещает отмену/изменение не позднее чем за 2 часа; (должен водитель выбирать)
- customer cancellation/modification endpoint с этими правилами отсутствует;
- refund/cancellation state machine ещё не реализована;
- README называет Stripe flow полностью автоматизированным и шаблон «complete», хотя P0-блокеры не закрыты;
- privacy/cookie тексты являются общими placeholders и не описывают полный фактический набор процессоров и retention policy. (если это можно редачить в CMS то в принципе норм)

Это не только редакционная проблема: опубликованные обещания должны совпадать с реально исполняемой cancellation/refund policy. (то есть важные моменты должны быть под страйп сделаны а потом пользователь уже выберет и сам в CMS отредактирует)

Нужно:

- сначала утвердить единую бизнес-политику cancellation/no-show/refund;
- реализовать её в server-side state machine и customer/admin endpoints;
- использовать один источник контента вместо расходящихся hardcoded страниц и CMS records; (обсудили выше)
- перед продажей/развёртыванием требовать от владельца бизнеса заполнить юридические placeholders и проверить документы с юристом соответствующей юрисдикции. (это просто в README нужно указать)

## 5. P2 — важные, но не блокирующие сам Stripe flow

### P2.1. Reviews не привязаны к владельцу поездки

Файлы:

- `app/api/reviews/route.ts`
- `prisma/schema.prisma`

Переданный `tripId` проверяется только на `COMPLETED`, но:

- ownership не проверяется;
- guest access token не проверяется;
- `tripId` не сохраняется в `TaxiReview`;
- уникальность «один отзыв на поездку» отсутствует.

Нужно добавить relation/unique policy и проверку owner/guest token.

### P2.2. UI polling и cash/card определяются косвенно

Файл: `app/trips/[id]/page.tsx`

- `isCash` вычисляется как отсутствие Stripe ID;
- canceled/failed card trip с ID может продолжать polling каждые 3 секунды;
- polling не имеет общего timeout/backoff;
- валюта отображается жёстко как EUR;
- success query сам по себе создаёт ощущение успеха до окончательной проверки статуса.

Нужно хранить явный `paymentMethod`, ограничивать polling terminal statuses и форматировать сохранённую currency.

### P2.3. Rate limiting fail-open (ВАЖНО!)

АГЕНТ ИЗНАЧАЛЬНО НАПИСАЛ -
"
Файл: `lib/rate-limit.ts`

Без Upstash или при его ошибке rate limit полностью пропускает запросы. Для availability это осознанный выбор, но production без Redis останется без защиты.

Дополнительно 50 trip requests/min/IP слишком много для публичного booking flow.

Нужно:

- production startup/config check;
- alert при отключённом rate limiting;
- более низкий лимит создания поездок;
- комбинировать IP, normalized email и bookingRequestId;
- корректно извлекать trusted proxy IP;
- отдельно лимитировать quote/Routes API, чтобы не получить финансовый abuse Google API.
  "

Но тут нужно остановиться и подумать, так как этот сайт это шаблон который клиент покупает и сразу он готов к деплою - нужно только зарегаться, получить ключи и всё подключить (инстркции я выдаю тоже при покупке) но пишут часто что это оверхед столько сервисов, и мне еще один агент предложили сделать -
Что реально даёт Vercel из коробки (бесплатно, без единого нового сервиса)

У Vercel есть свой Firewall/WAF, встроенный в платформу:

DDoS-защита (L3/L4) — включена автоматически на всех тарифах, включая Hobby, без всякой настройки.
WAF с кастомными правилами — тоже бесплатно на всех тарифах. Можно создать правило с действием rate_limit прямо по пути запроса (/api/contact, /api/generate и т.д.) в дашборде, без кода. На Hobby — до 3 правил, этого обычно хватает на шаблон (форма, auth, один API-эндпоинт).
@vercel/firewall SDK — если нужен rate limit по business-логике (не по IP, а по userId/organization), это делается прямо в коде через checkRateLimit(), без Redis.

То есть то, ради чего агент тянет Upstash — защита конкретных эндпоинтов от злоупотребления — сегодня закрывается штатными средствами Vercel, причём бесплатно и без регистрации в третьем сервисе.

и вот нужно подумать, может сделать так что редис апстеш только неважное остальное покрывала, а версел покрыл самое важное? можешь чекнуть tavily что бы точно понять.
вот агент вообще предлагает - По умолчанию в инструкции — 1-2 правила Vercel WAF (rate_limit) на чувствительные роуты - сработает?

### P2.4. Prisma deployment

Файлы:

- `package.json`
- `.gitignore`
- `.env.example`

Найдено:

- `npm run build` выполняет `prisma migrate deploy`, то есть build имеет side effect на production DB;
- при параллельных builders/deploy это нежелательно;
- `.env.example` не содержит обязательный `DIRECT_URL`;
- `.gitignore` игнорирует `prisma/migrations/migration_lock.toml`, хотя lock file следует хранить вместе с миграциями.

Нужно:

- разделить build и migrate deploy; (ВОТ ТУТ ВАЖНЫЙ НЮАНС, ТАК КАК ЭТО ШАБЛОН, нам нужно что бы при первом деплое шаблона версел получил бд и схему и тд. как это реализовать не сломав логику вот эту шаблона?)
- выполнять migrate отдельным release/deploy job один раз;
- добавить `DIRECT_URL` в env example;
- вернуть migration lock в репозиторий;
- backup и dry run перед платёжной миграцией.

### P2.5. ESLint warnings

Lint ошибок не нашёл, но есть предупреждения:

- missing dependencies в booking price effect;
- missing dependency в admin settings effect;
- несколько `<img>` вместо Next Image.

Missing dependencies в pricing effect имеют функциональное значение: изменение fees в settings может не пересчитать цену до другого изменения формы.

### P2.6. Security headers и CORS требуют production-политики

Файл: `next.config.js`

Найдено:

- CSP разрешает `'unsafe-eval'` независимо от окружения;
- CSP разрешает широкое `'unsafe-inline'` для scripts;
- Google Maps script разрешён, но полный набор необходимых Maps image/connect hosts не описан;
- Vercel Analytics подключён, но его CSP requirements явно не отражены;
- development CORS сочетает credentials с wildcard origin, что браузеры не принимают как корректный credentialed CORS;
- при отсутствии `NEXT_PUBLIC_APP_URL` production отправляет пустой `Access-Control-Allow-Origin` вместо явной config failure;
- CORS включён для всех `/api/*`, хотя большинство endpoint используются same-origin и не нуждаются в cross-origin доступе.

Нужно:

- по умолчанию оставить API same-origin без CORS;
- если cross-origin действительно нужен, использовать строгий allowlist и динамическое отражение только доверенного origin;
- валидировать production URL при startup;
- убрать `'unsafe-eval'` из production CSP;
- перейти к nonce/hash-based script policy там, где это совместимо с Next.js;
- после выбора Stripe/Maps/Analytics flow проверить CSP в browser console и разрешить только необходимые hosts;
- добавить HSTS только на production HTTPS и рассмотреть `Permissions-Policy`.

### P2.7. Cookie consent не управляет аналитикой

Файлы:

- `app/layout.tsx`
- `components/layout/CookieBanner.tsx`

`CookieBanner` только записывает `cookie-consent` в `localStorage`. Компонент Vercel `Analytics` монтируется безусловно, до выбора пользователя и после выбора `essential`. Следовательно, кнопка Essential Only фактически не отключает optional analytics.

Нужно:

- монтировать optional analytics только после явного consent, если выбранная юрисдикция требует opt-in;
- хранить версию consent и дать пользователю способ изменить решение;
- не заявлять наличие управляемого consent, пока выбор не влияет на загрузку/отправку аналитики;
- проверить фактическое сетевое поведение в чистом browser profile для состояний no choice / essential / all.

### P2.8. Профиль позволяет установить пароль без password policy

Файл: `app/profile/actions.ts`

`updateProfile` проверяет текущий пароль, но не валидирует длину/сложность `newPassword` и не ограничивает/нормализует `name`. Это позволяет авторизованному пользователю установить пароль слабее требований registration/reset. После изменения пароля существующие JWT sessions также не отзываются.

Нужно использовать единую Zod password/profile schema и session-version invalidation для всех flows.

### P2.9. Contact email HTML injection и ложный success

Файлы:

- `app/api/contact/route.ts`
- `lib/email.ts`

Поля `name`, `email`, `subject`, `message` и значения настроек вставляются в HTML/email attributes без escaping. Zod ограничивает длину, но не делает HTML escaping. Кроме того, `sendEmail` скрывает отказ и возвращает `null`, а contact endpoint всё равно отвечает `success: true`.

Нужно:

- применять общий контекстно-корректный escaping к HTML text и attribute values либо использовать безопасный email template renderer;
- не помещать непроверенные строки прямо в `mailto:`/subject attributes;
- нормализовать email;
- возвращать/логировать реальное состояние доставки и определить retry policy;
- добавить bot protection/rate-limit monitoring, поскольку без Redis rate limiting fail-open.

### P2.10. Repository hygiene и опасный debug script

Файлы:

- `run-bug.js`
- `audit.json`
- `audit-result.txt`
- `tsconfig.tsbuildinfo`
- `prisma/seed.sh`

`run-bug.js` отслеживается Git и при обычном запуске подключается к БД из окружения и создаёт фиктивную поездку. В нём продублирована уязвимая pricing-логика. Также tracked generated artifacts увеличивают риск устаревшей/чувствительной информации в продаваемом архиве. `.next` и локальные env не tracked, что является правильным.

Нужно:

- удалить `run-bug.js` либо перенести сценарий в автоматический тест с жёсткой проверкой test environment/test database;
- не распространять `.next`, audit artifacts и incremental build cache;
- решить, нужны ли `audit.json`/`audit-result.txt` в поставляемом шаблоне;
- удалить устаревший `prisma/seed.sh` или перевести его на фактически используемый `tsx`;
- добавить packaging allowlist для архива покупателя.

### P2.11. CMS/FAQ reads и mutations требуют разделения public/admin контрактов

Файлы:

- `app/actions/cms.ts`
- `app/api/faq/route.ts`
- `app/api/faq/[id]/route.ts`

`getPages` и `getPageBySlug` не проверяют роль и не фильтруют `isVisible`, поэтому server action может раскрыть скрытые/черновые записи. FAQ mutations проверяют admin, но передают весь body в Prisma без Zod/allowlist.

Нужно разделить public read (только visible + публичный DTO) и admin read/mutation (`requireAdmin` + строгие schemas).

## 6. Целевая модель данных

Минимально рекомендуемые изменения `Trip`:

- `bookingRequestId String @unique`;
- `paymentMethod PaymentMethod`;
- `paymentStatus PaymentStatus`;
- `stripeCheckoutSessionId String? @unique`;
- `stripePaymentIntentId String? @unique`;
- `amountTotalMinor Int` либо Decimal с единой conversion helper;
- `refundedAmountMinor Int @default(0)`;
- `paidAt DateTime?`;
- `checkoutExpiresAt DateTime?`;
- `distanceMeters Int?`;
- `durationSeconds Int?`;
- `luggageCount Int @default(0)`;
- `childSeatCount Int @default(0)`;
- snapshot тарифных ставок/fees/breakdown;
- `guestAccessTokenHash String? @unique`;
- timestamps для payment/notification processing по выбранной архитектуре.

Для строгого webhook dedup можно добавить:

`StripeWebhookEvent(id @id, type, objectId, processedAt, error)`.

Однако одного event ID недостаточно: Stripe может послать два разных события про один успешный платёж. Главная защита всё равно должна находиться в атомарном fulfillment по Checkout Session/Trip.

Для гарантированной доставки писем лучше добавить transactional outbox:

- состояние поездки и outbox records создаются в одной DB transaction;
- worker отправляет email с Resend idempotency key;
- retry не дублирует письмо;
- отдельно отслеживаются customer/admin recipients.

## 7. Рекомендуемый порядок исправлений

### Этап A — закрыть прямые security bypass

1. Добавить `requireAdmin()`.
2. Защитить settings/CMS mutation server actions.
3. Сделать trip admin PATCH admin-only.
4. Добавить Zod allowlist schemas для admin financial mutations.

### Этап B — нормализовать модель заказа

1. Новая taxi booking schema.
2. Структурированные extras.
3. Booking request idempotency.
4. Отдельные Stripe Session/PaymentIntent поля.
5. Payment method/status enums.
6. Миграция legacy Stripe IDs и купонов.

### Этап C — серверный quote и цена

1. Передача coordinates/place IDs из autocomplete.
2. Server Routes API helper.
3. Чистая функция расчёта цены.
4. Decimal/minor-unit стратегия.
5. Zone/discount/extra validation.
6. UI показывает server quote и не диктует сумму.

### Этап D — Stripe lifecycle

1. Idempotent Checkout Session create.
2. Единая `fulfillCheckoutSession`.
3. Amount/currency/payment status checks.
4. Atomic state transition.
5. Правильные failed/expired/refund transitions.
6. Resend idempotency/outbox.
7. Cleanup abandoned bookings.

### Этап E — тесты и deployment hardening

1. Unit tests pricing/state transitions.
2. Integration tests API/webhook/concurrency.
3. Stripe CLI E2E.
4. Dependency upgrades.
5. Production build без DB side effects.
6. Observability и runbook.

## 8. Обязательная матрица автоматических тестов

### 8.1 Pricing unit tests

- 0 km/обычный маршрут;
- base price и min price;
- distance price;
- optional minute price после фиксации бизнес-правила;
- каждая zone boundary;
- overlapping/invalid zones rejected;
- airport surcharge ровно один раз;
- luggage/child seat quantity;
- extras limits;
- percent discount;
- fixed discount;
- discount cannot make invalid Stripe amount;
- expired/inactive code;
- rounding на границах minor units;
- каждая разрешённая currency.

### 8.2 Booking API integration tests

- guest without email rejected согласованным сообщением;
- invalid/old datetime rejected;
- timezone correctly preserved;
- inactive tariff rejected;
- passengers/luggage above capacity rejected;
- disabled card/cash rejected;
- client-sent fake amount не влияет на сумму;
- duplicate bookingRequestId не создаёт второй Trip;
- Stripe create timeout retry не создаёт второй Trip/Session;
- invalid Routes response does not create payable booking;
- coupon race/limit handled atomically.

### 8.3 Webhook tests

- invalid/missing signature => 400;
- missing webhook secret => configuration failure;
- completed + paid + exact amount/currency => one fulfillment;
- completed + unpaid => no confirmation;
- wrong amount => no confirmation + alert;
- wrong currency => no confirmation + alert;
- metadata points to different trip => no confirmation;
- duplicate same event => no duplicate state/email;
- completed and payment_intent.succeeded concurrently => one fulfillment;
- async success/failed;
- expired before payment;
- failed attempt followed by success;
- success followed by delayed expired/failed event;
- partial refund;
- full refund;
- refund repeated;
- webhook temporary DB error returns retryable response.

Stripe Node позволяет создавать подписанные test payload через `stripe.webhooks.generateTestHeaderString`, поэтому signature tests можно запускать без Stripe CLI.

### 8.4 Authorization tests

- anonymous/customer cannot invoke settings mutations;
- anonymous/customer cannot invoke CMS mutations;
- owner cannot set trip status/driver/vehicle;
- admin can perform allowed transitions;
- owner/guest token can read only own trip;
- foreign authenticated user cannot read PII;
- only trip owner/guest token can review completed trip;
- one review per trip if такое правило принято.

### 8.5 Public settings boundary tests

- public layout/RSC содержит только allowlist полей `PublicStoreSettings`;
- `googleMapsApiKey`, внутренний `id` и marker server secret отсутствуют в HTML/RSC;
- anonymous/customer cannot invoke full settings read or mutation;
- server-only `GOOGLE_MAPS_ROUTES_API_KEY` никогда не возвращается клиентскому коду.

### 8.6 Operational/security regression tests

- profile password policy одинакова для registration/reset/change password;
- hidden CMS pages недоступны public read;
- FAQ/CMS mass assignment отклоняется schema;
- contact payload экранируется в HTML и email attributes;
- failed email delivery не возвращает ложный delivery success;
- analytics не загружается до consent и при Essential Only;
- production CSP/CORS проходят browser smoke test без лишних wildcard/eval allowances;
- debug scripts отказываются работать вне явно указанной test database.

## 9. Stripe CLI — предварительный локальный runbook

Полная финальная инструкция будет уточнена после реализации, но безопасная базовая схема такая.

### 9.1 Только test mode

Локально использовать:

- `STRIPE_SECRET_KEY=sk_test_...`;
- publishable key `pk_test_...`, только если он реально нужен клиенту;
- webhook secret, который печатает именно текущий процесс `stripe listen`.

Нельзя смешивать:

- test secret key с live webhook secret;
- live secret key с тестовой картой `4242...`;
- webhook secret Dashboard endpoint и временный secret Stripe CLI listener.

### 9.2 Терминал приложения

```bash
cd /home/svyatoslav/projects/taxi-project-template
npm run dev
```

### 9.3 Терминал Stripe CLI

```bash
stripe login
stripe listen \
  --events checkout.session.completed,checkout.session.async_payment_succeeded,checkout.session.async_payment_failed,checkout.session.expired,payment_intent.succeeded,payment_intent.payment_failed,charge.refunded \
  --forward-to localhost:3000/api/stripe/webhooks
```

CLI выведет `whsec_...`. Его нужно временно записать в `.env.local` как `STRIPE_WEBHOOK_SECRET`, затем перезапустить Next dev server.

### 9.4 Настоящий локальный E2E

Для проверки связи конкретной записи БД с конкретной суммой недостаточно команды `stripe trigger checkout.session.completed`: стандартный fixture не знает настоящий `tripId`, сумму и валюту локальной поездки.

Основной E2E:

1. Создать бронь через локальный UI.
2. Перейти в реальный Stripe Checkout test mode.
3. Использовать тестовую карту `4242 4242 4242 4242`, любую будущую дату, любой CVC.
4. Проверить listener output.
5. Проверить Trip в БД.
6. Проверить, что status/payment/email изменились один раз.
7. Повторно доставить событие и убедиться в идемпотентности.

Нужно также проверить test cards Stripe для decline, insufficient funds и 3DS/authentication. Точный набор и команды повторной доставки будут зафиксированы в финальном runbook после изменения webhook architecture.

### 9.5 Production endpoint

В Stripe Dashboard должен быть отдельный production webhook endpoint:

`https://<production-domain>/api/stripe/webhooks`

Его signing secret отличается от Stripe CLI secret.

Минимальный список событий должен соответствовать фактически реализованным handlers. Нельзя подписывать лишние события без причины, но обязательно подписать все используемые типы, включая `checkout.session.expired`, если код зависит от expiry.

## 10. Исправления документации и окружения

Файлы:

- `.env.example`
- `STRIPE_SETUP.md`

Нужно исправить:

- сначала test keys (`sk_test_`, `pk_test_`), потом отдельный production checklist;
- удалить инструкцию использовать тестовую карту после настройки live keys;
- добавить `DIRECT_URL`;
- добавить серверный `GOOGLE_MAPS_ROUTES_API_KEY`;
- унифицировать Google OAuth env names;
- описать различие Stripe CLI `whsec_` и Dashboard endpoint `whsec_`;
- добавить точный список webhook events;
- добавить localhost app URL;
- добавить обязательность Redis/rate limiting для production;
- добавить startup validation обязательных env;
- добавить ротацию секретов и правило никогда не коммитить `.env.local`.

## 11. Что нельзя обещать только статическим аудитом

Даже после исправления кода нельзя заявить «проблем не будет» без:

- отдельной тестовой PostgreSQL БД и применения миграций;
- реального Stripe test-mode Checkout;
- проверки повторной/конкурентной доставки webhook;
- проверки Resend test/domain configuration;
- production-like reverse proxy и trusted headers;
- backup/restore rehearsal;
- monitoring Stripe undelivered events и reconciliation job;
- проверки refund/cancellation бизнес-процесса владельцем шаблона.

Критерий готовности к live mode: все P0 закрыты, P1 payment/security пункты закрыты, автоматическая матрица проходит, Stripe CLI E2E проходит, dependency risk принят или устранён, webhook endpoint проверен в Dashboard test mode.
