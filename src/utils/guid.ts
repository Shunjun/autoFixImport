/**
 * @author        Shunzi <toby.zsj@gmail.com>
 * @date          2022-08-03 01:27:43
 */

const idPool = new Set<string>();

const CHAR_MAP = "abcdefghijklmnopqrstuvwxyz1234567890";
const CHAR_MAP_LENGTH = CHAR_MAP.length;

export function guid(length: number = 10): string {
  const uid = new Array(length)
    .fill(0)
    .map(() => {
      const random = getRandom(0, CHAR_MAP_LENGTH);
      return CHAR_MAP[random];
    })
    .join("");
  if (idPool.has(uid)) {
    return guid();
  } else {
    return uid;
  }
}

function getRandom(start: number, end: number) {
  return Math.floor(Math.random() * (end - start) + start);
}

/**
 * 清空 IDPool
 */
export function clearIdPool() {
  idPool.clear();
}
