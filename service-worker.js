const CACHE_NAME = 'coordinate-map-cache-v1';
const urlsToCache = [
  './', // index.htmlを指す
  'GeoLinkNavi_Ver.1.html', // 実際にご自身のHTMLファイル名に合わせる
  'manifest.json',
  // LeafletのCSSとJS (CDNからの取得なのでキャッシュは難しいが、一応含めるか、削除も検討)
  'https://unpkg.com/leaflet/dist/leaflet.css',
  'https://unpkg.com/leaflet/dist/leaflet.js',
  // アイコン画像 (例: icons/icon-192x192.png, icons/icon-512x512.png)
  // 必要であれば追加
  'icons/icon-192x192.png',
  'icons/icon-512x512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        // network-onlyリソース(CDNのLeafletなど)が原因でインストールが失敗しないよう、失敗しにくいurlsToCacheを検討する
        // 現状のままCDNをurlsToCacheに含めると、CDNのサーバーが一時的に落ちている場合にPWAインストールが失敗する可能性がある
        // もしCDNをurlsToCacheに含める場合は、`cache.addAll()`の代わりに`Promise.all(urlsToCache.map(...))`で個別にfetchして、
        // 失敗しても全体が失敗しないようにするなどの工夫が必要。
        // シンプルなPWAでは、CDNの外部リソースはurlsToCacheから除外し、ネットワークから常に取得させる方が安全。
        // ここでは一旦CDNはそのままにしておきますが、問題が発生した場合はCDNをurlsToCacheから削除してみてください。
        return cache.addAll(urlsToCache.filter(url => !url.startsWith('http'))); // ローカルファイルのみキャッシュに加える場合の例
      })
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response;
        }
        return fetch(event.request).then(
          response => {
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            const responseToCache = response.clone();
            // CDNのアセットはキャッシュしない（urlsToCacheから除外した場合）
            if (!event.request.url.startsWith('http') && urlsToCache.includes(event.request.url.replace(self.location.origin, './'))) {
               caches.open(CACHE_NAME)
                 .then(cache => {
                   cache.put(event.request, responseToCache);
                 });
            }
            return response;
          }
        );
      })
  );
});

self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});