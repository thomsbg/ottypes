import 'babel-polyfill'

import * as register from './register'
import * as set from './set'
// import * as map from './map'
import * as list from './list'
// import * as tree from './tree'
import * as subtypes from './subtypes'

subtypes.set(register)
subtypes.set(set)
// subtypes.set(map)
subtypes.set(list)
// subtypes.set(tree)

export { register, set, list, subtypes }
// export { map, tree }
