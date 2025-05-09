// Unit-тесты для snap и clamp
function snap(value: number, cell: number): number {
  return Math.round(value / cell) * cell;
}
function clamp(value: number, min: number, max: number): number {
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