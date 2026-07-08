// api/save.js — 기록 생성 · 수정 · 삭제 (v2)
// 환경 변수: NOTION_TOKEN(필수), DATABASE_ID(필수), APP_PIN(선택)
// body: { id?, del?, title, date, slot, sport, type, detail,
//         volumeKg, distanceKm, durationMin, pace, rpe, block, memo, raw }

var NV = '2022-06-28';

module.exports = async function handler(req, res) {
  try {
    if (req.method !== 'POST') return res.status(405).json({ error: 'POST만 허용됩니다' });
    if (!pinOk(req)) return res.status(401).json({ pin: true, error: 'PIN이 필요합니다' });

    var dbid = normId(process.env.DATABASE_ID);
    if (!dbid) return res.status(500).json({ error: 'DATABASE_ID 환경 변수가 없거나 형식이 올바르지 않습니다' });

    var d = req.body || {};

    // 삭제 (노션 아카이브)
    if (d.del) {
      var delId = normId(d.id);
      if (!delId) return res.status(400).json({ error: 'id 형식이 올바르지 않습니다' });
      await nf('pages/' + delId, 'PATCH', { archived: true });
      return res.status(200).json({ ok: true, deleted: true });
    }

    if (!d.date) return res.status(400).json({ error: 'date가 필요합니다' });

    var props = {
      '이름':   { title: [{ text: { content: String(d.title || d.date).slice(0, 200) } }] },
      '날짜':   { date: { start: d.date } },
      '슬롯':   d.slot  ? { select: { name: String(d.slot) } }  : { select: null },
      '종목':   d.sport ? { select: { name: String(d.sport) } } : { select: null },
      '유형':   d.type  ? { select: { name: String(d.type) } }  : { select: null },
      '블록':   d.block ? { select: { name: String(d.block) } } : { select: null },
      '세부':   { rich_text: rt(d.detail) },
      '페이스': { rich_text: rt(d.pace) },
      '메모':   { rich_text: rt(d.memo) },
      '원본':   { rich_text: rt(d.raw) },
      '볼륨kg': num(d.volumeKg),
      '거리km': num(d.distanceKm),
      '시간분': num(d.durationMin),
      'RPE':    num(d.rpe)
    };

    var pageId = normId(d.id);
    if (d.id && !pageId) return res.status(400).json({ error: 'id 형식이 올바르지 않습니다' });
    var page = pageId
      ? await nf('pages/' + pageId, 'PATCH', { properties: props })
      : await nf('pages', 'POST', { parent: { database_id: dbid }, properties: props });

    return res.status(200).json({ ok: true, id: page.id, url: page.url });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};

function num(v) { return { number: (v == null || v === '' || isNaN(Number(v))) ? null : Number(v) }; }

function rt(s) {
  s = String(s == null ? '' : s);
  if (!s) return [];
  var chunks = [];
  for (var i = 0; i < s.length; i += 1900) chunks.push({ text: { content: s.slice(i, i + 1900) } });
  return chunks;
}

function pinOk(req) {
  var need = process.env.APP_PIN;
  if (!need) return true;
  return (req.headers['x-app-pin'] || '') === String(need);
}

// URL·하이픈이 섞여 있어도 32자리 hex ID만 추출
function normId(s) {
  s = String(s || '').trim();
  var m = s.replace(/-/g, '').match(/[0-9a-f]{32}/i);
  return m ? m[0] : '';
}

async function nf(path, method, payload) {
  if (!process.env.NOTION_TOKEN) throw new Error('NOTION_TOKEN 환경 변수가 없습니다');
  var r = await fetch('https://api.notion.com/v1/' + path, {
    method: method,
    headers: {
      'Authorization': 'Bearer ' + process.env.NOTION_TOKEN,
      'Notion-Version': NV,
      'Content-Type': 'application/json'
    },
    body: payload ? JSON.stringify(payload) : undefined
  });
  var body = await r.json();
  if (!r.ok) throw new Error('노션 API 오류(' + r.status + '): ' + (body.message || ''));
  return body;
}
