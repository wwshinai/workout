// api/last.js — 해당 종목의 가장 최근 기록 1건 조회

var NOTION_VERSION = '2022-06-28';

module.exports = async function handler(req, res) {
  try {
    if (req.method !== 'POST') return res.status(405).json({ error: 'POST만 허용됩니다' });
    if (!checkPin(req)) return res.status(401).json({ pin: true, error: 'PIN이 필요합니다' });
    if (!process.env.DATABASE_ID) return res.status(200).json({ found: false });

    var sport = (req.body || {}).sport;
    var out = await notionFetch('databases/' + process.env.DATABASE_ID + '/query', 'POST', {
      filter: { property: '종목', select: { equals: sport } },
      sorts: [{ property: '날짜', direction: 'descending' }],
      page_size: 1
    });

    if (!out.results || !out.results.length) return res.status(200).json({ found: false });
    var p = out.results[0].properties;
    return res.status(200).json({
      found: true,
      date: p['날짜'] && p['날짜'].date ? p['날짜'].date.start : '',
      content: plainText(p['내용']),
      rpe: p['RPE'] ? p['RPE'].number : null,
      raw: plainText(p['원본'])
    });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};

function checkPin(req) {
  var need = process.env.APP_PIN;
  if (!need) return true;
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

function plainText(prop) {
  if (!prop || !prop.rich_text) return '';
  return prop.rich_text.map(function (t) { return t.plain_text; }).join('');
}
