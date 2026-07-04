// api/setup.js — 노션에 "운동 기록" DB를 새로 생성 (예비용)
// 이미 GAS에서 만든 DB를 쓴다면 이 함수는 실행할 필요 없음.
// 사용법: 브라우저에서  내주소.vercel.app/api/setup  접속
//         (APP_PIN 설정 시:  /api/setup?pin=1234 )
// 필요 환경 변수: NOTION_TOKEN, PARENT_PAGE_ID

var NOTION_VERSION = '2022-06-28';

module.exports = async function handler(req, res) {
  try {
    if (process.env.APP_PIN && String(req.query.pin || '') !== String(process.env.APP_PIN)) {
      return res.status(401).send('PIN이 필요합니다. 주소 뒤에 ?pin=설정한PIN 을 붙여 접속하세요.');
    }
    if (process.env.DATABASE_ID) {
      return html(res, '<h2>이미 설정 완료</h2><p>DATABASE_ID가 이미 등록되어 있습니다. <a href="/">앱으로 이동 →</a></p>');
    }
    if (!process.env.PARENT_PAGE_ID) {
      return html(res, '<h2>설정 필요</h2><p>PARENT_PAGE_ID 환경 변수를 먼저 추가하세요.</p>');
    }

    var db = await notionFetch('databases', 'POST', {
      parent: { type: 'page_id', page_id: process.env.PARENT_PAGE_ID.replace(/-/g, '').trim() },
      icon: { type: 'emoji', emoji: '🏋️' },
      title: [{ type: 'text', text: { content: '운동 기록' } }],
      properties: {
        '이름':   { title: {} },
        '날짜':   { date: {} },
        '종목':   { select: { options: [
          { name: '파워리프팅', color: 'red' }, { name: '러닝', color: 'blue' },
          { name: '풋살', color: 'yellow' },   { name: '축구', color: 'green' },
          { name: '아킬레스', color: 'purple' }, { name: '기타', color: 'gray' }
        ]}},
        '내용':   { rich_text: {} },
        'RPE':    { number: {} },
        '거리km': { number: {} },
        '시간분': { number: {} },
        '페이스': { rich_text: {} },
        '메모':   { rich_text: {} },
        '원본':   { rich_text: {} }
      }
    });

    return html(res,
      '<h2>✅ 노션에 "운동 기록" DB가 생성됐습니다</h2>' +
      '<p>Vercel의 <b>Settings → Environment Variables</b>에 아래 값을 등록하고 Redeploy 하세요.</p>' +
      '<p>이름: <code>DATABASE_ID</code><br>값:</p>' +
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
