// Unit-тесты для snap и clamp
function snap(value: number, cell: number): number {
  if (isNaN(value) || isNaN(cell)) return NaN;
  if (!isFinite(value)) return value;
  if (cell === 0) return value;
  if (cell < 0) return 0;
  return Math.round(value / cell) * cell;
}
function clamp(value: number, min: number, max: number): number {
  if (isNaN(value)) return min;
  return Math.max(min, Math.min(max, value));
}

test('snap округляет к ближайшей клетке', () => {
  expect(snap(39, 40)).toBe(40);
  expect(snap(0, 40)).toBe(0);
  expect(snap(79, 40)).toBe(80);
  expect(snap(41, 40)).toBe(40);
});

test('clamp ограничивает по границам', () => {
  expect(clamp(10, 0, 100)).toBe(10);
  expect(clamp(-5, 0, 100)).toBe(0);
  expect(clamp(150, 0, 100)).toBe(100);
});

test('snap работает с NaN и Infinity', () => {
  expect(snap(NaN, 40)).toBeNaN();
  expect(snap(Infinity, 40)).toBe(Infinity);
  expect(snap(-Infinity, 40)).toBe(-Infinity);
});

test('snap с отрицательным cell', () => {
  expect(snap(40, -40)).toBe(0);
});

test('clamp с min > max', () => {
  expect(clamp(10, 100, 0)).toBe(100);
});

test('clamp с NaN и Infinity', () => {
  expect(clamp(NaN, 0, 100)).toBe(0);
  expect(clamp(Infinity, 0, 100)).toBe(100);
  expect(clamp(-Infinity, 0, 100)).toBe(0);
}); 