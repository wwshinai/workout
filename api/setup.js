// api/setup.js — 노션에 "운동 기록 v2" DB 생성
// 사용법: 내주소.vercel.app/api/setup?pin=1234
//         기존 DATABASE_ID가 이미 있으면 &force=1 을 붙여 강제 생성 (v1 → v2 마이그레이션)
// 필요 환경 변수: NOTION_TOKEN, PARENT_PAGE_ID

var NV = '2022-06-28';

module.exports = async function handler(req, res) {
  try {
    if (process.env.APP_PIN && String(req.query.pin || '') !== String(process.env.APP_PIN)) {
      return res.status(401).send('PIN이 필요합니다. 주소 뒤에 ?pin=설정한PIN 을 붙여 접속하세요.');
    }

    // 루틴 전용 DB 생성: /api/setup?pin=PIN&routine=1  (기존 기록 DB와 완전히 별개)
    if (req.query.routine) {
      var parentR = normId(process.env.PARENT_PAGE_ID);
      if (!parentR) return html(res, '<h2>설정 필요</h2><p><code>PARENT_PAGE_ID</code> 환경 변수를 먼저 추가하세요. (노션 페이지 URL을 그대로 붙여넣어도 됩니다)</p>');
      if (process.env.ROUTINE_DATABASE_ID && !req.query.force) {
        return html(res, '<h2>이미 ROUTINE_DATABASE_ID가 등록되어 있습니다</h2>' +
          '<p>새 루틴 DB를 만들려면 주소 뒤에 <code>&force=1</code>을 붙여 다시 접속하세요.</p><p><a href="/">앱으로 이동 →</a></p>');
      }
      var rdb = await nf('databases', 'POST', {
        parent: { type: 'page_id', page_id: parentR },
        icon: { type: 'emoji', emoji: '🗂️' },
        title: [{ type: 'text', text: { content: '루틴 v2' } }],
        properties: {
          '이름':   { title: {} },
          '시각':   { date: {} },
          'CID':    { rich_text: {} },
          '메모':   { rich_text: {} },
          '요약':   { rich_text: {} },
          '데이터': { rich_text: {} }
        }
      });
      return html(res,
        '<h2>✅ 노션에 "루틴 v2" DB가 생성됐습니다</h2>' +
        '<p>Vercel의 <b>Settings → Environment Variables</b>에 <code>ROUTINE_DATABASE_ID</code>를 아래 값으로 추가하고 <b>Redeploy</b> 하세요.</p>' +
        '<p style="background:#f2f2f2; padding:12px; border-radius:8px; word-break:break-all"><code>' + rdb.id + '</code></p>' +
        '<p><a href="' + rdb.url + '" target="_blank">노션에서 DB 확인 →</a></p>');
    }

    if (process.env.DATABASE_ID && !req.query.force) {
      return html(res, '<h2>이미 DATABASE_ID가 등록되어 있습니다</h2>' +
        '<p>새 v2 DB를 만들려면 주소 뒤에 <code>&force=1</code>을 붙여 다시 접속하세요.</p><p><a href="/">앱으로 이동 →</a></p>');
    }
    var parent = normId(process.env.PARENT_PAGE_ID);
    if (!parent) {
      return html(res, '<h2>설정 필요</h2><p><code>PARENT_PAGE_ID</code> 환경 변수를 먼저 추가하세요. (노션 페이지 URL을 그대로 붙여넣어도 됩니다)</p>');
    }

    var db = await nf('databases', 'POST', {
      parent: { type: 'page_id', page_id: parent },
      icon: { type: 'emoji', emoji: '🏋️' },
      title: [{ type: 'text', text: { content: '운동 기록 v2' } }],
      properties: {
        '이름':   { title: {} },
        '날짜':   { date: {} },
        '슬롯':   { select: { options: [
          { name: '05시', color: 'blue' }, { name: '07시', color: 'purple' },
          { name: '오전', color: 'green' }, { name: '12시', color: 'yellow' },
          { name: '16시', color: 'pink' }, { name: '19시', color: 'orange' },
          { name: '기타', color: 'gray' }
        ]}},
        '종목':   { select: { options: [
          { name: '리프팅', color: 'orange' }, { name: '러닝', color: 'blue' },
          { name: '축구', color: 'green' },    { name: '풋살', color: 'yellow' },
          { name: '볼마스터리', color: 'brown' }, { name: '아킬레스', color: 'purple' },
          { name: '코어', color: 'pink' },     { name: '가동성', color: 'default' },
          { name: '반응', color: 'red' },      { name: '기타', color: 'gray' }
        ]}},
        '유형':   { select: { options: [
          { name: '존2', color: 'blue' }, { name: '템포', color: 'orange' },
          { name: '인터벌', color: 'red' }, { name: '대회', color: 'purple' },
          { name: '회복', color: 'gray' }
        ]}},
        '블록':   { select: { options: [
          { name: '근비대', color: 'green' }, { name: '근력', color: 'orange' },
          { name: '피킹', color: 'red' }, { name: '유지', color: 'gray' },
          { name: '베이스', color: 'blue' }, { name: '빌드', color: 'purple' }
        ]}},
        '세부':   { rich_text: {} },
        '볼륨kg': { number: {} },
        '거리km': { number: {} },
        '시간분': { number: {} },
        '페이스': { rich_text: {} },
        'RPE':    { number: {} },
        '메모':   { rich_text: {} },
        '원본':   { rich_text: {} }
      }
    });

    return html(res,
      '<h2>✅ 노션에 "운동 기록 v2" DB가 생성됐습니다</h2>' +
      '<p>Vercel의 <b>Settings → Environment Variables</b>에서 <code>DATABASE_ID</code> 값을 아래로 교체하고 <b>Redeploy</b> 하세요.</p>' +
      '<p style="background:#f2f2f2; padding:12px; border-radius:8px; word-break:break-all"><code>' + db.id + '</code></p>' +
      '<p><a href="' + db.url + '" target="_blank">노션에서 DB 확인 →</a></p>');
  } catch (e) {
    return res.status(500).send('오류: ' + e.message);
  }
};

function html(res, body) {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  return res.status(200).send('<meta charset="utf-8"><body style="font-family:sans-serif; max-width:560px; margin:40px auto; line-height:1.7">' + body + '</body>');
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
