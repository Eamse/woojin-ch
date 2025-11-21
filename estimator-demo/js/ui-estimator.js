import { estimateAll, toKRW } from './estimator.js';

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

let PRICE = null;

// ------------- 초기화 -------------
window.addEventListener('DOMContentLoaded', async () => {
  PRICE = await fetch('./data/unitPrices.json').then((r) => r.json());
  $('#priceVersion').textContent = `단가 기준일: ${PRICE.version}`;

  // 초기 행 1개
  addRow();
  // URL 파라미터 복원
  restoreFromQuery();

  $('#addRow').addEventListener('click', addRow);
  $('#btnCalc').addEventListener('click', onCalc);
  $('#btnShare').addEventListener('click', onShare);
});

// ------------- 행 추가/삭제 -------------
function addRow(pref = {}) {
  const wrap = $('#rows');
  const row = document.createElement('div');
  row.className = 'row';
  row.innerHTML = `
    <select name="type">
      <option value="double">이중창(일반)</option>
      <option value="triple">삼중창</option>
      <option value="system">시스템창</option>
    </select>
    <input name="width"  type="number" placeholder="가로(cm)" inputmode="numeric" min="30" value="${
      pref.width ?? ''
    }">
    <input name="height" type="number" placeholder="세로(cm)" inputmode="numeric" min="30" value="${
      pref.height ?? ''
    }">
    <input name="qty"    type="number" placeholder="수량" inputmode="numeric" min="1" value="${
      pref.qty ?? 1
    }">
    <select name="glass">
      <option value="basic">기본유리</option>
      <option value="lowe">로이유리</option>
      <option value="triple_lowe">삼중+로이</option>
    </select>
    <select name="dismantle">
      <option value="yes">철거 포함</option>
      <option value="no">철거 없음</option>
    </select>
    <button type="button" class="btn ghost btn-del">삭제</button>
  `;
  wrap.appendChild(row);

  row.querySelector('.btn-del').addEventListener('click', () => {
    row.remove();
  });
}

function readRows() {
  return $$('#rows .row').map((row) => {
    const get = (name) => row.querySelector(`[name="${name}"]`);
    return {
      type: get('type').value,
      width: get('width').value,
      height: get('height').value,
      qty: get('qty').value,
      glass: get('glass').value,
      dismantle: get('dismantle').value === 'yes',
    };
  });
}

function readCtx() {
  return {
    dwellingType: $('#dwellingType').value,
    region: $('#region').value,
    floor: $('#floor').value,
    elevator: $('#elevator').value,
  };
}

// ------------- 계산 버튼 -------------
function onCalc() {
  const rows = readRows();
  if (rows.length === 0) {
    alert('창 정보를 1개 이상 입력해주세요.');
    return;
  }
  for (const r of rows) {
    if (!r.width || !r.height) {
      alert('가로/세로(cm)를 입력해주세요.');
      return;
    }
  }

  const ctx = readCtx();
  const out = estimateAll(rows, ctx, PRICE);

  // 결과 렌더
  $('#rangeMin').textContent = toKRW(out.min);
  $('#rangeMax').textContent = toKRW(out.max);

  const list = $('#breakdownList');
  list.innerHTML = '';
  out.per.forEach((p, i) => {
    const li = document.createElement('li');
    li.textContent = `창 ${i + 1}  (면적 ${p.area}㎡ × 수량 ${
      p.qty
    })  →  ${toKRW(Math.round(p.subtotal))}원`;
    list.appendChild(li);
  });
  const extra = document.createElement('li');
  extra.innerHTML = `가중치(지역×주거×승강기×층수): <b>${(
    out.rf *
    out.df *
    out.ef *
    out.ff
  ).toFixed(2)}</b>`;
  list.appendChild(extra);

  $('#result').classList.remove('hidden');
  window.scrollTo({ top: $('#result').offsetTop - 10, behavior: 'smooth' });
}

// ------------- 공유/저장 링크 -------------
function onShare() {
  const params = new URLSearchParams();

  // base
  params.set('dw', $('#dwellingType').value);
  params.set('rg', $('#region').value);
  params.set('fl', $('#floor').value);
  params.set('el', $('#elevator').value);

  // rows
  const rows = readRows();
  rows.forEach((r, idx) => {
    params.set(`t${idx}`, r.type);
    params.set(`w${idx}`, r.width);
    params.set(`h${idx}`, r.height);
    params.set(`q${idx}`, r.qty);
    params.set(`g${idx}`, r.glass);
    params.set(`d${idx}`, r.dismantle ? '1' : '0');
  });
  params.set('n', rows.length.toString());

  const url = `${location.origin}${location.pathname}?${params.toString()}`;
  navigator.clipboard.writeText(url).then(() => {
    alert('현재 입력을 링크로 복사했습니다. 붙여넣어 공유하세요.');
  });
}

function restoreFromQuery() {
  const q = new URLSearchParams(location.search);
  if (!q.has('n')) return;

  $('#dwellingType').value = q.get('dw') ?? 'apartment';
  $('#region').value = q.get('rg') ?? 'seoul';
  $('#floor').value = q.get('fl') ?? '5';
  $('#elevator').value = q.get('el') ?? 'yes';

  // 기존 행 모두 제거 후 복원
  $('#rows').innerHTML = '';
  const n = Number(q.get('n') || 0);
  for (let i = 0; i < n; i++) {
    addRow({
      width: q.get(`w${i}`) || '',
      height: q.get(`h${i}`) || '',
      qty: q.get(`q${i}`) || 1,
    });
    const row = $$('#rows .row')[i];
    row.querySelector('[name="type"]').value = q.get(`t${i}`) || 'double';
    row.querySelector('[name="glass"]').value = q.get(`g${i}`) || 'basic';
    row.querySelector('[name="dismantle"]').value =
      q.get(`d${i}`) === '1' ? 'yes' : 'no';
  }
}
