export const messagesTr = {
  AMOUNT_MUST_BE_NUMBER: 'Tutar bir sayı olmalıdır',
  WELCOME_MESSAGE: `PRS Titans Online Çok Oyunculu Oyununa Hoş Geldiniz!

PRS Titans, TON blok zincirindeki ilk Win2Earn gerçek zamanlı çok oyunculu çevrimiçi oyundur.

Kazanırsınız -> paranızı alırsınız 🚀`,
  WISHLIST_BUTTON: '✅ Şimdi beyaz listeye alın!',
  JOIN_CHANNEL_BUTTON: '👋 Kanala Katıl',
  REFERRAL_BUTTON: '🎁 Yönlendirme',
  EARN_MORE_BUTTON: '💵 Daha Fazla Kazan!',
  RUSSIAN_BUTTON: '🇷🇺 Rusça',
  PERSIAN_BUTTON: '🇮🇷 Farsça',
  TURKISH_BUTTON: '🇹🇷 Türkçe',
  CANT_REFER_SELF: 'Kendinizi yönlendiremezsiniz',
  ALREADY_JOINED: "Zaten katıldınız!",
  NEW_REFERRAL: (username: string, bonus: number) => `Tebrikler! @${username} davetiyenizle katıldı, işte ${bonus} jeton.`,
  JOINED_WITH_REFERRAL: (refereeName: string, bonus: number) => `@${refereeName}'in yönlendirme kodunu kullanarak katıldınız, tebrikler ${bonus} jeton kazandınız.`,
  REFERRAL_LINK_MESSAGE: (userId: string | number) => `RPS Titans Yönlendirme Programına Katılın!

RPS Titans'ta nasıl çalıştığı aşağıda açıklanmıştır:

👥 Arkadaşlarınızı Telegram'da oyunu oynamaya davet edin
💰 Yönlendirdiğiniz her yeni kullanıcı için 20 jeton kazanırsınız
🎁 Arkadaşınız hoş geldin bonusu olarak 10 jeton alır
🔥 Lansman haftasında, en iyi yönlendirenler bonus ödüller ve beyaz liste önceliği kazanır

🔗 İşte yönlendirme bağlantınız: https://t.me/RPS_Titans_bot?start=${userId}`,
  ERROR_PROCESSING_REFERRAL_REQUEST: "Hata: Yönlendirme isteği işlenemedi.",
  REV_SHARE_INFO: `RPS Titans'ta Rev-Share nedir?

Rev-share, insanlar Telegram grubunuzda oynadığında oyunun gelirinden pay almanız anlamına gelir.

📌 İşte nasıl çalıştığı:

RPS Titans botunu grubunuza eklersiniz.

Oyuncular grubunuzda oyun oynadığında, bot küçük bir ücret toplar.

Bu ücretin bir yüzdesini otomatik olarak kazanırsınız.

Herkes oynadığında para kazanmak gibi! 🎯
Ekstra bir iş yapmanıza gerek yok. Sadece botu davet edin ve oyunlar başlasın.

🌐 Ortaklar (https://www.rpstitans.xyz/partners)

🚀 Grubunuzun etkinliğinden kazanmaya hazır mısınız? `,
  PARTNER_YES_BUTTON: 'Evet',
  PARTNER_NO_BUTTON: 'Hayır',
  REV_SHARE_REQUEST_PROCESSING: `Gelir paylaşımı başvurunuz inceleniyor.
Yoğun bir talep alıyoruz, bu yüzden lütfen sabırlı olun.

Onaylandığında size bildirilecektir. ⏳`,
  REV_SHARE_REQUEST_APPROVED: 'Gelir paylaşım programına katılma talebiniz zaten kabul edildi, bizi izlemeye devam edin.',
  PARTNER_INSTRUCTIONS: `Harika! 🎉 Bir gelir paylaşımı ortağı olmak için:

➕ Bu botu Telegram grubunuza ekleyin.

Bunu yaptığınızda, grubunuzu otomatik olarak algılayacak ve isteğinizi işleme koyacağız. Lütfen unutmayın: Gelir paylaşımı şu anda halka açık gruplar (bir Telegram @kullanıcıadı olanlar) için desteklenmektedir.

İsteğiniz incelendiğinde sizi burada bilgilendireceğiz. 🚀`,
  PARTNER_NO_MESSAGE: 'Eh, bazı kararlar cesaret ister 🍒',
  ERROR_TRY_AGAIN: 'Bir hata oluştu. Lütfen tekrar deneyin.',
  ERROR_COULD_NOT_PROCESS_REQUEST: "Hata: İstek işlenemedi.",
  BOT_ADDED_TO_GROUP_CONFIRMATION: (groupTitle: string) => `Harika haber! RPS Titans botu grubunuza başarıyla eklendi: '${groupTitle || 'Adsız Grup'}'.

Gelir paylaşımı talebiniz şimdi inceleniyor ve sonucu size burada bildireceğiz. Yoğun talep nedeniyle sabrınız için teşekkür ederiz.

RPS Titans ile ortak olduğunuz için teşekkürler! 💪`,

  // Game Gateway Messages
  LOST_ROUND_DEFAULT: (amount: number, reason: string) => `$${amount} kaybettiniz. (${reason || 'Siz temerrüde düştünüz'})`,
  WON_ROUND_DEFAULT: (amount: number, reason: string) => `$${amount} kazandınız! (Rakip ${reason || 'temerrüde düştü'})`,
  WON_ROUND: (amount: number) => `$${amount} kazandınız!`,
  LOST_ROUND: (amount: number) => `$${amount} kaybettiniz.`,
  ROUND_TIE: "Berabere! Jetonlarda değişiklik olmadı.",
  GROUP_OWNER_BONUS_NOTIFICATION: (amount: number, player1: string, player2: string) => `Bonus alındı ${amount} $GRPS, @${player1} vs @${player2}`,
  ROUND_PROCESSING_ERROR: 'Tur işleme hatası. Bahis geçersiz sayılabilir.',
  OPPONENT_CANT_COVER_BET: "(Rakip bahsi karşılayamadı - kazanç aktarılmadı)",
  BET_VOIDED_INSUFFICIENT_COINS: "(Bahis geçersiz kılındı - yeterli jetonunuz yoktu)",
  GAME_OVER_INSUFFICIENT_FUNDS: (reason: string, balance: number) => `Oyun bitti. ${reason} ${balance} jetonunuz var.`,
  NEXT_ROUND_READY: 'Sıradaki tur. Seçimini yap!',
  MATCHMAKING_FAILED_SYSTEM_ERROR: 'Oyununuz hazırlanırken bir sorun oluştu. Lütfen daha sonra tekrar deneyin.',
  MATCHMAKING_FAILED_INSUFFICIENT_COINS: (required: number, current: number) => `Bir maça başlamak için ${required} jetona ihtiyacınız var. Mevcut bakiyeniz ${current}.`,
  ALREADY_IN_QUEUE: 'Zaten bir maç arıyorsunuz.',
  ALREADY_IN_SESSION: 'Zaten aktif bir oyun oturumundasınız.',
  MATCHMAKING_ERROR_SERVER: 'Maç başlatılırken sunucu hatası. Lütfen tekrar deneyin.',
  WAITING_FOR_OPPONENT: 'Sırada, bir rakip bekleniyor.',
  MATCHMAKING_ERROR_BOT_SERVER: 'Bot maçı başlatılırken sunucu hatası. Lütfen tekrar deneyin.',
  CANNOT_CANCEL_IN_GAME: 'Zaten bir oyundasınız ve eşleştirmeyi iptal edemezsiniz.',
  MATCHMAKING_CANCELLED: 'Eşleştirme kuyruğundan çıkarıldınız.',
  NOT_IN_QUEUE: 'Şu anda eşleştirme kuyruğunda değilsiniz veya zaten eşleştirildiniz.',
  INVALID_CHOICE_DATA: 'Geçersiz seçim verisi.',
  INVALID_REACTION_DATA: 'Geçersiz reaksiyon verisi.',
  SESSION_NOT_FOUND_OR_ENDED: 'Oturum bulunamadı veya sona erdi.',
  NOT_IN_GAME_SESSION: 'Bu oyun oturumunda değilsiniz.',
  CHOICE_ALREADY_MADE: 'Bu tur için seçiminizi zaten yaptınız.',
  INSUFFICIENT_COINS_FOR_ROUND_CHOICE: (required: number, current: number) => `Bu tur için bir seçim yapmak için ${required} jetona ihtiyacınız var. Bakiyeniz: ${current}.`,
  SERVER_ERROR_CHECKING_BALANCE: 'Jeton bakiyeniz kontrol edilirken sunucu hatası.',
  CRITICAL_OPPONENT_DATA_MISSING: 'Kritik sunucu hatası: Rakip verileri eksik. Oturum sona erdi.',
  CHOICE_REGISTERED_BOT_MOVING: 'Seçim kaydedildi. Bot hamlesini yapıyor...',
  UNABLE_TO_COVER_BET: (username: string, amount: number) => `${username}, ${amount} jetonluk bahsi karşılayamıyor ve turu kaybediyor. Siz kazandınız!`,
  FORFEIT_BET_INSUFFICIENT_COINS: (amount: number) => `Bahsi karşılamak için yeterli jetonunuz (${amount}) yok ve turu kaybediyorsunuz.`,
  CHOICE_REGISTERED_WAITING_OPPONENT: 'Seçim kaydedildi. Rakip bekleniyor.',
  OPPONENT_MADE_CHOICE_YOUR_TURN: (username: string, timeout: number) => `${username} seçimini yaptı! ${timeout} saniyeniz var.`,
  SERVER_ERROR_PROCESSING_CHOICE: 'Seçiminiz işlenirken sunucu hatası.',
  SESSION_ID_REQUIRED_TO_END_GAME: 'Oyunu bitirmek için Oturum Kimliği gereklidir.',
  GAME_ALREADY_ENDED: 'Oyun oturumu bulunamadı veya zaten sona erdi.',
  GAME_ENDED_BY_PLAYER: (username: string) => `${username} oyunu bitirdi.`,
  SERVER_ERROR_ENDING_GAME: 'Oyun bitirilirken sunucu hatası.',
  OPPONENT_DISCONNECTED: (username: string) => `${username || 'Rakip'} bağlantısı kesildi. Oyun sona erdi.`,

  // Users Service Messages
  COULD_NOT_CREATE_USER: 'Kullanıcı oluşturulamadı.',
  USER_NOT_FOUND_USERNAME: (username: string) => `'${username}' kullanıcı adlı kullanıcı bulunamadı.`,
  USER_NOT_FOUND_ID: (id: string) => `'${id}' kimlikli kullanıcı bulunamadı.`,
  REFERRAL_CODE_EMPTY: 'Eklenecek yönlendirme kodu boş olamaz.',
  USER_NOT_FOUND_TELEGRAM_ID: (userId: string) => `'${userId}' telegramId'li kullanıcı bulunamadı.`,
  AMOUNT_NON_NEGATIVE: 'Tutar negatif olmamalıdır.', // Generic for add/remove
  USER_INSUFFICIENT_COINS: (username: string, available: number, attempted: number) => `'${username}' kullanıcısının yeterli jetonu yok. Mevcut: ${available}, Çekilmeye çalışılan: ${attempted}.`,
  // USER_NOT_FOUND_DURING_COIN_REMOVAL: (username: string) => `Kullanıcı '${username}' jeton çıkarma sırasında bulunamadı.`, // Covered by USER_NOT_FOUND_USERNAME
  MATCH_ALREADY_RECORDED: (sessionId: string, username: string) => `'${sessionId}' oturum kimliğine sahip maç, '${username}' kullanıcısı için zaten kaydedilmiş.`,
  COULD_NOT_RECORD_MATCH: 'Maç kaydedilemedi.',
  WISHLIST_SUCCESS: (username?: string) => `⚔️ Yeni Bir Titan Seçildi
Başvurunuz onaylandı @${username}. Artık ilk 200 Titan ortağı arasındasınız.

Yakında oyuna erken erişim kazanacak ve grubunuzda düzenlenen her savaştan kazanmaya başlayacaksınız.
PvP arenası yakında açılıyor ve canlı olduğunda size bildirilecek.

Topluluğunuzu hazırlayın - zafer ve altın sizi bekliyor. 🏆💰`,

  REVSHARE_APPROVED: `✅ Titan Rev-Share Ortaklığı Onaylandı!

Harika haber 🥳 gelir paylaşımı talebiniz onaylandı!
Artık RPS Titans ekosisteminde resmi olarak bir Titan Ortağısınız💰

Resmi ortak sayfamızda listelenen erken erişim, gelir paylaşımı ve lansman bonusları dahil tüm avantajlardan yararlanacaksınız:

🌐 Ortaklar (https://www.rpstitans.xyz/partners)`,
};
