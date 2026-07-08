/* sw.js — 앱 셸 캐시: 오프라인에서도 앱이 열리게 (네트워크 우선, 실패 시 캐시)
   index.html과 같은 루트에 배포하세요. /api 요청은 건드리지 않습니다(앱의 오프라인 큐가 처리). */
var CACHE = 'wk2-shell-v1';
var SHELL = ['./', './index.html'];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE)
      .then(function (c) { return c.addAll(SHELL); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== CACHE; })
        .map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;                 /* POST(/api/save 등)는 통과 */
  var url = new URL(req.url);
  if (url.origin !== location.origin) return;
  if (url.pathname.indexOf('/api/') === 0) return;  /* API는 캐시 금지 */
  e.respondWith(
    fetch(req).then(function (r) {
      if (r && r.ok) {
        var cp = r.clone();
        caches.open(CACHE).then(function (c) { c.put(req, cp); });
      }
      return r;
    }).catch(function () {
      return caches.match(req, { ignoreSearch: true }).then(function (m) {
        if (m) return m;
        return caches.match('./index.html').then(function (m2) {
          return m2 || caches.match('./');
        });
      });
    })
  );
});
