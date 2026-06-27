export function createId(prefix, list) {
  return `${prefix}_${list.length + 1}`;
}
