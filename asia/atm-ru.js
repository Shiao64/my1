/* atm-ru.js v1 (2026-11-18): Russian UI for the Asia Tango Map (copied from atm-ko.js, like atm-es.js).
   Loaded only when the visitor chose Russian (asiaMapLang = ru, ?lang=ru, or a Russian phone).
   The page runs as the English page; this file swaps the English UI words for Russian.
   Event content follows the card's own *_ru fields when they exist (atm-i18n.js, note_ru in cardB/asia-map),
   otherwise English. Shiao 11/18: only mainland China cards get note_ru for now.
   Exact-match only, so an event called "Milonga Cool" is never touched. */
(function () {
  var D = document, R = D.documentElement;
  if (!/^ru/i.test(R.getAttribute('data-asia-lang') || R.lang || '')) return;
  var CITY = {
    'Shanghai': 'Шанхай', 'Beijing': 'Пекин', 'Tianjin': 'Тяньцзинь', 'Guangzhou': 'Гуанчжоу', 'Qingdao': 'Циндао',
    'Chengdu': 'Чэнду', 'Shenzhen': 'Шэньчжэнь', 'Chongqing': 'Чунцин', 'Haikou': 'Хайкоу', 'Hangzhou': 'Ханчжоу',
    "Xi'an": 'Сиань', 'Zhengzhou': 'Чжэнчжоу', 'Zhuhai': 'Чжухай', 'Nanjing': 'Нанкин', 'Suzhou': 'Сучжоу', 'Wuhan': 'Ухань',
    'Hong Kong': 'Гонконг', 'Macau': 'Макао', 'Taiwan': 'Тайвань', 'Taipei': 'Тайбэй', 'Moganshan': 'Моганьшань', 'New Taipei': 'Новый Тайбэй',
    'Taichung': 'Тайчжун', 'Tainan': 'Тайнань', 'Hsinchu': 'Синьчжу', 'Zhubei': 'Чжубэй', 'Miaoli': 'Мяоли',
    'Seoul': 'Сеул', 'Busan': 'Пусан', 'Daegu': 'Тэгу', 'Daejeon': 'Тэджон', 'Gwangju': 'Кванджу', 'Ulsan': 'Ульсан',
    'Changwon': 'Чханвон', 'Cheongju': 'Чхонджу', 'Gunsan': 'Кунсан', 'Jinju': 'Чинджу', 'Pohang': 'Пхохан',
    'Tokyo': 'Токио', 'Osaka': 'Осака', 'Singapore': 'Сингапур', 'Kuala Lumpur': 'Куала-Лумпур', 'Penang': 'Пенанг',
    'Da Nang': 'Дананг', 'Bandar Seri Begawan': 'Бандар-Сери-Бегаван',
    'China': 'Китай', 'South Korea': 'Южная Корея', 'Korea': 'Корея', 'Japan': 'Япония', 'Malaysia': 'Малайзия',
    'Vietnam': 'Вьетнам', 'Brunei': 'Бруней', 'Others': 'Другие', 'Mainland China': 'Материковый Китай'
  };
  var TYPE = {
    'Milonga': 'Милонга', 'Práctica': 'Практика', 'Practica': 'Практика', 'Práctilonga': 'Практилонга', 'Practilonga': 'Практилонга',
    'Festival': 'Фестиваль', 'Marathon': 'Марафон', 'Encuentro': 'Энкуэнтро', 'Weekend': 'Уикенд',
    'Encuentro / Weekend': 'Энкуэнтро / Уикенд', 'Anniversary': 'Юбилейная милонга', 'Workshop': 'Мастер-класс',
    'Championship': 'Чемпионат', 'Event': 'Событие', 'Class': 'Урок', 'One-off': 'Разовое',
    'Weekly': 'Еженедельно', 'Monthly': 'Ежемесячно', 'Biweekly': 'Раз в две недели'
  };
  var WD = { Sun: 'вс', Mon: 'пн', Tue: 'вт', Wed: 'ср', Thu: 'чт', Fri: 'пт', Sat: 'сб' };
  var WDL = { Sunday: 'воскресенье', Monday: 'понедельник', Tuesday: 'вторник', Wednesday: 'среда', Thursday: 'четверг', Friday: 'пятница', Saturday: 'суббота' };
  /* accusative after «каждый/каждую/каждое» */
  var EVERY = { Sun: 'Каждое воскресенье', Mon: 'Каждый понедельник', Tue: 'Каждый вторник', Wed: 'Каждую среду', Thu: 'Каждый четверг', Fri: 'Каждую пятницу', Sat: 'Каждую субботу',
    Sunday: 'Каждое воскресенье', Monday: 'Каждый понедельник', Tuesday: 'Каждый вторник', Wednesday: 'Каждую среду', Thursday: 'Каждый четверг', Friday: 'Каждую пятницу', Saturday: 'Каждую субботу' };
  /* grammatical gender of each weekday: m, f, n (for 1-й / 1-я / 1-е, последний / последняя / последнее) */
  var GEN = { Sunday: 'n', Monday: 'm', Tuesday: 'm', Wednesday: 'f', Thursday: 'm', Friday: 'f', Saturday: 'f' };
  var PO = { Sun: 'по воскресеньям', Mon: 'по понедельникам', Tue: 'по вторникам', Wed: 'по средам', Thu: 'по четвергам', Fri: 'по пятницам', Sat: 'по субботам' };
  var NUM = { '1st': '1', '2nd': '2', '3rd': '3', '4th': '4', '5th': '5' };
  function nth(x, g) {
    if (x === 'Last') return g === 'f' ? 'последняя' : g === 'n' ? 'последнее' : 'последний';
    return NUM[x] + (g === 'f' ? '-я' : g === 'n' ? '-е' : '-й');
  }
  function plural(n, one, few, many) { n = +n; var a = n % 10, b = n % 100; return a === 1 && b !== 11 ? one : a >= 2 && a <= 4 && (b < 12 || b > 14) ? few : many; }
  /* 11/22 (month/day) -> 22.11, the order Russian readers expect */
  function dm(s) { var m = /^(\d{1,2})\/(\d{1,2})$/.exec(s); return m ? m[2] + '.' + (m[1].length < 2 ? '0' + m[1] : m[1]) : s; }

  var S = {
    /* header, tabs, home */
    'Asia Tango Map': 'Карта танго Азии', 'Add event': 'Добавить событие', 'Saved': 'Избранное', 'Regular': 'Регулярные', 'Special': 'Особые',
    'Filter': 'Фильтр', 'See all ›': 'Все ›', 'Month': 'Месяц', 'Week': 'Неделя', 'Today': 'Сегодня', 'From today': 'С сегодняшнего дня',
    'by date': 'по дате', 'From today · by date': 'С сегодняшнего дня · по дате', 'Upcoming special': 'Ближайшие особые события',
    'Other cities': 'Другие города', 'All regular': 'Все регулярные', 'All special': 'Все особые', 'Special events': 'Особые события',
    'Regular events': 'Регулярные события', 'regular events': 'регулярные события', 'regular event': 'регулярное событие',
    'special event': 'особое событие', 'Mainland China · weekly · pick a city': 'Материковый Китай · еженедельно · выберите город',
    'Choose events': 'Выбрать события', 'All events': 'Все события', 'All cities': 'Все города', 'All events · All cities': 'Все события · Все города',
    'events': 'события', 'Events': 'События', 'Collapse': 'Свернуть', 'Expand': 'Развернуть', 'No events': 'Нет событий',
    'No events found': 'События не найдены', 'Clear filters': 'Сбросить фильтры', 'Finding milongas…': 'Ищем милонги…',
    'No saved events yet. Tap the star on an event to save it.': 'В избранном пока ничего нет. Нажмите звёздочку у события, чтобы сохранить его.',
    'Tap the star on an event to save it.': 'Нажмите звёздочку у события, чтобы сохранить его.',
    'Tap ☆ on an event to save it here': 'Нажмите ☆ у события, чтобы сохранить его здесь',
    'After you verify your email, this list restores on your other devices': 'После подтверждения почты этот список появится и на других ваших устройствах',
    'Festivals': 'Фестивали', 'Marathons': 'Марафоны', 'Encuentros / Weekends': 'Энкуэнтро / Уикенды', 'Anniversaries': 'Юбилейные милонги',
    'Workshops': 'Мастер-классы', 'Last': 'Последний', 'Cancelled': 'Отменено', 'Paused this week': 'На этой неделе нет',
    'Remove from favorites': 'Убрать из избранного', 'Add to favorites': 'В избранное', 'Save': 'Сохранить', 'Next': 'Далее',
    'Saved events': 'Избранные события', 'Choose city': 'Выбрать город', 'Choose a city': 'Выберите город', 'Select a city': 'Выберите город',
    'Later dates are projected from the weekly schedule and may change. Please confirm with the organizer.': 'Следующие даты рассчитаны по еженедельному расписанию и могут измениться. Уточняйте у организатора.',
    'Favorites': 'Избранное', 'FAVORITES': 'ИЗБРАННОЕ', 'My saved events': 'Мои сохранённые события', 'Recommended': 'Рекомендуем', 'RECOMMENDED': 'РЕКОМЕНДУЕМ',
    'Weekly milongas & practicas': 'Еженедельные милонги и практики', '— Weekly milongas & practicas': '— Еженедельные милонги и практики',
    'No events match these filters in this city.': 'В этом городе нет событий по этим фильтрам.',
    'No listings match these filters.': 'Нет событий по этим фильтрам.', 'All cities · Special events by start date': 'Все города · Особые события по дате начала',
    'Weekly milonga · This week\'s theme': 'Еженедельная милонга · Тема недели', 'TBA': 'Уточняется',
    /* card */
    'Preview': 'Анонс', 'Details to be announced': 'Подробности позже', 'Preview · Details to be announced': 'Анонс · Подробности позже', 'Venue to be announced': 'Место уточняется', 'Venue': 'Место', 'ORG': 'ОРГ', 'Info': 'Информация', 'please check with the organizer': 'уточните у организатора', 'Not updated for a long time; it may have stopped': 'Давно не обновлялось — возможно, больше не проводится', 'Contact info not yet available; best to check with local dancers before going': 'Контактов пока нет; перед поездкой лучше уточнить у местных танцоров', 'Organizer': 'Организатор', 'Address': 'Адрес', 'City': 'Город', 'Time': 'Время', 'Fee': 'Вход',
    'Notes': 'Примечания', 'Note': 'Примечание', 'Notice': 'Объявление', 'Notice ›': 'Объявление ›', 'More': 'Подробнее', 'Less': 'Свернуть', 'Collapse ⌃': 'Свернуть ⌃',
    'Links': 'Ссылки', 'Website': 'Сайт', 'Event website': 'Сайт события', 'Video': 'Видео', 'Register': 'Регистрация',
    'Details': 'Подробности', 'Event details': 'О событии', 'Phone': 'Телефон', 'Email': 'Почта', 'WeChat': 'WeChat',
    'WeChat ID:': 'WeChat ID:', 'Phone:': 'Телефон:', 'Email:': 'Почта:', 'Phone/WeChat:': 'Телефон/WeChat:',
    'WeChat Article': 'Статья в WeChat', 'WeChat article': 'Статья в WeChat', 'Temporarily changed': 'Временно изменено',
    'Newer poster': 'Новее', 'Older poster': 'Предыдущая афиша', 'Past poster': 'Прошлая афиша', 'Previous poster': 'Предыдущая афиша', 'Next poster': 'Следующая афиша',
    'ENDED': 'ЗАВЕРШЕНО', 'This event has ended': 'Это событие завершилось', 'View all events': 'Все события', 'Next edition:': 'Следующий раз:',
    '📷 Recap': '📷 Фотоотчёт', 'Photos:': 'Фото:', '★ Special events': '★ Особые события', 'This card is not on the map': 'Этой карточки нет на карте',
    'The map could not load this card. That does not mean the event has ended.': 'Не удалось загрузить карточку. Это не значит, что событие завершилось.',
    'Try again': 'Повторить', 'Back': 'Назад', 'Back to list': 'К списку', 'Search': 'Поиск', 'Menu': 'Меню', 'Close': 'Закрыть', 'Map ↗': 'Карта ↗', 'Enlarge': 'Увеличить', 'Show this to a driver': 'Показать водителю', 'Open map': 'Открыть карту', 'Copy address': 'Скопировать адрес', 'Copied': 'Скопировано', 'Route pictures': 'Фото маршрута', 'Directions': 'Как добраться',
    'No · Not confirmed, please contact the organizer': 'Нет · Не подтверждено, уточните у организатора',
    'Viewed': 'Просмотренные', 'Recently viewed': 'Недавно просмотренные', 'Hide': 'Скрыть', 'Show': 'Показать', 'Clear': 'Очистить',
    /* menu */
    'Sources': 'Источники', 'Contact': 'Контакты', 'Email us': 'Написать нам', 'Subscribe': 'Подписаться', 'Submit event': 'Прислать событие',
    'Share': 'Поделиться', 'Copy link': 'Скопировать ссылку', 'Refresh': 'Обновить', 'My ATM': 'Мой ATM', 'About': 'О сайте', 'My profile': 'Мой профиль', 'Subscription & account': 'Подписка и аккаунт',
    'Cancel': 'Отмена', 'More actions': 'Ещё', 'Language': 'Язык',
    /* notice */
    'Beta Notice & Disclaimer': 'Бета-версия и отказ от ответственности',
    'Asia Tango Map (ATM) is still in beta. Event information may be inaccurate or out of date.': 'Asia Tango Map (ATM) пока работает в бета-версии. Информация о событиях может быть неточной или устаревшей.',
    'Before attending, please confirm the date, time, venue, itinerary and registration arrangements directly with the organizer before making travel plans or payments. The organizer’s latest confirmation takes precedence. This site provides information for reference only; saving an event or selecting Going / Interested is not a formal registration.': 'Прежде чем идти, планировать поездку или платить, уточните у организатора дату, время, место, программу и порядок регистрации. Действует последнее подтверждение организатора.\n\nИнформация на сайте носит справочный характер; сохранение события или отметка «Пойду» / «Интересно» не являются официальной регистрацией.',
    'I understand, enter the site': 'Понятно, перейти на сайт',
    /* submit-event form */
    'Event name': 'Название события', 'Date': 'Дата', 'Your email': 'Ваша почта', '(Required)': '(Обязательно)', 'required': 'обязательно',
    'Your WeChat ID': 'Ваш WeChat ID', 'Submit': 'Отправить', 'Thank you': 'Спасибо', 'One-time or regular': 'Разовое или регулярное',
    'State one-time or regular; for regular, give the frequency, e.g. weekly or monthly': 'Укажите, разовое это событие или регулярное; для регулярного — как часто (например, еженедельно или ежемесячно)',
    'Event info compiled from WeChat and Facebook, with reference to': 'Информация собрана из WeChat и Facebook, а также с сайта',
    '. Please check the organizer\'s latest announcement for times and details.': '. Время и подробности уточняйте в последнем объявлении организатора.',
    /* star / going */
    'Going': 'Пойду', '✓ Going': '✓ Пойду', 'Interested': 'Интересно', 'Not Going': 'Не пойду', 'Withdraw': 'Отменить', 'Keep': 'Оставить', 'Confirm': 'Подтвердить',
    'Saved. Find it under Saved.': 'Сохранено. Ищите во вкладке «Избранное».',
    'Want a note when these events change or registration closes?': 'Сообщить вам, когда у этих событий что-то изменится или закроется регистрация?', 'No thanks': 'Нет, спасибо', 'Get special-event news': 'Получать новости об особых событиях', 'New festivals, marathons and registration deadlines, sent now and then': 'Новые фестивали, марафоны и сроки регистрации — время от времени',
    'Saved. This one is not sent to the organizer.': 'Сохранено. Организатору это не отправляется.',
    'Remove this event from favorites?': 'Убрать это событие из избранного?',
    'Not a ticket or a formal registration.': 'Это не билет и не официальная регистрация.',
    'In testing. Later the organizer will get your name. This is not a booking or ticket.': 'В тестовом режиме. Позже организатор получит ваше имя. Это не бронь и не билет.',
    'Going is not a ticket or a formal registration.': '«Пойду» — это не билет и не официальная регистрация.',
    'Get early-bird, deadline and organizer notices for this event': 'Получать новости о ранней цене, сроках и объявления организатора',
    'First time: enter your email and the last 4 digits of your mobile, then tap the link in the confirmation email. After that, the same two fields sign you in.': 'В первый раз: введите почту и последние 4 цифры мобильного, затем нажмите ссылку в письме-подтверждении. Дальше вход по этим же двум полям.',
    'Complete your details and send the confirmation email. Tap the link in it and you’re done.': 'Заполните данные и отправьте письмо-подтверждение. Нажмите ссылку в письме — и готово.',
    'Event news': 'Новости событий',
    'The confirmation link may open in another browser. After confirming, come back here (e.g. WeChat) and sign in with the same email and last 4 digits.': 'Ссылка подтверждения может открыться в другом браузере. После подтверждения вернитесь сюда (например, в WeChat) и войдите с той же почтой и последними 4 цифрами.',
    'Event news now and then, mostly special events. Unsubscribe any time.': 'Новости время от времени, в основном об особых событиях. Отписаться можно в любой момент.',
    'Going to an event? On its page choose Going or Interested, and the organizer can tell you about early-bird prices, deadlines and directions.': 'Собираетесь на событие? На его странице выберите «Пойду» или «Интересно», и организатор сможет сообщить вам о ранней цене, сроках регистрации и о том, как добраться.', 'Directions (optional)': 'Как добраться (необязательно)',
    'Get early-bird deadlines, directions and updates from the organizer.': 'Получайте от организатора сроки ранней цены, схему проезда и новости.',
    'Choose Going, Interested, or Not Going.': 'Выберите «Пойду», «Интересно» или «Не пойду».',
    'Confirm your email first. Your intent is saved when you confirm.': 'Сначала подтвердите почту. Выбор сохранится после подтверждения.',
    'All fields are required': 'Заполните все поля',
    'After one verification on this device, you won’t need to verify again to choose Going or Interested.': 'После одного подтверждения на этом устройстве больше не нужно подтверждать, чтобы выбрать «Пойду» или «Интересно».',
    'Confirmation email sent. Your intent is saved when you confirm.': 'Письмо-подтверждение отправлено. Выбор сохранится после подтверждения.',
    'Email sent — please confirm in your inbox': 'Письмо отправлено — подтвердите его в почте',
    'Didn\'t get the email? Check your spam or junk folder.': 'Не пришло письмо? Проверьте папку «Спам».',
    'Check your spam folder first. You can resend once after 1 minute.': 'Сначала проверьте «Спам». Отправить ещё раз можно через 1 минуту.',
    'Already resent. Please check your inbox, or try again later.': 'Уже отправлено повторно. Проверьте почту или попробуйте позже.',
    'Resend verification email': 'Отправить письмо ещё раз', 'Email confirmed. Your intent is saved.': 'Почта подтверждена. Выбор сохранён.',
    'Email verified. Profile saved. Use the star on an event to choose Going or Interested.': 'Почта подтверждена, профиль сохранён. Нажмите звёздочку у события, чтобы выбрать «Пойду» или «Интересно».',
    'Saved. The organizer will be notified.': 'Сохранено. Организатор получит уведомление.', 'Saved. The organizer email was not found.': 'Сохранено. Почта организатора не найдена.',
    'RSVP unavailable. Please contact the organizer.': 'Отметиться здесь нельзя. Свяжитесь с организатором.',
    'Saved. The notification failed to send.': 'Сохранено. Уведомление отправить не удалось.',
    'Please complete city, role, and any missing fields. No need to re-verify the same email.': 'Заполните город, роль и другие пустые поля. Ту же почту подтверждать заново не нужно.',
    'Cancel intent': 'Отменить выбор', 'Cancel this intent? We will not email the organizer again, and mail already sent is not recalled.': 'Отменить выбор? Мы больше не будем писать организатору, но уже отправленное письмо не отозвать.',
    'Intent cancelled. No new email was sent to the organizer.': 'Выбор отменён. Новое письмо организатору не отправлялось.',
    'Email confirmed': 'Почта подтверждена', 'Unsubscribe from this event’s updates (keeps your Going / Interested)': 'Отписаться от новостей этого события («Пойду» / «Интересно» останется)',
    'Date (Beijing time, UTC+8)': 'Дата (пекинское время, UTC+8)', 'No event intents yet.': 'Вы пока ничего не выбрали.',
    'Organizer email not available yet': 'Почты организатора пока нет', 'Checking organizer email': 'Проверяем почту организатора',
    'Finish the human check, then tap Confirm.': 'Пройдите проверку «я не робот» и нажмите «Подтвердить».', 'Finish the human check, then send.': 'Пройдите проверку «я не робот» и отправьте.',
    'The check did not finish. Wait a moment and try again.': 'Проверка не завершилась. Подождите немного и попробуйте снова.',
    'The check expired. Wait until it finishes, then try again.': 'Время проверки истекло. Дождитесь её завершения и попробуйте снова.',
    'The check timed out. Please try again.': 'Проверка заняла слишком много времени. Попробуйте снова.',
    'The check was not accepted. Wait until it finishes, then try again.': 'Проверка не пройдена. Дождитесь её завершения и попробуйте снова.',
    'Network error. Please try again.': 'Ошибка сети. Попробуйте снова.', 'This did not go through. Please try again.': 'Не получилось. Попробуйте снова.',
    'Please try again later.': 'Попробуйте позже.', 'Too many confirmation emails. Please try again later.': 'Слишком много писем-подтверждений. Попробуйте позже.',
    'Event intent': 'Мой выбор', 'Manage intent': 'Изменить выбор', 'Intent saved': 'Выбор сохранён',
    'Tap the star to choose Going or Interested. It shows here after you verify your email.': 'Нажмите звёздочку, чтобы выбрать «Пойду» или «Интересно». После подтверждения почты выбор появится здесь.',
    /* subscribe / sign in */
    'Name': 'Имя', 'Your name': 'Ваше имя', 'Your city': 'Ваш город',
    'Role': 'Роль', 'Choose': 'Выбрать', 'Leader': 'Партнёр', 'Follower': 'Партнёрша', 'Both': 'Обе роли',
    'Please enter your name.': 'Введите имя.', 'Please enter your city.': 'Введите город.',
    'Please choose Leader, follower, or both.': 'Выберите: партнёр, партнёрша или обе роли.', 'Join ATM site-wide subscription': 'Подписаться на новости ATM',
    'Please enter your email.': 'Введите почту.', 'Please check your email address.': 'Проверьте адрес почты.',
    'We couldn’t send the verification email. Check the address or try again.': 'Не удалось отправить письмо. Проверьте адрес или попробуйте снова.',
    'Already subscribed? Enter your email and the last 4 digits of your mobile. You don’t need another confirmation email.': 'Уже подписаны? Введите почту и последние 4 цифры мобильного. Новое письмо-подтверждение не нужно.',
    'Mobile number': 'Номер мобильного', 'Mobile last 4 digits': 'Последние 4 цифры мобильного', 'Sign in': 'Войти', 'Signing in…': 'Входим…',
    ' (optional)': ' (необязательно)', '(optional)': '(необязательно)', 'Check your email': 'Проверьте почту', 'Confirmation email sent to:': 'Письмо-подтверждение отправлено на:',
    'Open your email. Not there? Check spam or junk.': 'Откройте почту. Нет письма? Проверьте «Спам».', 'Tap Confirm in the email.': 'Нажмите «Подтвердить» в письме.',
    'Tap Confirm in the email, or enter its 6-digit code below.': 'Нажмите «Подтвердить» в письме или введите ниже 6-значный код из него.',
    'Come back to this page. You’ll be signed in automatically.': 'Вернитесь на эту страницу — вход выполнится автоматически.',
    '6-digit code': '6-значный код', 'Sign in with code': 'Войти по коду', 'That code is not right.': 'Код неверный.',
    'The code has expired. Please send again.': 'Срок действия кода истёк. Отправьте ещё раз.', 'Too many wrong codes. Please send again.': 'Слишком много неверных кодов. Отправьте ещё раз.',
    'Didn’t get it? Send again': 'Не пришло? Отправить ещё раз', 'Confirmed? Sign in': 'Подтвердили? Войти',
    'After you tap the confirmation link, your email and the last 4 digits sign you in.': 'После перехода по ссылке входите с почтой и последними 4 цифрами.',
    'No human check showing? It may be the network. Turn off VPN, or switch Wi-Fi / mobile data, then reopen this page.': 'Не видно проверки «я не робот»? Возможно, дело в сети. Выключите VPN или переключитесь между Wi-Fi и мобильным интернетом и откройте страницу снова.',
    'Or enter the 6-digit code from the email': 'Или введите 6-значный код из письма',
    'Register / sign in': 'Регистрация / вход', 'Send confirmation email': 'Отправить письмо-подтверждение', 'Send verification email': 'Отправить письмо-подтверждение',
    'Please enter your phone number.': 'Введите номер телефона.', 'That phone number does not look valid.': 'Номер телефона выглядит неверным.',
    'Enter the last 4 digits of your mobile.': 'Введите последние 4 цифры мобильного.', 'The email or the mobile last 4 digits did not match.': 'Почта или последние 4 цифры не совпадают.',
    'Saving…': 'Сохраняем…', 'Unsubscribe': 'Отписаться', 'Sending…': 'Отправляем…', 'Confirmed': 'Подтверждено',
    'Profile saved. This device is already verified, so no new email was sent.': 'Профиль сохранён. Это устройство уже подтверждено, поэтому новое письмо не отправлялось.',
    'Something went wrong. Please try again later.': 'Что-то пошло не так. Попробуйте позже.', 'Too many tries. Please try again later.': 'Слишком много попыток. Попробуйте позже.',
    'My subscription': 'Моя подписка', 'Copy': 'Копировать', 'New link': 'Новая ссылка', 'A new link stops the old one. Continue?': 'Новая ссылка отключит старую. Продолжить?',
    'Open this link in WeChat, Safari, Chrome, or another browser to sign in. No new confirmation email.': 'Откройте эту ссылку в WeChat, Safari, Chrome или другом браузере, чтобы войти. Нового письма не будет.',
    'This browser does not have the link saved. A new link stops the old one.': 'В этом браузере ссылка не сохранена. Новая ссылка отключит старую.',
    'The link saved in this browser no longer works. You can make a new one.': 'Сохранённая в этом браузере ссылка больше не работает. Можно создать новую.',
    'The subscription link could not be loaded. Try again later.': 'Не удалось загрузить ссылку подписки. Попробуйте позже.',
    /* how-to, intro, push */
    'Find tango in 3 steps': 'Найдите танго за 3 шага', 'Got it': 'Понятно', 'Asia Tango Map — find Argentine tango across Asia': 'Карта танго Азии — аргентинское танго по всей Азии',
    '— find Argentine tango across Asia': '— аргентинское танго по всей Азии', 'Milongas, festivals & marathons near you': 'Милонги, фестивали и марафоны рядом с вами',
    '🔔 Turn on push alerts': '🔔 Включить уведомления', '🔕 Turn off push alerts': '🔕 Выключить уведомления', 'Working…': 'Подождите…',
    'Push alerts are off.': 'Уведомления выключены.', 'This browser does not support push notifications.': 'Этот браузер не поддерживает push-уведомления.',
    'Could not turn on push alerts. Please try again later.': 'Не удалось включить уведомления. Попробуйте позже.',
    /* lowercase type label on special-event cards */
    'workshop': 'мастер-класс', 'marathon': 'марафон', 'festival': 'фестиваль', 'weekend': 'уикенд', 'anniversary': 'юбилей', 'championship': 'чемпионат', 'practica': 'практика', 'milonga': 'милонга', 'encuentro': 'энкуэнтро',
    'None yet': 'Пока нет', 'prev': 'назад', 'next': 'вперёд',
    'Sun': 'вс', 'Mon': 'пн', 'Tue': 'вт', 'Wed': 'ср', 'Thu': 'чт', 'Fri': 'пт', 'Sat': 'сб',
    'Sunday': 'воскресенье', 'Monday': 'понедельник', 'Tuesday': 'вторник', 'Wednesday': 'среда', 'Thursday': 'четверг', 'Friday': 'пятница', 'Saturday': 'суббота'
  };
  /* whole elements whose text is split by inline tags (<em>, <b>): matched on textContent, replaced as HTML */
  var SE = {
  };
  var k; for (k in CITY) if (!S[k]) S[k] = CITY[k];
  for (k in TYPE) if (!S[k]) S[k] = TYPE[k];
  var WDK = 'Sun|Mon|Tue|Wed|Thu|Fri|Sat', WDLK = 'Sunday|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday';

  function city(s) { return CITY[s] || s; }
  function type(s) { return TYPE[s] || S[s] || s; }
  /* " · Beijing" / " · Workshop" tails after a date or time */
  function tail(s) { return s.split(' · ').map(function (p, i) { return i ? (CITY[p] || TYPE[p] || S[p] || p) : p; }).join(' · '); }
  /* "Every Mon Práctica": a single type word after the weekday (no ' · ') */
  function rest(s) { var m = /^ ([^·]+)$/.exec(s); return m ? ' ' + type(m[1].trim()).toLowerCase() : tail(s); }
  function cap(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }

  var P = [
    [/^Updated (today|yesterday|(\d+) days ago|(\d{2}\/\d{2}|\d{4}\/\d{2}\/\d{2}))$/, function (m) { return 'Обновлено ' + (m[1] === 'today' ? 'сегодня' : m[1] === 'yesterday' ? 'вчера' : m[2] ? m[2] + ' дн. назад' : m[3]); }],
    [/^Confirmed by organizer (today|yesterday|(\d+) days ago)$/, function (m) { return 'Подтверждено организатором ' + (m[1] === 'today' ? 'сегодня' : m[1] === 'yesterday' ? 'вчера' : m[2] + ' дн. назад'); }],
    [new RegExp('^(Today · )?(' + WDK + ') (\\d{1,2}/\\d{1,2})$'), function (m) { return (m[1] ? 'Сегодня · ' : '') + WD[m[2]] + ' ' + dm(m[3]); }],
    [new RegExp('^(' + WDLK + ') (\\d{1,2}/\\d{1,2})$'), function (m) { return cap(WDL[m[1]]) + ' ' + dm(m[2]); }],
    [new RegExp('^Every other (' + WDK + '|' + WDLK + ')\\b(.*)$'), function (m) { return 'Раз в две недели ' + PO[m[1].slice(0, 3)] + rest(m[2]); }],
    [new RegExp('^Every (' + WDK + '|' + WDLK + ')\\b(.*)$'), function (m) { return EVERY[m[1]] + rest(m[2]); }],
    [new RegExp('^((?:1st|2nd|3rd|4th|5th|Last)(?:(?: & |, | and )(?:1st|2nd|3rd|4th|5th|Last))*) (' + WDLK + ')(?: of the month)?( .*)?$'), function (m) {
      var g = GEN[m[2]];
      return cap(m[1].split(/ & |, | and /).map(function (x) { return nth(x, g); }).join(' и ')) + ' ' + WDL[m[2]] + ' месяца' + (m[3] ? ' · ' + type(m[3].trim()) : ''); }],
    [/^(Weekly|Monthly|Biweekly|One-off) · (.+)$/, function (m) { return TYPE[m[1]] + ' · ' + type(m[2]); }],
    [/^([\d/–:\- ]+) · (.+)$/, function (m) { return m[1] + ' · ' + tail(m[2]).split(' · ').map(type).join(' · '); }],
    [/^Upcoming special · (.+)$/, function (m) { return 'Ближайшие особые события · ' + city(m[1]); }],
    [/^(.+) ▾$/, function (m) { return CITY[m[1]] ? CITY[m[1]] + ' ▾' : null; }],
    [/^(.+) \((\d+)\)$/, function (m) { return CITY[m[1]] ? CITY[m[1]] + ' (' + m[2] + ')' : null; }],
    [/^(.+) ·$/, function (m) { return CITY[m[1]] ? CITY[m[1]] + ' ·' : null; }],
    [/^(.+): back to top to change city$/, function (m) { return city(m[1]) + ': вернитесь наверх, чтобы сменить город'; }],
    [/^☆ (\d+) saved events?$/, function (m) { return '☆ ' + m[1] + ' ' + plural(m[1], 'событие', 'события', 'событий') + ' в избранном'; }],
    [/^(\d+) saved events?$/, function (m) { return m[1] + ' ' + plural(m[1], 'событие', 'события', 'событий') + ' в избранном'; }],
    [/^(Milonga|Práctica|Practica|Festival|Marathon|Event|Encuentro|Weekend|Workshop|Anniversary) (\d{4}\/\d{2}\/\d{2}(?:–(?:\d{4}\/)?\d{2}\/\d{2})?)$/, function (m) { return type(m[1]) + ' ' + m[2]; }],
    [/^WeChat ID: (.+)$/, function (m) { return 'WeChat ID: ' + m[1]; }],
    [/^WeChat Official Account: (.+)$/, function (m) { return 'Официальный аккаунт WeChat: ' + m[1]; }],
    [/^WeChat Channels: (.+)$/, function (m) { return 'Каналы WeChat: ' + m[1]; }],
    [/^See upcoming events in (.+)$/, function (m) { return 'Ближайшие события: ' + city(m[1]); }],
    [/^Coming up in (.+)$/, function (m) { return 'Скоро: ' + city(m[1]); }],
    [/^(\d+)s until you can send again$/, function (m) { return 'Отправить снова можно через ' + m[1] + ' с'; }],
    [/^Route pictures (\d+) \/ (\d+)$/, function (m) { return 'Фото маршрута ' + m[1] + ' / ' + m[2]; }],
    [/^beta (\S+)$/, function (m) { return 'бета ' + m[1]; }],
    [/^(Ended|Event ended) · (.+)$/, function (m) { return 'Завершено · ' + m[2]; }]
  ];


  function tr(s) {
    var t = s.replace(/\s+/g, ' ').trim();
    if (!t || !/[A-Za-z]/.test(t)) return null;
    var v = S[t]; if (v == null && SE[t] != null && !/</.test(SE[t])) v = SE[t];
    if (v == null) {
      for (var i = 0; i < P.length && v == null; i++) { var m = P[i][0].exec(t); if (m) v = P[i][1](m); }
    }
    if (v == null || v === t) return null;
    var lead = /^\s*/.exec(s)[0], trail = /\s*$/.exec(s)[0];
    return lead + v + trail;
  }

  var SKIP = /^(SCRIPT|STYLE|TEXTAREA|INPUT|CODE|PRE|NOSCRIPT)$/;
  var ATTR = ['aria-label', 'placeholder', 'title', 'alt'];
  function skip(el) { for (; el && el !== D.body; el = el.parentNode) { if (el.nodeType === 1 && (SKIP.test(el.tagName) || el.hasAttribute('data-ko-skip') || (el.hasAttribute('lang') && el !== R && !/^ru/i.test(el.getAttribute('lang'))))) return true; } return false; }
  function doText(n) { if (!n.nodeValue || skip(n.parentNode)) return; var v = tr(n.nodeValue); if (v != null) n.nodeValue = v; }
  function doAttrs(el) { for (var i = 0; i < ATTR.length; i++) { var a = el.getAttribute && el.getAttribute(ATTR[i]); if (a) { var v = tr(a); if (v != null) el.setAttribute(ATTR[i], v); } } }
  function doEl(el) { if (!el.firstElementChild) return false; var t = (el.textContent || '').replace(/\s+/g, ' ').trim(); var v = SE[t]; if (v == null) return false; el.innerHTML = v; return true; }
  function walk(root) {
    if (!root) return;
    if (root.nodeType === 3) { doText(root); return; }
    if (root.nodeType !== 1 || skip(root)) return;
    doAttrs(root); if (doEl(root)) return;
    var w = D.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, null), n;
    while ((n = w.nextNode())) { if (n.nodeType === 3) doText(n); else { doAttrs(n); doEl(n); } }
  }

  var busy = false;
  var mo = new MutationObserver(function (list) {
    if (busy) return; busy = true;
    try {
      for (var i = 0; i < list.length; i++) {
        var r = list[i];
        if (r.type === 'childList') { if (r.addedNodes.length && r.target.nodeType === 1 && doEl(r.target)) continue; for (var j = 0; j < r.addedNodes.length; j++) walk(r.addedNodes[j]); }
        else if (r.type === 'characterData') doText(r.target);
        else if (r.type === 'attributes') { var a = r.target.getAttribute(r.attributeName); var v = a && tr(a); if (v != null) r.target.setAttribute(r.attributeName, v); }
      }
    } finally { mo.takeRecords(); busy = false; }
  });
  mo.observe(R, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTR });
  /* a translation with a blank line becomes separate <p> */
  function splitNotice() { [].forEach.call(D.querySelectorAll('#atm-notice .atm-notice-body p'), function (p) { var t = p.textContent; if (t.indexOf('\n\n') < 0) return; var parts = t.split('\n\n'); p.textContent = parts[0]; for (var i = parts.length - 1; i > 0; i--) { var q = D.createElement('p'); q.textContent = parts[i]; p.parentNode.insertBefore(q, p.nextSibling); } }); }
  /* On a Russian page the English link must say ?lang=en, or the saved choice (ru) would bring the visitor straight back to Russian. */
  function langMenu() {
    [].forEach.call(D.querySelectorAll('.top-lang a[data-asia-lang-set="en"][aria-current]'), function (a) { a.removeAttribute('aria-current'); a.setAttribute('href', a.getAttribute('href').replace(/[?&]lang=ru\b/, '') ); });
    [].forEach.call(D.querySelectorAll('.top-lang a[data-asia-lang-set="en"]'), function (a) { var h = a.getAttribute('href') || './'; if (!/[?&]lang=en\b/.test(h)) a.setAttribute('href', h + (h.indexOf('?') < 0 ? '?' : '&') + 'lang=en'); });
  }
  D.addEventListener('DOMContentLoaded', function () { busy = true; langMenu(); walk(D.body); splitNotice(); try { D.title = 'Карта танго Азии · Select Tango Weekend'; } catch (e) {} mo.takeRecords(); busy = false; });

  /* native dialogs */
  var oc = window.confirm; window.confirm = function (m) { return oc.call(window, tr(String(m)) || m); };
  var oa = window.alert; window.alert = function (m) { return oa.call(window, tr(String(m)) || m); };

  window.ATM_RU = { tr: tr, walk: walk };
})();
