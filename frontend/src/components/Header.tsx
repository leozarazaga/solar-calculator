import { translations, type Language } from '../i18n/translations'

interface HeaderProps {
  language: Language
  onLanguageChange: (language: Language) => void
}

const LANGUAGES: Language[] = ['sv', 'en']

export function Header({ language, onLanguageChange }: HeaderProps) {
  const t = translations[language]

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-4 sm:justify-start">
          <img
            src="/1KOMMA5.png"
            alt={t.app.brand}
            className="h-9 w-auto shrink-0 object-contain sm:h-10"
          />

          {/* Mobile language switcher stays on the top utility row */}
          <LanguageSwitcher
            language={language}
            onLanguageChange={onLanguageChange}
            className="sm:hidden"
          />

          {/* Desktop title & subtitle beside logo with subtle divider */}
          <div className="hidden border-l border-slate-200 pl-4 sm:block">
            <h1 className="text-lg font-semibold leading-snug text-slate-900 lg:text-xl">
              {t.app.title}
            </h1>
            <p className="mt-0.5 text-sm text-slate-500">{t.app.subtitle}</p>
          </div>
        </div>

        {/* Mobile title & subtitle: full width, never truncated */}
        <div className="border-t border-slate-100 pt-2.5 sm:hidden">
          <h1 className="text-base font-semibold leading-snug text-slate-900">
            {t.app.title}
          </h1>
          <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
            {t.app.subtitle}
          </p>
        </div>

        {/* Desktop language switcher */}
        <LanguageSwitcher
          language={language}
          onLanguageChange={onLanguageChange}
          className="hidden sm:flex"
        />
      </div>
    </header>
  )
}

function LanguageSwitcher({
  language,
  onLanguageChange,
  className = '',
}: HeaderProps & { className?: string }) {
  const t = translations[language]

  return (
    <div
      role="group"
      aria-label={t.app.languageToggleLabel}
      className={`flex shrink-0 rounded-lg border border-slate-200 bg-slate-100 p-1 ${className}`}
    >
      {LANGUAGES.map((code) => {
        const active = code === language
        return (
          <button
            key={code}
            type="button"
            lang={code}
            aria-pressed={active}
            onClick={() => onLanguageChange(code)}
            className={`min-w-11 cursor-pointer rounded-md px-3 py-1.5 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-aubergine-500 ${
              active
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            {/* Accessible name "SV Svenska" starts with the visible label (WCAG 2.5.3);
                the endonym is read in its own language because of lang={code} */}
            {t.app.languageShort[code]}
            <span className="sr-only"> {translations[code].app.languageName}</span>
          </button>
        )
      })}
    </div>
  )
}