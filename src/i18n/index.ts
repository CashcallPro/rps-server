import { messagesEn } from './en';
import { messagesRu } from './ru';
import { messagesTr } from './tr';
import { messagesFa } from './fa';

export const appMessages = {
  en: messagesEn,
  ru: messagesRu,
  tr: messagesTr,
  fa: messagesFa,
};

export const defaultMessages = messagesEn;

// Or a function to get messages based on a language code
export const getMessages = (lang: string) => appMessages[lang] || defaultMessages;
