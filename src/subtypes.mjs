const SUBTYPES = new Map()

export function get(key) {
  if (!SUBTYPES.has(key)) {
    throw new Error(`unknown subtype: ${key}`)
  }
  return SUBTYPES.get(key)
}

export function set(type) {
  if (type.name) SUBTYPES.set(type.name, type)
  if (type.uri) SUBTYPES.set(type.uri, type)
}
