export const messagesFa = {
  AMOUNT_MUST_BE_NUMBER: 'مقدار باید یک عدد باشد',
  WELCOME_MESSAGE: `به بازی چندنفره آنلاین PRS Titans خوش آمدید!

PRS Titans اولین بازی چندنفره آنلاین و بی‌درنگ در بلاک‌چین TON با مدل Win2Earn است.

شما برنده می‌شوید -> پول خود را برمی‌دارید 🚀`,
  WISHLIST_BUTTON: '✅ اکنون در لیست سفید قرار بگیرید!',
  JOIN_CHANNEL_BUTTON: '👋 به کانال بپیوندید',
  REFERRAL_BUTTON: '🎁 ارجاع',
  EARN_MORE_BUTTON: '💵 بیشتر کسب کنید!',
  RUSSIAN_BUTTON: '🇷🇺 روسی',
  PERSIAN_BUTTON: '🇮🇷 فارسی',
  TURKISH_BUTTON: '🇹🇷 ترکی',
  CANT_REFER_SELF: 'شما نمی‌توانید خودتان را ارجاع دهید',
  ALREADY_JOINED: "شما قبلاً پیوسته‌اید!",
  NEW_REFERRAL: (username: string, bonus: number) => `تبریک! @${username} از طریق دعوت شما پیوسته است، این هم ${bonus} سکه.`,
  JOINED_WITH_REFERRAL: (refereeName: string, bonus: number) => `شما با استفاده از کد ارجاع @${refereeName} پیوسته‌اید، تبریک می‌گوییم، ${bonus} سکه دریافت کردید.`,
  REFERRAL_LINK_MESSAGE: (userId: string | number) => `به برنامه ارجاع RPS Titans بپیوندید!

در RPS Titans این‌گونه کار می‌کند:

👥 دوستان خود را برای بازی در تلگرام دعوت کنید
💰 به ازای هر کاربر جدیدی که ارجاع می‌دهید، 20 سکه دریافت می‌کنید
🎁 دوست شما به عنوان پاداش خوشامدگویی 10 سکه دریافت می‌کند
🔥 در هفته راه‌اندازی، برترین ارجاع‌دهندگان پاداش‌های اضافی و اولویت در لیست سفید دریافت می‌کنند

🔗 این لینک ارجاع شماست: https://t.me/RPS_Titans_bot?start=${userId}`,
  ERROR_PROCESSING_REFERRAL_REQUEST: "خطا: درخواست ارجاع پردازش نشد.",
  REV_SHARE_INFO: `Rev-Share در RPS Titans چیست؟

Rev-share به این معنی است که شما از درآمد بازی سهمی کسب می‌کنید وقتی افراد در گروه تلگرام شما بازی می‌کنند.

📌 این‌گونه کار می‌کند:

شما ربات RPS Titans را به گروه خود اضافه می‌کنید.

وقتی بازیکنان در گروه شما بازی می‌کنند، ربات هزینه کمی را جمع‌آوری می‌کند.

شما درصدی از آن هزینه را به صورت خودکار کسب می‌کنید.

مثل این است که هر بار کسی بازی می‌کند، پول دریافت کنید! 🎯
نیازی به کار اضافی نیست. فقط ربات را دعوت کنید و بگذارید بازی‌ها شروع شوند.

🌐 شرکا (https://www.rpstitans.xyz/partners)

🚀 آماده‌اید از فعالیت گروه خود کسب درآمد کنید؟ `,
  PARTNER_YES_BUTTON: 'بله',
  PARTNER_NO_BUTTON: 'خیر',
  REV_SHARE_REQUEST_PROCESSING: `درخواست شما برای اشتراک درآمد در حال بررسی است.
ما حجم بالایی از درخواست‌ها را دریافت می‌کنیم، بنابراین لطفاً صبور باشید.

به محض تأیید به شما اطلاع داده خواهد شد. ⏳`,
  REV_SHARE_REQUEST_APPROVED: 'درخواست شما برای پیوستن به برنامه تقسیم درآمد قبلاً پذیرفته شده است، منتظر بمانید.',
  PARTNER_INSTRUCTIONS: `عالی! 🎉 برای تبدیل شدن به یک شریک اشتراک درآمد:

➕ این ربات را به گروه تلگرام خود اضافه کنید.

پس از انجام این کار، ما به طور خودکار گروه شما را شناسایی کرده و درخواست شما را پردازش خواهیم کرد. لطفاً توجه داشته باشید: اشتراک درآمد در حال حاضر برای گروه‌های عمومی (آنهایی که نام کاربری تلگرام @ دارند) پشتیبانی می‌شود.

پس از بررسی درخواست شما، در اینجا به شما اطلاع خواهim داد. 🚀`,
  PARTNER_NO_MESSAGE: 'خب، بعضی تصمیمات جرات می‌خواهد 🍒',
  ERROR_TRY_AGAIN: 'خطایی روی داد. لطفاً دوباره تلاش کنید.',
  ERROR_COULD_NOT_PROCESS_REQUEST: "خطا: درخواست پردازش نشد.",
  BOT_ADDED_TO_GROUP_CONFIRMATION: (groupTitle: string) => `خبر عالی! ربات RPS Titans با موفقیت به گروه شما اضافه شد: '${groupTitle || 'گروه بی‌نام'}'.

درخواست شما برای اشتراک درآمد اکنون در حال بررسی است و ما نتیجه را در اینجا به شما اطلاع خواهیم داد. ما از صبر شما قدردانی می‌کنیم زیرا حجم بالایی از درخواست‌ها را تجربه می‌کنیم.

از اینکه با RPS Titans شریک شدید متشکریم! 💪`,

  // Game Gateway Messages
  LOST_ROUND_DEFAULT: (amount: number, reason: string) => `شما ${amount}$ باختید. (${reason || 'شما انصراف دادید'})`,
  WON_ROUND_DEFAULT: (amount: number, reason: string) => `شما ${amount}$ بردید! (حریف ${reason || 'انصراف داد'})`,
  WON_ROUND: (amount: number) => `شما ${amount}$ بردید!`,
  LOST_ROUND: (amount: number) => `شما ${amount}$ باختید.`,
  ROUND_TIE: "مساوی شد! سکه‌ها تغییری نکردند.",
  GROUP_OWNER_BONUS_NOTIFICATION: (amount: number, player1: string, player2: string) => `پاداش دریافت شد ${amount} $GRPS، از @${player1} در مقابل @${player2}`,
  ROUND_PROCESSING_ERROR: 'خطای پردازش دور. شرط ممکن است باطل شود.',
  OPPONENT_CANT_COVER_BET: "(حریف نتوانست شرط را پوشش دهد - هیچ برنده‌ای منتقل نشد)",
  BET_VOIDED_INSUFFICIENT_COINS: "(شرط باطل شد - شما سکه کافی نداشتید)",
  GAME_OVER_INSUFFICIENT_FUNDS: (reason: string, balance: number) => `بازی تمام شد. ${reason} شما ${balance} سکه دارید.`,
  NEXT_ROUND_READY: 'دور بعدی. انتخاب خود را انجام دهید!',
  MATCHMAKING_FAILED_SYSTEM_ERROR: 'در آماده‌سازی بازی شما مشکلی پیش آمد. لطفاً بعداً دوباره تلاش کنید.',
  MATCHMAKING_FAILED_INSUFFICIENT_COINS: (required: number, current: number) => `برای شروع یک مسابقه به ${required} سکه نیاز دارید. موجودی فعلی شما ${current} است.`,
  ALREADY_IN_QUEUE: 'شما در حال حاضر در حال جستجوی یک مسابقه هستید.',
  ALREADY_IN_SESSION: 'شما در حال حاضر در یک جلسه بازی فعال هستید.',
  MATCHMAKING_ERROR_SERVER: 'خطای سرور در شروع مسابقه. لطفاً دوباره تلاش کنید.',
  WAITING_FOR_OPPONENT: 'در صف، منتظر حریف.',
  MATCHMAKING_ERROR_BOT_SERVER: 'خطای سرور در شروع مسابقه با ربات. لطفاً دوباره تلاش کنید.',
  CANNOT_CANCEL_IN_GAME: 'شما در حال حاضر در یک بازی هستید و نمی‌توانید خواستگاری را لغو کنید.',
  MATCHMAKING_CANCELLED: 'شما از صف خواستگاری حذف شده‌اید.',
  NOT_IN_QUEUE: 'شما در حال حاضر در صف خواستگاری نیستید یا قبلاً همسان شده‌اید.',
  INVALID_CHOICE_DATA: 'داده‌های انتخاب نامعتبر است.',
  INVALID_REACTION_DATA: 'داده‌های واکنش نامعتبر است.',
  SESSION_NOT_FOUND_OR_ENDED: 'جلسه یافت نشد یا به پایان رسید.',
  NOT_IN_GAME_SESSION: 'شما در این جلسه بازی نیستید.',
  CHOICE_ALREADY_MADE: 'شما قبلاً انتخاب خود را برای این دور انجام داده‌اید.',
  INSUFFICIENT_COINS_FOR_ROUND_CHOICE: (required: number, current: number) => `برای انتخاب در این دور به ${required} سکه نیاز دارید. موجودی شما: ${current}.`,
  SERVER_ERROR_CHECKING_BALANCE: 'خطای سرور در بررسی موجودی سکه شما.',
  CRITICAL_OPPONENT_DATA_MISSING: 'خطای بحرانی سرور: داده‌های حریف موجود نیست. جلسه به پایان رسید.',
  CHOICE_REGISTERED_BOT_MOVING: 'انتخاب ثبت شد. ربات در حال حرکت است...',
  UNABLE_TO_COVER_BET: (username: string, amount: number) => `${username} نمی‌تواند شرط ${amount} سکه را پوشش دهد و دور را واگذار می‌کند. شما برنده شدید!`,
  FORFEIT_BET_INSUFFICIENT_COINS: (amount: number) => `شما سکه کافی (${amount}) برای پوشش شرط ندارید و دور را واگذار می‌کنید.`,
  CHOICE_REGISTERED_WAITING_OPPONENT: 'انتخاب ثبت شد. منتظر حریف.',
  OPPONENT_MADE_CHOICE_YOUR_TURN: (username: string, timeout: number) => `${username} انتخاب خود را انجام داد! شما ${timeout} ثانیه فرصت دارید.`,
  SERVER_ERROR_PROCESSING_CHOICE: 'خطای سرور در پردازش انتخاب شما.',
  SESSION_ID_REQUIRED_TO_END_GAME: 'برای پایان دادن به بازی، شناسه جلسه مورد نیاز است.',
  GAME_ALREADY_ENDED: 'جلسه بازی یافت نشد یا قبلاً به پایان رسیده است.',
  GAME_ENDED_BY_PLAYER: (username: string) => `${username} بازی را به پایان رساند.`,
  SERVER_ERROR_ENDING_GAME: 'خطای سرور در پایان دادن به بازی.',
  OPPONENT_DISCONNECTED: (username: string) => `${username || 'حریف'} قطع شد. بازی به پایان رسید.`,

  // Users Service Messages
  COULD_NOT_CREATE_USER: 'کاربر ایجاد نشد.',
  USER_NOT_FOUND_USERNAME: (username: string) => `کاربری با نام کاربری '${username}' یافت نشد.`,
  USER_NOT_FOUND_ID: (id: string) => `کاربری با شناسه '${id}' یافت نشد.`,
  REFERRAL_CODE_EMPTY: 'کد ارجاع برای افزودن نمی‌تواند خالی باشد.',
  USER_NOT_FOUND_TELEGRAM_ID: (userId: string) => `کاربری با شناسه تلگرام '${userId}' یافت نشد.`,
  AMOUNT_NON_NEGATIVE: 'مقدار باید غیرمنفی باشد.', // Generic for add/remove
  USER_INSUFFICIENT_COINS: (username: string, available: number, attempted: number) => `کاربر '${username}' سکه کافی ندارد. موجود: ${available}, تلاش برای برداشت: ${attempted}.`,
  // USER_NOT_FOUND_DURING_COIN_REMOVAL: (username: string) => `کاربر با نام کاربری '${username}' هنگام حذف سکه یافت نشد.`, // Covered by USER_NOT_FOUND_USERNAME
  MATCH_ALREADY_RECORDED: (sessionId: string, username: string) => `مسابقه با شناسه جلسه '${sessionId}' قبلاً برای کاربر '${username}' ثبت شده است.`,
  COULD_NOT_RECORD_MATCH: 'مسابقه ثبت نشد.',
  WISHLIST_SUCCESS: (username?: string) => `⚔️ یک تایتان جدید انتخاب شد
درخواست شما تأیید شد @${username}. شما اکنون در میان 200 شریک اول تایتان قرار دارید.

به زودی به بازی دسترسی پیدا خواهید کرد و از هر نبردی که در گروه شما برگزار می‌شود، درآمد کسب خواهید کرد.
آرنای PvP به زودی باز می‌شود و به محض فعال شدن به شما اطلاع داده خواهد شد.

جامعه خود را آماده کنید - شکوه و طلا در انتظار است. 🏆💰`,

  REVSHARE_APPROVED: `✅ مشارکت در تقسیم درآمد تایتان تأیید شد!

خبر عالی 🥳 درخواست شما برای اشتراک درآمد تأیید شد!
شما اکنون به طور رسمی یک شریک تایتان در اکوسیستم RPS Titans هستید💰

شما تمام مزایای ذکر شده در صفحه رسمی شرکای ما، از جمله دسترسی زودهنگام، اشتراک درآمد و پاداش‌های راه‌اندازی را دریافت خواهید کرد:

🌐 شرکا (https://www.rpstitans.xyz/partners)`,
};
