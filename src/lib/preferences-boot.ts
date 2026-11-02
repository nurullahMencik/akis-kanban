// Server-safe module (no React imports): shared by the root layout and the preferences store.
export const THEME_STORAGE_KEY = "akis-theme";
export const LOCALE_STORAGE_KEY = "akis-locale";

/** Runs before first paint (inlined in <head>) so the page never flashes the wrong theme. */
export const PREFERENCES_BOOT_SCRIPT = `(function(){try{var d=document.documentElement,t=localStorage.getItem("${THEME_STORAGE_KEY}"),l=localStorage.getItem("${LOCALE_STORAGE_KEY}");var k=t==="dark"||t==="light"?t:(matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light");d.dataset.theme=k;if(l==="en")d.lang="en";}catch(e){}})();`;
