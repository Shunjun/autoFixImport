/**
 * @description 节流文件保存的操作
 * @param fn
 * @param delay
 * @returns
 */
export function throttle(fn: () => any, delay: number = 5000) {
  return function (lastTime: number) {
    const now = Date.now();
    if (!lastTime || now - lastTime > delay) {
      fn();
      return now;
    }
    return lastTime;
  };
}
