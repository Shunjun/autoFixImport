/**
 * @description 节流文件保存的操作
 * @param fn
 * @param delay
 * @returns
 */
export function throttle<T = unknown>(
  fn: (...args: T[]) => any,
  delay: number = 5000
) {
  return function (lastTime: number, ...args: T[]) {
    const now = Date.now();
    if (!lastTime || now - lastTime > delay) {
      fn(...args);
      return now;
    }
    return lastTime;
  };
}
