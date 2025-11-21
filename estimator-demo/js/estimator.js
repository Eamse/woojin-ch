// 순수 계산 로직 모듈
export function m2(widthCm, heightCm) {
  const w = Math.max(0, Number(widthCm) || 0) / 100;
  const h = Math.max(0, Number(heightCm) || 0) / 100;
  return +(w * h).toFixed(3);
}

export function openingCost(row, price) {
  // row: {type, width, height, qty, glass, dismantle:boolean}
  const area = m2(row.width, row.height);
  const baseUnit =
    row.type === 'system'
      ? price.base.system
      : row.type === 'triple'
      ? price.base.triple
      : price.base.double;

  const glassAdd =
    row.glass === 'triple_lowe'
      ? price.glass.triple_lowe
      : row.glass === 'lowe'
      ? price.glass.lowe
      : 0;

  const material = (baseUnit + glassAdd) * area; // 1개당 자재+가공
  const dismantle = row.dismantle
    ? price.dismantle_per_opening + price.waste_per_opening
    : 0;

  const unit = material + dismantle;
  const qty = Math.max(1, Number(row.qty) || 1);

  return {
    area,
    unit,
    qty,
    subtotal: unit * qty,
  };
}

export function applyFactors(subtotal, ctx, price) {
  // ctx: {region, dwellingType, floor, elevator}
  const rf = price.region_factor[ctx.region] ?? 1;
  const df = price.dwelling_factor[ctx.dwellingType] ?? 1;
  const ef = price.elevator_factor[ctx.elevator] ?? 1;
  const floors = Math.max(1, Number(ctx.floor) || 1);
  const floorSteps = Math.floor((floors - 1) / 5); // 1~5층:0, 6~10:1 ...
  const ff = 1 + price.floor_factor_per_5floors * floorSteps;

  const factored = subtotal * rf * df * ef * ff;
  return { factored, rf, df, ef, ff };
}

export function toKRW(n) {
  return n.toLocaleString('ko-KR');
}

export function estimateAll(rows, ctx, price) {
  const per = rows.map((r) => openingCost(r, price));
  const materialSum = per.reduce((s, x) => s + x.subtotal, 0);

  const { factored, rf, df, ef, ff } = applyFactors(materialSum, ctx, price);
  const min = Math.floor(factored * (price.range.min ?? 0.9));
  const max = Math.ceil(factored * (price.range.max ?? 1.2));

  return {
    version: price.version,
    per,
    materialSum,
    rf,
    df,
    ef,
    ff,
    factored,
    min,
    max,
  };
}
