// api/save.js — 운동 기록을 노션에 저장
// 환경 변수: NOTION_TOKEN(필수), DATABASE_ID(필수), APP_PIN(선택: 설정하면 PIN 잠금 켜짐)

var NOTION_VERSION = '2022-06-28';

module.exports = async function handler(req, res) {
  try {
    if (req.method !== 'POST') return res.status(405).json({ error: 'POST만 허용됩니다' });
    if (!checkPin(req)) return res.status(401).json({ pin: true, error: 'PIN이 필요합니다' });
    if (!process.env.DATABASE_ID) return res.status(500).json({ error: 'DATABASE_ID 환경 변수가 없습니다' });

    var data = req.body || {};
    var title = String(data.date || '').slice(5).replace('-', '/') + ' ' + data.sport;

    var properties = {
      '이름':   { title: [{ text: { content: title } }] },
      '날짜':   { date: { start: data.date } },
      '종목':   { select: { name: data.sport } },
      '내용':   { rich_text: toRt(data.content) },
      '메모':   { rich_text: toRt(data.memo) },
      '페이스': { rich_text: toRt(data.pace) },
      '원본':   { rich_text: toRt(data.raw) }
    };
    if (data.rpe != null && data.rpe !== '')                 properties['RPE']    = { number: Number(data.rpe) };
    if (data.distanceKm != null && data.distanceKm !== '')   properties['거리km'] = { number: Number(data.distanceKm) };
    if (data.durationMin != null && data.durationMin !== '') properties['시간분'] = { number: Number(data.durationMin) };

    var page = await notionFetch('pages', 'POST', {
      parent: { database_id: process.env.DATABASE_ID },
      properties: properties
    });
    return res.status(200).json({ ok: true, url: page.url });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};

function checkPin(req) {
  var need = process.env.APP_PIN;
  if (!need) return true; // PIN 미설정 시 잠금 해제 상태
  return (req.headers['x-app-pin'] || '') === String(need);
}

async function notionFetch(path, method, payload) {
  if (!process.env.NOTION_TOKEN) throw new Error('NOTION_TOKEN 환경 변수가 없습니다');
  var r = await fetch('https://api.notion.com/v1/' + path, {
    method: method,
    headers: {
      'Authorization': 'Bearer ' + process.env.NOTION_TOKEN,
      'Notion-Version': NOTION_VERSION,
      'Content-Type': 'application/json'
    },
    body: payload ? JSON.stringify(payload) : undefined
  });
  var body = await r.json();
  if (!r.ok) throw new Error('노션 API 오류(' + r.status + '): ' + (body.message || ''));
  return body;
}

function toRt(s) {
  s = String(s == null ? '' : s);
  if (!s) return [];
  var chunks = [];
  for (var i = 0; i < s.length; i += 1900) chunks.push({ text: { content: s.slice(i, i + 1900) } });
  return chunks;
}
