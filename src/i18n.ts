import type { Lang } from './portfolio/data'
import { areas } from './world/areas'

const ui = {
  en: {
    tagline: 'Reality is just an implementation detail.',
    begin: 'Enter',
    continue: 'Continue',
    newGame: 'New game',
    portfolio: 'Portfolio',
    settings: 'Settings',
    resume: 'Resume',
    hint: 'Hint',
    noHint: 'Nothing to say here. Look around.',
    resetPuzzle: 'Reset puzzle',
    mainMenu: 'Main menu',
    paused: 'Paused',
    close: 'Close',
    back: 'Back',
    sensitivity: 'Look sensitivity',
    invertY: 'Invert vertical look',
    reducedMotion: 'Reduced motion',
    quality: 'Rendering quality',
    low: 'low',
    medium: 'medium',
    high: 'high',
    joystick: 'Joystick size',
    subtitles: 'Subtitles for sounds',
    volume: 'Volume',
    music: 'Music',
    mute: 'Sound off',
    installIos:
      'Plays best as an app: tap Share, then “Add to Home Screen”. It opens full-screen from there.',
    language: 'Language',
    theme: 'Interface theme',
    light: 'light',
    dark: 'dark',
    grab: 'take',
    drop: 'place',
    blocked: 'no room',
    interact: 'Use',
    jump: 'Jump',
    pause: 'Pause',
    controlsDesktop:
      'WASD move · mouse or arrow keys look · Q close eyes · E or click use · Space jump · M sound · Esc pause',
    controlsTouch: 'left thumb move · right thumb look · hold the eye to close your eyes',
    closeEyes: 'Close eyes',
    eyesClosed: 'eyes closed',
    eyesToggle: 'Close eyes by toggling instead of holding',
    rotate: 'Turn your device sideways for the best view.',
    corruptSave: 'Saved progress could not be read and was reset.',
    confirmNew: 'Start over? Progress is erased.',
    yes: 'Yes, start over',
    no: 'Keep my progress',
    progress: 'fragments',
    skip: 'Skip to portfolio',
    clickToLook: 'Click to look around',
  },
  cs: {
    tagline: 'Realita je jen implementační detail.',
    begin: 'Vstoupit',
    continue: 'Pokračovat',
    newGame: 'Nová hra',
    portfolio: 'Portfolio',
    settings: 'Nastavení',
    resume: 'Pokračovat',
    hint: 'Nápověda',
    noHint: 'Tady není co říct. Rozhlédni se.',
    resetPuzzle: 'Resetovat hádanku',
    mainMenu: 'Hlavní menu',
    paused: 'Pauza',
    close: 'Zavřít',
    back: 'Zpět',
    sensitivity: 'Citlivost rozhlížení',
    invertY: 'Obrátit svislé rozhlížení',
    reducedMotion: 'Omezit pohyb',
    quality: 'Kvalita vykreslování',
    low: 'nízká',
    medium: 'střední',
    high: 'vysoká',
    joystick: 'Velikost joysticku',
    subtitles: 'Titulky ke zvukům',
    volume: 'Hlasitost',
    music: 'Hudba',
    mute: 'Vypnout zvuk',
    installIos:
      'Nejlíp se hraje jako aplikace: klepni na Sdílet a pak „Přidat na plochu“. Odtud se otevře přes celou obrazovku.',
    language: 'Jazyk',
    theme: 'Motiv rozhraní',
    light: 'světlý',
    dark: 'tmavý',
    grab: 'vzít',
    drop: 'položit',
    blocked: 'není místo',
    interact: 'Použít',
    jump: 'Skok',
    pause: 'Pauza',
    controlsDesktop:
      'WASD pohyb · myš nebo šipky rozhlížení · Q zavřít oči · E nebo klik použít · mezerník skok · M zvuk · Esc pauza',
    controlsTouch: 'levý palec pohyb · pravý palec rozhlížení · podrž oko a zavřeš oči',
    closeEyes: 'Zavřít oči',
    eyesClosed: 'oči zavřené',
    eyesToggle: 'Zavírat oči přepnutím místo držení',
    rotate: 'Otoč zařízení na šířku, uvidíš víc.',
    corruptSave: 'Uložený postup nešel přečíst a byl resetován.',
    confirmNew: 'Začít znovu? Postup se smaže.',
    yes: 'Ano, začít znovu',
    no: 'Ponechat postup',
    progress: 'fragmenty',
    skip: 'Rovnou na portfolio',
    clickToLook: 'Klikni pro rozhlížení',
  },
} satisfies Record<Lang, Record<string, string>>

export type UiKey = keyof (typeof ui)['en']

export function t(key: UiKey, lang: Lang): string {
  return ui[lang][key]
}

/** World strings come from area data; falls back to EN, then to the key itself. */
export function worldText(key: string, lang: Lang): string {
  for (const a of areas) {
    const s = a.strings?.[lang]?.[key] ?? a.strings?.en?.[key]
    if (s !== undefined) return s
  }
  return key
}

export function detectLang(): Lang {
  const l = typeof navigator !== 'undefined' ? navigator.language : 'en'
  return l.toLowerCase().startsWith('cs') || l.toLowerCase().startsWith('sk') ? 'cs' : 'en'
}
