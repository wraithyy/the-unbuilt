import { type Lang, portfolio } from '../../portfolio/data'
import type { AnamorphDef } from '../types'

// Portfolio monuments: anamorphic panels built from portfolio data (verbatim from
// jkvapil.cz). Strings are generated per language under the `mon.` prefix.

type Section = AnamorphDef['section']

function sectionLines(lang: Lang, section: Section): { title: string; lines: string[] } {
  const p = portfolio[lang]
  switch (section) {
    case 'about':
      return { title: p.aboutTitle, lines: [p.lede, p.aboutRule] }
    case 'capabilities':
      return {
        title: p.capabilitiesTitle,
        lines: [...p.capabilities.map((c, i) => `0${i + 1} ${c.title}`), p.capabilitiesNote],
      }
    case 'stack':
      return { title: 'Stack', lines: p.stack.map((s) => `${s.label}: ${s.items}`) }
    case 'experience':
      return {
        title: p.historyTitle,
        lines: p.history.map((h) => `${h.years} · ${h.company} · ${h.role}`),
      }
    case 'contact':
      return {
        title: p.contactTitle,
        lines: [
          p.contact,
          'github.com/wraithyy',
          'josef0kvapil@gmail.com',
          'linkedin.com/in/josef-kvapil',
          'jkvapil.cz',
        ],
      }
  }
}

const FIG: Record<Section, { en: string; cs: string }> = {
  about: { en: 'fig. i: about', cs: 'obr. i: o mně' },
  capabilities: { en: 'fig. ii: capabilities', cs: 'obr. ii: co umím' },
  stack: { en: 'fig. iii: stack', cs: 'obr. iii: stack' },
  experience: { en: 'fig. iv: experience', cs: 'obr. iv: kde jsem pracoval' },
  contact: { en: 'fig. v: contact', cs: 'obr. v: kontakt' },
}

/** Line shown where an area is solved, pointing at the monument the solve raised. */
export function raisedLine(section: Section) {
  return {
    en: `${FIG[section].en} · now standing in the Atrium`,
    cs: `${FIG[section].cs} · teď stojí v hale`,
  }
}

const MAX_LINES = 6

export function monument(
  section: Section,
  place: Pick<AnamorphDef, 'vantage' | 'center' | 'height' | 'when'>,
): AnamorphDef {
  const n = sectionLines('en', section).lines.length
  return {
    type: 'anamorph',
    id: `mon-${section}`,
    section,
    label: `mon.${section}.label`,
    title: `mon.${section}.title`,
    lines: Array.from({ length: Math.min(n, MAX_LINES) }, (_, i) => `mon.${section}.${i}`),
    ...place,
  }
}

export function monumentStrings(sections: Section[]) {
  const out: { en: Record<string, string>; cs: Record<string, string> } = { en: {}, cs: {} }
  for (const lang of ['en', 'cs'] as const)
    for (const s of sections) {
      const { title, lines } = sectionLines(lang, s)
      out[lang][`mon.${s}.label`] = FIG[s][lang]
      out[lang][`mon.${s}.title`] = title
      lines.slice(0, MAX_LINES).forEach((l, i) => {
        out[lang][`mon.${s}.${i}`] = l
      })
    }
  return out
}
