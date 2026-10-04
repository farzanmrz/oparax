// Applied before paint so screenshots are deterministic: ?theme=light|dark first, then the stored choice, default dark.
export const THEME_KEY = "oparax-sonnet-theme";
export const themeScript = `(function(){try{var q=new URLSearchParams(location.search).get('theme');var t=(q==='light'||q==='dark')?q:localStorage.getItem('${THEME_KEY}');document.documentElement.dataset.theme=t==='light'?'light':'dark'}catch(e){document.documentElement.dataset.theme='dark'}})()`;
