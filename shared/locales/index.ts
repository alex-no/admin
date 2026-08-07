import uk from './uk.json'
import en from './en.json'
import ru from './ru.json'

export const messages = {
  uk,
  en,
  ru,
}

export const availableLocales = [
  { code: 'uk', name: 'Українська' },
  { code: 'en', name: 'English' },
  { code: 'ru', name: 'Русский' },
]

export type LocaleCode = 'uk' | 'en' | 'ru'
