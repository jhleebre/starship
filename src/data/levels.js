// Level list. Each level is generated from SEGMENTS with a fixed seed.
//   g          gravity            maxV       top speed (boost goes above it)
//   segs       number of pieces   feats      segment features allowed; the last one is "new" here
//   tank       distance a full tank lasts (Infinity = fuel never matters)
//   fuelEvery  put a fuel strip every N pieces (0 = none)
//   hue        colour theme for track and sky
// Tanks are sized from the gaps between fuel strips: levels 3-5 forgive one missed
// strip, from 6 on missing one in the wrong place is fatal. An empty ship barely
// coasts and can't clear gaps, so the tank is the real range. Skipping all fuel
// fails from level 3 on. Re-check with tools/check-levels after changes.
export const LEVELS = [
  { name: '첫 비행', sub: '틈은 뛰어넘고 벽은 피하세요', g: 30, maxV: 24, segs: 24, feats: ['base'], tank: Infinity, fuelEvery: 0, hue: .62 },
  { name: '계단 구름', sub: '낮은 블록은 점프해서 올라타요', g: 30, maxV: 25, segs: 28, feats: ['base', 'blk'], tank: Infinity, fuelEvery: 0, hue: .78 },
  { name: '가속 터널', sub: '가속·감속 바닥 등장! 이제 초록 연료 칸을 챙기세요', g: 30, maxV: 26, segs: 30, feats: ['base', 'blk', 'spd'], tank: 240, fuelEvery: 6, hue: .52 },
  { name: '불꽃 지대', sub: '빨간 바닥에 닿으면 폭발합니다', g: 30, maxV: 26, segs: 32, feats: ['base', 'blk', 'spd', 'burn'], tank: 180, fuelEvery: 5, hue: .02 },
  { name: '도약대 기지', sub: '노란 도약대가 높이 띄워 줘요', g: 30, maxV: 27, segs: 32, feats: ['base', 'blk', 'spd', 'burn', 'jump'], tank: 140, fuelEvery: 4, hue: .12 },
  { name: '무거운 행성', sub: '중력이 강해서 점프가 낮아요', g: 46, maxV: 27, segs: 32, feats: ['base', 'blk', 'spd', 'burn', 'jump'], tank: 150, fuelEvery: 4, hue: .33 },
  { name: '달빛 저중력', sub: '중력이 약해서 벽도 뛰어넘을 수 있어요', g: 17, maxV: 28, segs: 36, feats: ['base', 'blk', 'spd', 'burn', 'jump'], tank: 125, fuelEvery: 4, hue: .70 },
  { name: '유성 고속도로', sub: '더 빠르고 조금 무거워졌어요. 연료 칸을 놓치지 마세요', g: 36, maxV: 29, segs: 38, feats: ['base', 'blk', 'spd', 'burn', 'jump'], tank: 100, fuelEvery: 3, hue: .20 },
  { name: '은하 끝', sub: '연료를 아껴 끝까지 달리세요', g: 30, maxV: 30, segs: 40, feats: ['base', 'blk', 'spd', 'burn', 'jump'], tank: 100, fuelEvery: 3, hue: .90 },
];
