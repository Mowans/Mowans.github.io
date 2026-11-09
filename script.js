(() => {
  'use strict';
  const root = document.documentElement;
  const languageButton = document.querySelector('.language-toggle');
  const menuButton = document.querySelector('.menu-toggle');
  const mobileNav = document.querySelector('#mobile-nav');
  const filterStatus = document.querySelector('#filter-status');
  const filters = [...document.querySelectorAll('[data-filter]')];
  const projects = [...document.querySelectorAll('.research-item')];
  let activeFilter = 'all';

  function setMenu(open) {
    menuButton.setAttribute('aria-expanded', String(open));
    mobileNav.hidden = !open;
    menuButton.setAttribute('aria-label', root.lang === 'zh-CN'
      ? (open ? '关闭导航' : '打开导航')
      : (open ? 'Close navigation' : 'Open navigation'));
  }

  function announceResults() {
    const count = projects.filter(project => !project.hidden).length;
    filterStatus.textContent = root.lang === 'zh-CN' ? `显示 ${count} 项研究` : `Showing ${count} research projects`;
  }

  function setLanguage(language, persist = true) {
    root.lang = language;
    languageButton.setAttribute('aria-label', language === 'en' ? '切换到中文' : 'Switch to English');
    document.title = language === 'en' ? 'Junyao Huang | 黄俊尧' : '黄俊尧 | Junyao Huang';
    document.querySelector('meta[name="description"]').content = language === 'en'
      ? 'Junyao Huang (黄俊尧), master’s student at SUSTech. Research in robot learning, event-based vision, embodied intelligence, and safe planning.'
      : '黄俊尧，南方科技大学控制科学与工程硕士在读。研究方向包括机器人学习、事件视觉、具身智能与安全规划。';
    document.querySelector('.research-filters').setAttribute('aria-label', language === 'en' ? 'Filter research by topic' : '按研究主题筛选');
    setMenu(menuButton.getAttribute('aria-expanded') === 'true');
    announceResults();
    if (persist) {
      try { localStorage.setItem('junyao-language', language); } catch { /* Private browsing and file URLs may restrict storage. */ }
      // Keep explicitly shared language links consistent after a manual switch.
      if (location.protocol !== 'file:') {
        const url = new URL(location.href);
        if (url.searchParams.has('lang')) {
          url.searchParams.set('lang', language === 'zh-CN' ? 'zh' : 'en');
          history.replaceState(null, '', url);
        }
      }
    }
  }

  // English is the default for international academic readers; respect an explicit URL or saved choice.
  const requested = new URLSearchParams(location.search).get('lang');
  let stored;
  try { stored = localStorage.getItem('junyao-language'); } catch { /* Content remains usable without storage. */ }
  setLanguage(requested === 'zh' || requested === 'zh-CN' ? 'zh-CN' : requested === 'en' ? 'en' : stored === 'zh-CN' ? 'zh-CN' : 'en', false);
  languageButton.addEventListener('click', () => setLanguage(root.lang === 'en' ? 'zh-CN' : 'en'));

  filters.forEach(button => button.addEventListener('click', () => {
    activeFilter = button.dataset.filter;
    filters.forEach(filter => filter.setAttribute('aria-pressed', String(filter === button)));
    projects.forEach(project => {
      project.hidden = activeFilter !== 'all' && !project.dataset.topics.split(' ').includes(activeFilter);
      if(project.hidden) project.querySelectorAll('video').forEach(video=>video.pause());
    });
    announceResults();
  }));

  const projectVideos=[...document.querySelectorAll('.project-video video')];
  projectVideos.forEach(video=>video.addEventListener('play',()=>{
    projectVideos.forEach(other=>{if(other!==video)other.pause();});
  }));

  menuButton.addEventListener('click', () => setMenu(menuButton.getAttribute('aria-expanded') !== 'true'));
  mobileNav.querySelectorAll('a').forEach(link => link.addEventListener('click', () => setMenu(false)));
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !mobileNav.hidden) { setMenu(false); menuButton.focus(); }
  });
  const wideScreen = matchMedia('(min-width: 641px)');
  wideScreen.addEventListener('change', event => { if (event.matches) setMenu(false); });
  document.querySelector('#year').textContent = String(new Date().getFullYear());

  if ('IntersectionObserver' in window) {
    const navLinks = [...document.querySelectorAll('.desktop-nav a')];
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        navLinks.forEach(link => {
          if (link.hash === `#${entry.target.id}`) link.setAttribute('aria-current', 'location');
          else link.removeAttribute('aria-current');
        });
      });
    }, { rootMargin: '-15% 0px -65% 0px', threshold: 0 });
    document.querySelectorAll('main section[id]').forEach(section => observer.observe(section));
  }
})();
