// The script that sets the theme on <html> before first paint (in the root layout's <head>):
// System follows the device's light/dark setting, live; Dark and Light are fixed. Also sets
// the browser's theme colour to match. Not a client module, so the layout gets the string.
export const THEME_KEY = "sicko:theme";
const GROUND = { dark: "#0d0d0e", light: "#f2f2f4" };

export const THEME_SCRIPT = `(function(){try{var d=document.documentElement,m=window.matchMedia('(prefers-color-scheme: light)');function a(){var t=localStorage.getItem('${THEME_KEY}')||'system';var r=t==='system'?(m.matches?'light':'dark'):t;d.dataset.theme=r;var c=document.querySelector('meta[name=theme-color]');if(c)c.setAttribute('content',r==='light'?'${GROUND.light}':'${GROUND.dark}');}a();document.addEventListener('DOMContentLoaded',a);m.addEventListener('change',a);window.__sickoTheme=a;}catch(e){}})();`;
