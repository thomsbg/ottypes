import * as register from './register.mjs'
import * as set from './set.mjs'
import * as string from './string.mjs'
import * as list from './list.mjs'
import * as map from './map.mjs'
import * as subtypes from './subtypes.mjs'

subtypes.set(register)
subtypes.set(set)
subtypes.set(string)
subtypes.set(list)
subtypes.set(map)

export { register, set, string, list, map, subtypes }
