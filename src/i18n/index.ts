import { messagesEn } from './en';

export const appMessages = {
  en: messagesEn,
  // In the future, other languages can be added here:
  // es: messagesEs,
};

export const defaultMessages = messagesEn;

// Or a function to get messages based on a language code
// export const getMessages = (lang: string) => appMessages[lang] || defaultMessages;
