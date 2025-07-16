export const messagesEn = {
  AMOUNT_MUST_BE_NUMBER: 'Amount must be a number',
  WELCOME_MESSAGE: `Welcome to PRS Titans Online Multiplayer Game!

PRS Titans is the first Win2Earn real-time multiplayer online game on TON blockchain

You win -> take your cash 🚀`,
  WISHLIST_BUTTON: '✅ Whitelist now!',
  JOIN_CHANNEL_BUTTON: '👋 Join Channel',
  COMMUNITY_BUTTON: '📢 Join Community',
  REFERRAL_BUTTON: '🎁 Referral',
  EARN_MORE_BUTTON: '💵 Earn More!',
  CANT_REFER_SELF: 'You can\'t refer yourself',
  ALREADY_JOINED: "You have already joined!",
  NEW_REFERRAL: (username: string, bonus: number) => `Congrats! @${username} has joined from your invitation, here's ${bonus} coins.`,
  JOINED_WITH_REFERRAL: (refereeName: string, bonus: number) => `You have joined using @${refereeName}'s referral code, congratulations you've received ${bonus} coins.`,
  REFERRAL_LINK_MESSAGE: (userId: string | number) => `Join the RPS Titans Referral Program!

Here’s how it works in RPS Titans:

👥 Invite your friends to play the game on Telegram
💰 You get 20 coins for every new user you refer
🎁 Your friend gets 10 coins as a welcome bonus
🔥 During launch week, top referrers get bonus rewards & whitelist priority

🔗 Here's your referral link: https://t.me/RPS_Titans_bot?start=${userId}`,
  ERROR_PROCESSING_REFERRAL_REQUEST: "Error: Could not process referral request.",
  REV_SHARE_INFO: `What is Rev-Share in RPS Titans?

Rev-share means you earn a share of the game’s revenue when people play in your Telegram group.

📌 Here’s how it works:

You add the RPS Titans bot to your group.

When players play games in your group, the bot collects a small fee.

You earn a percentage of that fee — automatically.

It’s like getting paid every time someone plays! 🎯
No extra work needed. Just invite the bot and let the games begin.

🌐 Partners (https://www.rpstitans.xyz/partners)

🚀 Ready to earn from your group’s activity? `,
  PARTNER_YES_BUTTON: 'Yes',
  PARTNER_NO_BUTTON: 'No',
  REV_SHARE_REQUEST_PROCESSING: `Your rev-share application is being reviewed.
We’re receiving a high volume of requests, so please be patient.

You’ll be notified as soon as it’s approved. ⏳`,
  REV_SHARE_REQUEST_APPROVED: 'Your request to join the revenue share program is already accepted, stay tuned.',
  PARTNER_INSTRUCTIONS: `Awesome! 🎉 To become a rev-share partner:

➕ Add this bot to your Telegram group.

Once you do that, we’ll automatically detect your group and process your request. Please note: Revenue share is currently supported for public groups (those with a Telegram @username).

We’ll notify you here once your request is reviewed. 🚀`,
  PARTNER_NO_MESSAGE: 'Well, some decisions needs balls 🍒',
  ERROR_TRY_AGAIN: 'An error occurred. Please try again.',
  ERROR_COULD_NOT_PROCESS_REQUEST: "Error: Could not process request.",
  BOT_ADDED_TO_GROUP_CONFIRMATION: (groupTitle: string) => `Great news! RPS Titans bot has been successfully added to your group: '${groupTitle || 'Unnamed Group'}'.

Your rev-share request is now under review, and we'll inform you of the outcome here. We appreciate your patience as we're experiencing a high volume of requests.

Thanks for partnering with RPS Titans! 💪`,

  // Game Gateway Messages
  LOST_ROUND_DEFAULT: (amount: number, reason: string) => `You lost $${amount}. (${reason || 'You defaulted'})`,
  WON_ROUND_DEFAULT: (amount: number, reason: string) => `You won $${amount}! (Opponent ${reason || 'defaulted'})`,
  WON_ROUND: (amount: number) => `You won $${amount}!`,
  LOST_ROUND: (amount: number) => `You lost $${amount}.`,
  ROUND_TIE: "It's a tie! No coins have been changed.",
  GROUP_OWNER_BONUS_NOTIFICATION: (amount: number, player1: string, player2: string) => `Bonus received ${amount} $GRPS, from @${player1} vs @${player2}`,
  ROUND_PROCESSING_ERROR: 'Round processing error. Bet may be voided.',
  OPPONENT_CANT_COVER_BET: "(Opponent couldn't cover bet - no winnings transferred)",
  BET_VOIDED_INSUFFICIENT_COINS: "(Bet voided - you did not have enough coins)",
  GAME_OVER_INSUFFICIENT_FUNDS: (reason: string, balance: number) => `Game over. ${reason} You have ${balance} coins.`,
  NEXT_ROUND_READY: 'Next round. Make your choice!',
  MATCHMAKING_FAILED_SYSTEM_ERROR: 'There was a problem preparing your game. Please try again later.',
  MATCHMAKING_FAILED_INSUFFICIENT_COINS: (required: number, current: number) => `You need ${required} coins to start a match. Your current balance is ${current}.`,
  ALREADY_IN_QUEUE: 'You are already searching for a match.',
  ALREADY_IN_SESSION: 'You are already in an active game session.',
  MATCHMAKING_ERROR_SERVER: 'Server error starting match. Please try again.',
  WAITING_FOR_OPPONENT: 'In queue, waiting for an opponent.',
  MATCHMAKING_ERROR_BOT_SERVER: 'Server error starting bot match. Please try again.',
  CANNOT_CANCEL_IN_GAME: 'You are already in a game and cannot cancel matchmaking.',
  MATCHMAKING_CANCELLED: 'You have been removed from the matchmaking queue.',
  NOT_IN_QUEUE: 'You are not currently in the matchmaking queue or have already been matched.',
  INVALID_CHOICE_DATA: 'Invalid choice data.',
  SESSION_NOT_FOUND_OR_ENDED: 'Session not found or ended.',
  NOT_IN_GAME_SESSION: 'You are not in this game session.',
  CHOICE_ALREADY_MADE: 'You have already made your choice for this round.',
  INSUFFICIENT_COINS_FOR_ROUND_CHOICE: (required: number, current: number) => `You need ${required} coins to make a choice for this round. Your balance: ${current}.`,
  SERVER_ERROR_CHECKING_BALANCE: 'Server error checking your coin balance.',
  CRITICAL_OPPONENT_DATA_MISSING: 'Critical server error: Opponent data missing. Session ended.',
  CHOICE_REGISTERED_BOT_MOVING: 'Choice registered. Bot is making its move...',
  UNABLE_TO_COVER_BET: (username: string, amount: number) => `${username} cannot cover the bet of ${amount} coins and forfeits the round. You win!`,
  FORFEIT_BET_INSUFFICIENT_COINS: (amount: number) => `You do not have enough coins (${amount}) to cover the bet and forfeit the round.`,
  CHOICE_REGISTERED_WAITING_OPPONENT: 'Choice registered. Waiting for opponent.',
  OPPONENT_MADE_CHOICE_YOUR_TURN: (username: string, timeout: number) => `${username} made their choice! You have ${timeout}s.`,
  SERVER_ERROR_PROCESSING_CHOICE: 'Server error processing your choice.',
  SESSION_ID_REQUIRED_TO_END_GAME: 'Session ID is required to end the game.',
  GAME_ALREADY_ENDED: 'Game session not found or already ended.',
  GAME_ENDED_BY_PLAYER: (username: string) => `${username} has ended the game.`,
  SERVER_ERROR_ENDING_GAME: 'Server error ending the game.',
  OPPONENT_DISCONNECTED: (username: string) => `${username || 'Opponent'} has disconnected. The game has ended.`,

  // Users Service Messages
  COULD_NOT_CREATE_USER: 'Could not create user.',
  USER_NOT_FOUND_USERNAME: (username: string) => `User with username '${username}' not found.`,
  USER_NOT_FOUND_ID: (id: string) => `User with ID '${id}' not found.`,
  REFERRAL_CODE_EMPTY: 'Referral code to add cannot be empty.',
  USER_NOT_FOUND_TELEGRAM_ID: (userId: string) => `User with telegramId '${userId}' not found.`,
  AMOUNT_NON_NEGATIVE: 'Amount must be non-negative.', // Generic for add/remove
  USER_INSUFFICIENT_COINS: (username: string, available: number, attempted: number) => `User '${username}' has insufficient coins. Available: ${available}, Tried to remove: ${attempted}.`,
  // USER_NOT_FOUND_DURING_COIN_REMOVAL: (username: string) => `User with username '${username}' not found during coin removal.`, // Covered by USER_NOT_FOUND_USERNAME
  MATCH_ALREADY_RECORDED: (sessionId: string, username: string) => `Match with sessionId '${sessionId}' already recorded for user '${username}'.`,
  COULD_NOT_RECORD_MATCH: 'Could not record the match.',
  WISHLIST_SUCCESS: (username?: string) => `⚔️ A New Titan Has Been Chosen
Your application is approved @${username}. You now stand among the first 200 Titan partners.

You’ll soon gain early access to the game, and start earning from every battle hosted in your group.
The PvP arena opens soon, and you’ll be notified the moment it’s live.

Prepare your community — glory and gold await. 🏆💰`,

  REVSHARE_APPROVED: `✅ Titan Rev-Share Partnership Approved!

Great news 🥳 your rev-share request has been approved!
You’re now officially a Titan Partner in the RPS Titans ecosystem💰

You’ll receive all the benefits listed on our official partner page, including early access, rev-share, and launch bonuses:

🌐 Partners (https://www.rpstitans.xyz/partners)`,


};