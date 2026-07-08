// api/routine.js — 루틴 버전(스냅샷) 저장·조회 (v2)
// 환경 변수: NOTION_TOKEN(필수), ROUTINE_DATABASE_ID(필수), APP_PIN(선택)
// body: { op:'list' }
//     | { op:'save', cid, ts(ISO), note, summary, data(JSON 문자열) }
// 루틴은 "운동 기록" DB와 완전히 별개인 "루틴 v2" DB에 append-only 스냅샷으로 저장됩니다.
// 기존 기록 DB는 이 함수가 절대 건드리지 않습니다.

var NV = '2022-06-28';

module.exports = async function handler(req, res) {
  try {
    if (req.method !== 'POST') return res.status(405).json({ error: 'POST만 허용됩니다' });
    if (!pinOk(req)) return res.status(401).json({ pin: true, error: 'PIN이 필요합니다' });

    var dbid = normId(process.env.ROUTINE_DATABASE_ID);
    if (!dbid) return res.status(500).json({ error: 'ROUTINE_DATABASE_ID 환경 변수가 없습니다. /api/setup?pin=PIN&routine=1 로 루틴 DB를 먼저 만드세요' });

    var d = req.body || {};

    if (d.op === 'list') {
      var out = [], cursor;
      do {
        var q = await nf('databases/' + dbid + '/query', 'POST', {
          page_size: 100,
          start_cursor: cursor,
          sorts: [{ property: '시각', direction: 'descending' }]
        });
        (q.results || []).forEach(function (p) {
          var P = p.properties || {};
          out.push({
            id: p.id,
            cid: txt(P['CID']),
            ts: (P['시각'] && P['시각'].date && P['시각'].date.start) || null,
            note: txt(P['메모']),
            summary: txt(P['요약']),
            data: txt(P['데이터'])
          });
        });
        cursor = q.has_more ? q.next_cursor : null;
      } while (cursor);
      return res.status(200).json({ versions: out });
    }

    if (d.op === 'save') {
      if (!d.data) return res.status(400).json({ error: 'data가 필요합니다' });
      var props = {
        '이름':   { title: [{ text: { content: String(d.note || ('루틴 ' + (d.ts || ''))).slice(0, 120) || '루틴' } }] },
        '시각':   { date: { start: d.ts || new Date().toISOString() } },
        'CID':    { rich_text: rt(d.cid) },
        '메모':   { rich_text: rt(d.note) },
        '요약':   { rich_text: rt(d.summary) },
        '데이터': { rich_text: rt(d.data) }
      };
      var page = await nf('pages', 'POST', { parent: { database_id: dbid }, properties: props });
      return res.status(200).json({ ok: true, id: page.id });
    }

    return res.status(400).json({ error: 'op이 필요합니다 (list 또는 save)' });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};

function txt(p) {
  if (!p) return '';
  var a = p.rich_text || p.title;
  if (!a) return '';
  return a.map(function (x) { return x.plain_text || (x.text && x.text.content) || ''; }).join('');
}

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
