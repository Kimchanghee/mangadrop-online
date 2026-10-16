/* Analytics-only opt-in; deliberately NOT an advertising CMP. */
(() => {
  const id = document.currentScript?.dataset.ga4Id;
  if (!/^G-[A-Z0-9]+$/.test(id || '')) return;
  const key = 'mangadrop.analytics.v1';
  const disable = 'ga-disable-' + id;
  let choice = 'denied';
  let loaded = false;
  let saved = false;
  // Only restore consent when storage is writable, so a failed withdrawal cannot restore stale acceptance.
  const read = () => { try { const value = localStorage.getItem(key); if (value !== null) localStorage.setItem(key, value); return value; } catch { return null; } };
  const status = document.getElementById('analytics-status');
  const options = document.getElementById('analytics-options');
  const change = document.getElementById('analytics-change');
  window[disable] = true;
  function clearCookies() {
    const names = ['_ga', '_ga_' + id.slice(2)];
    const parts = location.hostname.split('.');
    const domains = ['', location.hostname];
    for (let i = 0; i < parts.length - 1; i++) domains.push('.' + parts.slice(i).join('.'));
    const paths = new Set(['/']);
    let p = '';
    for (const segment of location.pathname.split('/').filter(Boolean)) { p += '/' + segment; paths.add(p); paths.add(p + '/'); }
    for (const name of names) for (const domain of domains) for (const path of paths) {
      document.cookie = name + '=; Max-Age=0; path=' + path + (domain ? '; domain=' + domain : '') + '; SameSite=Lax';
    }
  }
  function render() {
    status.textContent = (choice === 'granted' ? '현재 분석 허용' : '현재 분석 꺼짐') + (saved ? ' · 이 브라우저에 선택을 저장했습니다.' : ' · 선택을 저장하지 못하면 다음 방문에 다시 묻습니다.');
    options.hidden = true; change.hidden = false; change.setAttribute('aria-expanded', 'false');
  }
  function start() {
    if (loaded || choice !== 'granted') return;
    loaded = true; window[disable] = false;
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { if (choice === 'granted') window.dataLayer.push(arguments); };
    window.gtag('consent', 'default', { analytics_storage: 'denied', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' });
    window.gtag('consent', 'update', { analytics_storage: 'granted', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' });
    window.gtag('js', new Date());
    window.gtag('config', id, { allow_google_signals: false, allow_ad_personalization_signals: false });
    const script = document.createElement('script'); script.async = true;
    script.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(id);
    document.head.appendChild(script);
  }
  function choose(value) {
    choice = value;
    try { localStorage.setItem(key, value); saved = true; } catch { saved = false; }
    if (value === 'granted') start();
    else {
      window[disable] = true;
      window.gtag = function () {};
      clearCookies();
      // Unload Google's code and automatic event handlers. No consent-update ping on withdrawal.
      if (loaded) { location.reload(); return; }
    }
    render(); change.focus();
  }
  const previous = read();
  if (previous === 'granted' || previous === 'denied') { choice = previous; saved = true; render(); }
  if (choice === 'granted') start(); else clearCookies();
  document.getElementById('analytics-accept').addEventListener('click', () => choose('granted'));
  document.getElementById('analytics-decline').addEventListener('click', () => choose('denied'));
  change.addEventListener('click', () => { options.hidden = !options.hidden; change.setAttribute('aria-expanded', String(!options.hidden)); if (!options.hidden) document.getElementById('analytics-accept').focus(); });
  window.addEventListener('storage', (e) => { if (e.key === key || e.key === null) { if (read() !== 'granted') { choice = 'denied'; window[disable] = true; window.gtag = function () {}; clearCookies(); } location.reload(); } });
  document.addEventListener('click', (e) => {
    const a = e.target?.closest?.('a[data-product-link]');
    if (!a || choice !== 'granted' || window[disable]) return;
    let host = ''; try { host = new URL(a.href).host; } catch { return; }
    window.gtag('event', 'outbound_affiliate_click', { destination_host: host, link_slot: a.getAttribute('data-product-link') });
  });
})();
