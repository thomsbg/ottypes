import * as register from './register'
import * as set from './set'
import * as string from './string'
import * as list from './list'
import * as map from './map'
// import * as tree from './tree'
import * as subtypes from './subtypes'

subtypes.set(register)
subtypes.set(set)
subtypes.set(string)
subtypes.set(list)
subtypes.set(map)
// subtypes.set(tree)

export { register, set, string, list, map, subtypes }
