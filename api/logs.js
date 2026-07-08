// api/logs.js — 기간 조회 (오늘 체크 상태 + 통계 공용)
// body: { from?: 'YYYY-MM-DD', cursor?: string }  →  { logs: [...], next: cursor|null }

var NV = '2022-06-28';

module.exports = async function handler(req, res) {
  try {
    if (req.method !== 'POST') return res.status(405).json({ error: 'POST만 허용됩니다' });
    if (!pinOk(req)) return res.status(401).json({ pin: true, error: 'PIN이 필요합니다' });

    var dbid = normId(process.env.DATABASE_ID);
    if (!dbid) return res.status(500).json({ error: 'DATABASE_ID 환경 변수가 없거나 형식이 올바르지 않습니다' });

    var b = req.body || {};
    var q = { page_size: 100, sorts: [{ property: '날짜', direction: 'descending' }] };
    if (b.from)   q.filter = { property: '날짜', date: { on_or_after: b.from } };
    if (b.cursor) q.start_cursor = b.cursor;

    var out = await nf('databases/' + dbid + '/query', 'POST', q);

    var logs = (out.results || []).map(function (pg) {
      var p = pg.properties || {};
      return {
        id: pg.id,
        date: (p['날짜'] && p['날짜'].date) ? p['날짜'].date.start : '',
        slot: sel(p['슬롯']), sport: sel(p['종목']), type: sel(p['유형']), block: sel(p['블록']),
        title: tt(p['이름']), detail: pt(p['세부']), pace: pt(p['페이스']),
        memo: pt(p['메모']), raw: pt(p['원본']),
        volumeKg: nm(p['볼륨kg']), distanceKm: nm(p['거리km']),
        durationMin: nm(p['시간분']), rpe: nm(p['RPE'])
      };
    });

    return res.status(200).json({ logs: logs, next: out.has_more ? out.next_cursor : null });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};

function sel(p) { return (p && p.select) ? p.select.name : ''; }
function nm(p)  { return (p && typeof p.number === 'number') ? p.number : null; }
function pt(p)  { return (p && p.rich_text) ? p.rich_text.map(function (t) { return t.plain_text; }).join('') : ''; }
function tt(p)  { return (p && p.title) ? p.title.map(function (t) { return t.plain_text; }).join('') : ''; }

function pinOk(req) {
  var need = process.env.APP_PIN;
  if (!need) return true;
  return (req.headers['x-app-pin'] || '') === String(need);
}

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
