export const messagesRu = {
  AMOUNT_MUST_BE_NUMBER: 'Сумма должна быть числом',
  WELCOME_MESSAGE: `Добро пожаловать в многопользовательскую онлайн-игру PRS Titans!

PRS Titans — первая многопользовательская онлайн-игра в реальном времени на блокчейне TON с механикой Win2Earn.

Выигрываете -> забираете деньги 🚀`,
  WISHLIST_BUTTON: '✅ В белый список!',
  JOIN_CHANNEL_BUTTON: '👋 Присоединиться к каналу',
  COMMUNITY_BUTTON: '📢 Присоединяйтесь к сообществу',
  REFERRAL_BUTTON: '🎁 Реферал',
  EARN_MORE_BUTTON: '💵 Заработать больше!',
  RUSSIAN_BUTTON: '🇷🇺 Русский',
  PERSIAN_BUTTON: '🇮🇷 Персидский',
  TURKISH_BUTTON: '🇹🇷 Турецкий',
  CANT_REFER_SELF: 'Вы не можете пригласить самого себя',
  ALREADY_JOINED: "Вы уже присоединились!",
  NEW_REFERRAL: (username: string, bonus: number) => `Поздравляем! @${username} присоединился по вашему приглашению, вот ${bonus} монет.`,
  JOINED_WITH_REFERRAL: (refereeName: string, bonus: number) => `Вы присоединились по реферальному коду @${refereeName}, поздравляем, вы получили ${bonus} монет.`,
  REFERRAL_LINK_MESSAGE: (userId: string | number) => `Присоединяйтесь к реферальной программе RPS Titans!

Вот как это работает в RPS Titans:

👥 Приглашайте друзей играть в игру в Telegram
💰 Вы получаете 20 монет за каждого нового пользователя, которого вы пригласили
🎁 Ваш друг получает 10 монет в качестве приветственного бонуса
🔥 В течение недели запуска лучшие рефереры получают бонусные награды и приоритет в белом списке

🔗 Вот ваша реферальная ссылка: https://t.me/RPS_Titans_bot?start=${userId}`,
  ERROR_PROCESSING_REFERRAL_REQUEST: "Ошибка: не удалось обработать запрос на реферала.",
  REV_SHARE_INFO: `Что такое Rev-Share в RPS Titans?

Rev-share означает, что вы получаете долю дохода игры, когда люди играют в вашей группе Telegram.

📌 Вот как это работает:

Вы добавляете бота RPS Titans в свою группу.

Когда игроки играют в вашей группе, бот взимает небольшую комиссию.

Вы получаете процент от этой комиссии — автоматически.

Это как получать деньги каждый раз, когда кто-то играет! 🎯
Никакой дополнительной работы не требуется. Просто пригласите бота и пусть начнутся игры.

🌐 Партнеры (https://www.rpstitans.xyz/partners)

🚀 Готовы зарабатывать на активности вашей группы? `,
  PARTNER_YES_BUTTON: 'Да',
  PARTNER_NO_BUTTON: 'Нет',
  REV_SHARE_REQUEST_PROCESSING: `Ваша заявка на участие в программе rev-share рассматривается.
Мы получаем большое количество запросов, поэтому, пожалуйста, будьте терпеливы.

Вы будете уведомлены, как только она будет одобрена. ⏳`,
  REV_SHARE_REQUEST_APPROVED: 'Ваш запрос на присоединение к программе распределения доходов уже принят, следите за обновлениями.',
  PARTNER_INSTRUCTIONS: `Отлично! 🎉 Чтобы стать партнером по программе rev-share:

➕ Добавьте этого бота в свою группу Telegram.

Как только вы это сделаете, мы автоматически обнаружим вашу группу и обработаем ваш запрос. Обратите внимание: в настоящее время распределение доходов поддерживается для публичных групп (тех, у кого есть @имя пользователя Telegram).

Мы сообщим вам здесь, как только ваш запрос будет рассмотрен. 🚀`,
  PARTNER_NO_MESSAGE: 'Ну, для некоторых решений нужны яйца 🍒',
  ERROR_TRY_AGAIN: 'Произошла ошибка. Пожалуйста, попробуйте еще раз.',
  ERROR_COULD_NOT_PROCESS_REQUEST: "Ошибка: не удалось обработать запрос.",
  BOT_ADDED_TO_GROUP_CONFIRMATION: (groupTitle: string) => `Отличные новости! Бот RPS Titans был успешно добавлен в вашу группу: '${groupTitle || 'Группа без названия'}'.

Ваш запрос на участие в программе rev-share сейчас находится на рассмотрении, и мы сообщим вам о результатах здесь. Мы ценим ваше терпение, так как получаем большое количество запросов.

Спасибо за партнерство с RPS Titans! 💪`,

  // Game Gateway Messages
  LOST_ROUND_DEFAULT: (amount: number, reason: string) => `Вы проиграли $${amount}. (${reason || 'Вы сдались'})`,
  WON_ROUND_DEFAULT: (amount: number, reason: string) => `Вы выиграли $${amount}! (Противник ${reason || 'сдался'})`,
  WON_ROUND: (amount: number) => `Вы выиграли $${amount}!`,
  LOST_ROUND: (amount: number) => `Вы проиграли $${amount}.`,
  ROUND_TIE: "Ничья! Монеты не изменились.",
  GROUP_OWNER_BONUS_NOTIFICATION: (amount: number, player1: string, player2: string) => `Получен бонус ${amount} $GRPS, от @${player1} против @${player2}`,
  ROUND_PROCESSING_ERROR: 'Ошибка обработки раунда. Ставка может быть аннулирована.',
  OPPONENT_CANT_COVER_BET: "(Противник не смог покрыть ставку - выигрыш не перечислен)",
  BET_VOIDED_INSUFFICIENT_COINS: "(Ставка аннулирована - у вас было недостаточно монет)",
  GAME_OVER_INSUFFICIENT_FUNDS: (reason: string, balance: number) => `Игра окончена. ${reason} У вас ${balance} монет.`,
  NEXT_ROUND_READY: 'Следующий раунд. Сделайте свой выбор!',
  MATCHMAKING_FAILED_SYSTEM_ERROR: 'При подготовке игры произошла проблема. Пожалуйста, попробуйте позже.',
  MATCHMAKING_FAILED_INSUFFICIENT_COINS: (required: number, current: number) => `Вам нужно ${required} монет, чтобы начать матч. Ваш текущий баланс: ${current}.`,
  ALREADY_IN_QUEUE: 'Вы уже ищете матч.',
  ALREADY_IN_SESSION: 'Вы уже в активной игровой сессии.',
  MATCHMAKING_ERROR_SERVER: 'Ошибка сервера при запуске матча. Пожалуйста, попробуйте еще раз.',
  WAITING_FOR_OPPONENT: 'В очереди, ждем противника.',
  MATCHMAKING_ERROR_BOT_SERVER: 'Ошибка сервера при запуске матча с ботом. Пожалуйста, попробуйте еще раз.',
  CANNOT_CANCEL_IN_GAME: 'Вы уже в игре и не можете отменить поиск матча.',
  MATCHMAKING_CANCELLED: 'Вы были удалены из очереди подбора игроков.',
  NOT_IN_QUEUE: 'Вы в настоящее время не находитесь в очереди подбора игроков или уже были подобраны.',
  INVALID_CHOICE_DATA: 'Неверные данные выбора.',
  INVALID_REACTION_DATA: 'Неверные данные реакции.',
  SESSION_NOT_FOUND_OR_ENDED: 'Сессия не найдена или завершена.',
  NOT_IN_GAME_SESSION: 'Вы не в этой игровой сессии.',
  CHOICE_ALREADY_MADE: 'Вы уже сделали свой выбор в этом раунде.',
  INSUFFICIENT_COINS_FOR_ROUND_CHOICE: (required: number, current: number) => `Вам нужно ${required} монет, чтобы сделать выбор в этом раунде. Ваш баланс: ${current}.`,
  SERVER_ERROR_CHECKING_BALANCE: 'Ошибка сервера при проверке вашего баланса монет.',
  CRITICAL_OPPONENT_DATA_MISSING: 'Критическая ошибка сервера: данные противника отсутствуют. Сессия завершена.',
  CHOICE_REGISTERED_BOT_MOVING: 'Выбор зарегистрирован. Бот делает свой ход...',
  UNABLE_TO_COVER_BET: (username: string, amount: number) => `${username} не может покрыть ставку в ${amount} монет и проигрывает раунд. Вы выиграли!`,
  FORFEIT_BET_INSUFFICIENT_COINS: (amount: number) => `У вас недостаточно монет (${amount}), чтобы покрыть ставку, и вы проигрываете раунд.`,
  CHOICE_REGISTERED_WAITING_OPPONENT: 'Выбор зарегистрирован. Ожидание противника.',
  OPPONENT_MADE_CHOICE_YOUR_TURN: (username: string, timeout: number) => `${username} сделал свой выбор! У вас есть ${timeout}с.`,
  SERVER_ERROR_PROCESSING_CHOICE: 'Ошибка сервера при обработке вашего выбора.',
  SESSION_ID_REQUIRED_TO_END_GAME: 'Для завершения игры требуется идентификатор сессии.',
  GAME_ALREADY_ENDED: 'Игровая сессия не найдена или уже завершена.',
  GAME_ENDED_BY_PLAYER: (username: string) => `${username} завершил игру.`,
  SERVER_ERROR_ENDING_GAME: 'Ошибка сервера при завершении игры.',
  OPPONENT_DISCONNECTED: (username: string) => `${username || 'Противник'} отключился. Игра завершена.`,

  // Users Service Messages
  COULD_NOT_CREATE_USER: 'Не удалось создать пользователя.',
  USER_NOT_FOUND_USERNAME: (username: string) => `Пользователь с именем '${username}' не найден.`,
  USER_NOT_FOUND_ID: (id: string) => `Пользователь с ID '${id}' не найден.`,
  REFERRAL_CODE_EMPTY: 'Реферальный код для добавления не может быть пустым.',
  USER_NOT_FOUND_TELEGRAM_ID: (userId: string) => `Пользователь с telegramId '${userId}' не найден.`,
  AMOUNT_NON_NEGATIVE: 'Сумма должна быть неотрицательной.', // Generic for add/remove
  USER_INSUFFICIENT_COINS: (username: string, available: number, attempted: number) => `У пользователя '${username}' недостаточно монет. Доступно: ${available}, Попытка снять: ${attempted}.`,
  // USER_NOT_FOUND_DURING_COIN_REMOVAL: (username: string) => `Пользователь с именем '${username}' не найден при удалении монет.`, // Covered by USER_NOT_FOUND_USERNAME
  MATCH_ALREADY_RECORDED: (sessionId: string, username: string) => `Матч с sessionId '${sessionId}' уже записан для пользователя '${username}'.`,
  COULD_NOT_RECORD_MATCH: 'Не удалось записать матч.',
  WISHLIST_SUCCESS: (username?: string) => `⚔️ Был избран новый Титан
Ваша заявка одобрена, @${username}. Теперь вы входите в число первых 200 партнеров-Титанов.

Скоро вы получите ранний доступ к игре и начнете зарабатывать с каждой битвы, проводимой в вашей группе.
PvP-арена скоро откроется, и вы будете уведомлены, как только она будет запущена.

Готовьте свое сообщество — слава и золото ждут. 🏆💰`,

  REVSHARE_APPROVED: `✅ Партнерство по программе Rev-Share одобрено!

Отличные новости 🥳 ваш запрос на участие в программе rev-share одобрен!
Теперь вы официально являетесь партнером-Титаном в экосистеме RPS Titans💰

Вы получите все преимущества, перечисленные на нашей официальной странице партнеров, включая ранний доступ, rev-share и бонусы за запуск:

🌐 Партнеры (https://www.rpstitans.xyz/partners)`,
};
