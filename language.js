// The visitor's explicit choice takes priority over IP geolocation.
const key = 'christmas2026.language';
const valid = value => value === 'vi' || value === 'en';
const read = (storage, name) => { try { return window[storage].getItem(name); } catch { return null; } };
const write = (storage, name, value) => { try { window[storage].setItem(name, value); } catch {} };
const current = document.documentElement.lang;
const query = new URL(location.href).searchParams.get('lang');
let chosen = false;
document.querySelectorAll('[data-lang]').forEach(link => {
  link.setAttribute('aria-label', link.dataset.lang === 'vi' ? 'Tiếng Việt' : 'English');
  if (link.dataset.lang === current) link.setAttribute('aria-current', 'true');
  link.addEventListener('click', () => {
    chosen = true;
    write('localStorage', key, link.dataset.lang);
  });
});
async function resolveLanguage() {
  if (valid(query)) { write('localStorage', key, query); return query; }
  const saved = read('localStorage', key);
  if (valid(saved)) return saved;
  // An explicit English page URL is also shareable without geolocation.
  if (location.pathname.endsWith('/en.html')) return 'en';
  const cached = read('sessionStorage', key + '.auto');
  if (valid(cached)) return cached;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 2500);
  try {
    const response = await fetch('https://api.country.is/', {
      signal: controller.signal, credentials: 'omit', referrerPolicy: 'no-referrer'
    });
    if (!response.ok) throw new Error('Country lookup unavailable');
    const { country } = await response.json();
    if (!/^[A-Z]{2}$/.test(country)) throw new Error('Invalid country');
    const language = country === 'VN' ? 'vi' : 'en';
    write('sessionStorage', key + '.auto', language);
    return language;
  } catch { return 'en'; }
  finally { clearTimeout(timeout); }
}
const language = await resolveLanguage();
if (!chosen) {
  if (language !== current) {
    const destination = new URL(language === 'en' ? './en.html' : './', location.href);
    destination.search = location.search;
    destination.hash = location.hash;
    location.replace(destination.href);
  } else {
    try { await import(language === 'en' ? './bundle/english.js' : './bundle/index-O45g60J9.js'); }
    catch (error) {
      document.documentElement.classList.remove('gl');
      document.documentElement.classList.add('nogl');
      document.querySelector('#loader')?.remove();
      console.error(error);
    }
  }
}
