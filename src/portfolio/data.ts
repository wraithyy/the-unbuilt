// Verbatim from https://jkvapil.cz and https://jkvapil.cz/cs/ (fetched 2026-10-12).
// Do not add content that is not on the site.

export type Lang = 'en' | 'cs'

export interface Capability {
  title: string
  delivered: string
}

export interface Job {
  years: string
  company: string
  role: string
}

export interface Portfolio {
  name: string
  role: string
  lede: string
  summary: string
  capabilitiesTitle: string
  capabilities: Capability[]
  capabilitiesNote: string
  aboutTitle: string
  about: string
  aboutRule: string
  stack: { label: string; items: string }[]
  historyTitle: string
  history: Job[]
  recordTitle: string
  record: string
  contactTitle: string
  contact: string
  availability: string
}

export const links = {
  github: { label: '@wraithyy', href: 'https://github.com/wraithyy' },
  email: { label: 'josef0kvapil@gmail.com', href: 'mailto:josef0kvapil@gmail.com' },
  linkedin: { label: 'josef-kvapil', href: 'https://www.linkedin.com/in/josef-kvapil' },
  cv: { href: 'https://jkvapil.cz/cv-josef-kvapil.pdf' },
  site: { label: 'jkvapil.cz', href: 'https://jkvapil.cz' },
} as const

const stackItems = {
  daily: 'React · TypeScript · TanStack · Hono · Drizzle · Astro · MUI · Vite · Biome',
  env: 'vim · tmux · Claude Code · Docker · GitLab CI · Jenkins · OpenShift',
  other: 'Angular · Java · Rust · Go · Elixir · Gleam',
}

export const portfolio: Record<Lang, Portfolio> = {
  en: {
    name: 'Josef Kvapil',
    role: 'Frontend architect — Liberec',
    lede: 'I architect and lead frontend platforms — the code other teams build on — for insurance, energy and automotive companies.',
    summary:
      'senior frontend architect · React & TypeScript · 10+ years · banking, insurance, energy, automotive · Liberec, CZ',
    capabilitiesTitle: 'What I bring to a project.',
    capabilities: [
      {
        title: 'Platform & microfrontend architecture',
        delivered:
          'architected a core-system rebuild for a major insurance group — a framework dozens of developers use daily',
      },
      {
        title: 'Leading frontend teams',
        delivered:
          'led frontend teams on a public-facing mobile-first self-service app — and on a utility giant’s sales digitalization',
      },
      {
        title: 'Delivery in regulated industries',
        delivered:
          'shipped fully online bank-account opening incl. identity verification; paperless contracting end-to-end',
      },
      {
        title: 'Analysis & client communication',
        delivered:
          'ran the analysis phase of sales & customer portals for an energy company — the spec its delivery team builds on',
      },
    ],
    capabilitiesNote: 'Real projects, real clients — I just don’t name them.',
    aboutTitle: 'I dig into how things work under the hood.',
    about:
      'I wrote my first PHP website in sixth grade and never stopped. Today that means React and TanStack down to the internals — I love exploring new tech and passing it on to colleagues, and I know when a project needs boring, proven tech instead. I use AI every day, with one hard rule:',
    aboutRule: 'AI speeds me up; it doesn’t steer. Vibecoding is not engineering.',
    stack: [
      { label: 'daily', items: stackItems.daily },
      { label: 'environment', items: stackItems.env },
      { label: 'I find my way in', items: stackItems.other },
    ],
    historyTitle: 'Where I’ve worked',
    history: [
      {
        years: '2021 — now',
        company: 'Trask',
        role: 'senior frontend developer → architect & team lead — banking, energy, insurance',
      },
      {
        years: '2019 — 21',
        company: 'Lundegaard',
        role: 'JavaScript developer — React & Angular on large corporate applications',
      },
      {
        years: '2018 — 19',
        company: 'Trask',
        role: 'JavaScript developer — Angular, JSP, a bit of Java',
      },
      {
        years: '2015 — 17',
        company: 'C26.cz',
        role: 'programmer — PHP, C, jQuery, and my first clients',
      },
    ],
    recordTitle: 'For the record',
    record:
      'AWS Certified Cloud Practitioner · Anthropic Claude Code certifications · mentoring & internal talks · CZ / EN / DE',
    contactTitle: 'Bring me a hard problem.',
    contact:
      'I like sinking my teeth into hard frontend problems — architecture, delivery, open source.',
    availability: 'open to new engagements · remote or hybrid · Liberec / Prague · CZ / EN',
  },
  cs: {
    name: 'Josef Kvapil',
    role: 'Frontend architekt — Liberec',
    lede: 'Navrhuju a vedu frontend platformy — kód, na kterém staví další týmy — pro pojišťovnictví, energetiku a automotive.',
    summary:
      'senior frontend architekt · React & TypeScript · 10+ let · bankovnictví, pojišťovnictví, energetika, automotive · Liberec, CZ',
    capabilitiesTitle: 'Co do projektu přináším.',
    capabilities: [
      {
        title: 'Architektura platforem a mikrofrontendů',
        delivered:
          'architektura přestavby core systému velké pojišťovací skupiny — framework, který denně používají desítky vývojářů',
      },
      {
        title: 'Vedení frontend týmů',
        delivered:
          'vedení FE týmů: veřejná mobile-first samoobslužná aplikace a digitalizace prodeje energetického giganta',
      },
      {
        title: 'Dodávka v regulovaných odvětvích',
        delivered:
          'plně online založení bankovního účtu vč. ověření identity; bezpapírové zasmluvnění od A do Z',
      },
      {
        title: 'Analýza a komunikace s klientem',
        delivered:
          'analytická fáze sales a zákaznických portálů pro energetickou firmu — specifikace, na které staví dodávkový tým',
      },
    ],
    capabilitiesNote: 'Reálné dodávky; klienty záměrně nejmenuji.',
    aboutTitle: 'Zajímá mě, jak věci fungují uvnitř.',
    about:
      'První web jsem napsal v PHP v šesté třídě a od té doby mě to nepustilo. Dnes stavím na Reactu a TanStacku a vidím jim až pod kapotu — rád zkoumám nové technologie a předávám je dál kolegům, ale vím, kdy projekt naopak potřebuje nudné a prověřené řešení. AI používám naplno každý den, s jedním železným pravidlem:',
    aboutRule: 'AI mě zrychluje, ale neřídí. Vibecoding není inženýrství.',
    stack: [
      { label: 'denně', items: stackItems.daily },
      { label: 'prostředí', items: stackItems.env },
      { label: 'zorientuju se v', items: stackItems.other },
    ],
    historyTitle: 'Kde jsem pracoval',
    history: [
      {
        years: '2021 — teď',
        company: 'Trask',
        role: 'senior frontend vývojář → architekt & team lead — bankovnictví, energetika, pojišťovnictví',
      },
      {
        years: '2019 — 21',
        company: 'Lundegaard',
        role: 'JavaScript vývojář — React a Angular na velkých korporátních aplikacích',
      },
      {
        years: '2018 — 19',
        company: 'Trask',
        role: 'JavaScript vývojář — Angular, JSP, občas Java',
      },
      {
        years: '2015 — 17',
        company: 'C26.cz',
        role: 'programátor — PHP, C, jQuery a první klienti',
      },
    ],
    recordTitle: 'Pro pořádek',
    record:
      'AWS Certified Cloud Practitioner · Anthropic Claude Code certifikace · mentoring a interní přednášky · CZ / EN / DE',
    contactTitle: 'Přineste mi tvrdý oříšek.',
    contact: 'Rád se zakousnu do tvrdých frontend problémů — architektura, delivery i open source.',
    availability: 'otevřený novým projektům · remote i hybrid · Liberec / Praha · CZ / EN',
  },
}
