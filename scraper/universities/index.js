// Every university the scraper supports. To add one, write a new adapter
// (see waterloo.js for the shape) and add it here.

import * as waterloo from './waterloo.js'
import * as toronto from './toronto.js'
import * as western from './western.js'

export const adapters = [waterloo, toronto, western]
