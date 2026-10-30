// Every university the scraper supports. To add one, write a new adapter
// (see waterloo.js for the shape) and add it here.

import * as waterloo from './waterloo.js'
import * as toronto from './toronto.js'
import * as western from './western.js'
import * as carleton from './carleton.js'
import * as ottawa from './ottawa.js'
import * as york from './york.js'
import * as queens from './queens.js'
import * as tmu from './tmu.js'
import * as laurier from './laurier.js'

export const adapters = [waterloo, toronto, western, carleton, ottawa, york, queens, tmu, laurier]
