/**
 * Inline script that applies the saved theme before first paint.
 * Lives in a plain module (no "use client") so the server bundle can
 * import it without pulling in the client ThemeProvider.
 */
export const themeInitScript = `try{var t=localStorage.getItem("wa:theme");if(!t){t=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";}if(t==="dark")document.documentElement.classList.add("dark");}catch(e){}`;
