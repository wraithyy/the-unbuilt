import type { AreaDef } from '../types'
import { arrival } from './arrival'
import { atrium } from './atrium'
import { convergence } from './convergence'
import { ending } from './ending'
import { inversion } from './inversion'
import { loop } from './loop'
import { perspective } from './perspective'

/** First entry is where a new game starts. Bounds must not overlap. */
export const areas: AreaDef[] = [arrival, atrium, loop, perspective, inversion, convergence, ending]
