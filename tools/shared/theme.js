(function(){
  if (window.PonytailTheme) return;
  const THEME_KEY = 'tcdRaingutterTheme';
  function setIcons(theme){
    document.querySelectorAll('.icon-moon').forEach(i=>{ i.style.display = theme === 'dark' ? 'none' : 'block'; });
    document.querySelectorAll('.icon-sun').forEach(i=>{ i.style.display = theme === 'dark' ? 'block' : 'none'; });
  }
  window.PonytailTheme = {
    applyTheme(theme){
      document.documentElement.classList.remove('light','dark');
      document.documentElement.classList.add(theme);
      try { localStorage.setItem(THEME_KEY, theme); } catch(e){}
      setIcons(theme);
      window.dispatchEvent(new CustomEvent('themeChanged',{detail:{theme}}));
    },
    toggleTheme(){
      const cur = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
      this.applyTheme(cur === 'light' ? 'dark' : 'light');
    },
    init(){
      const preferred = (function(){
        try { return localStorage.getItem(THEME_KEY); } catch(e) { return null; }
      })() || (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
      this.applyTheme(preferred);
    }
  };
})();
