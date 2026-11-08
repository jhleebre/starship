// Level list. Each level is generated from SEGMENTS with a fixed seed.
//   g          gravity            maxV       top speed (boost goes above it)
//   segs       number of pieces   feats      segment features allowed; the last one is "new" here
//   tank       full tank range as a multiple of the level length
//   fuelEvery  put a fuel strip every N pieces (0 = none)
//   hue        colour theme for track and sky
export const LEVELS = [
  { name: '첫 비행', sub: '틈은 뛰어넘고 벽은 피하세요', g: 30, maxV: 24, segs: 24, feats: ['base'], tank: 2.2, fuelEvery: 0, hue: .62 },
  { name: '계단 구름', sub: '낮은 블록은 점프해서 올라타요', g: 30, maxV: 25, segs: 28, feats: ['base', 'blk'], tank: 2.0, fuelEvery: 0, hue: .78 },
  { name: '가속 터널', sub: '파란 길은 가속, 갈색 길은 감속', g: 30, maxV: 26, segs: 30, feats: ['base', 'blk', 'spd'], tank: 1.6, fuelEvery: 6, hue: .52 },
  { name: '불꽃 지대', sub: '빨간 바닥에 닿으면 폭발합니다', g: 30, maxV: 26, segs: 32, feats: ['base', 'blk', 'spd', 'burn'], tank: 1.2, fuelEvery: 5, hue: .02 },
  { name: '도약대 기지', sub: '노란 도약대가 높이 띄워 줘요', g: 30, maxV: 27, segs: 32, feats: ['base', 'blk', 'spd', 'burn', 'jump'], tank: 1.0, fuelEvery: 4, hue: .12 },
  { name: '무거운 행성', sub: '중력이 강해서 점프가 낮아요', g: 46, maxV: 27, segs: 32, feats: ['base', 'blk', 'spd', 'burn', 'jump'], tank: .8, fuelEvery: 4, hue: .33 },
  { name: '달빛 저중력', sub: '중력이 약해서 벽도 뛰어넘을 수 있어요', g: 17, maxV: 28, segs: 36, feats: ['base', 'blk', 'spd', 'burn', 'jump'], tank: .7, fuelEvery: 4, hue: .70 },
  { name: '은하 끝', sub: '연료를 아껴 끝까지 달리세요', g: 30, maxV: 30, segs: 40, feats: ['base', 'blk', 'spd', 'burn', 'jump'], tank: .55, fuelEvery: 3, hue: .90 },
];
