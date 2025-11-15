// Clear the flag to avoid multiple triggers
if (localStorage.getItem('start-debug-listener') === 'true') {
  localStorage.removeItem('start-debug-listener');
}

import { triggerDebuggerListeners } from './utils.ts';
triggerDebuggerListeners();


if (localStorage.getItem('enable-debug') === 'true') {
  const { default: VConsole } = await import('vconsole');
  new VConsole();
}

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import figlet from 'figlet'
import Larry3D from "figlet/fonts/Larry 3D";
import Standard from "figlet/fonts/Standard";

figlet.parseFont("Larry3D", Larry3D);
figlet.parseFont("Standard", Standard);

const fontToUse = window.innerWidth < 600 ? "Standard" : "Larry3D";

console.log(
  "%c" +
  figlet.textSync('TECHZJC', {
      font: fontToUse
    }
  ) + 
  "%c\n" +
  "%c Commit %c " + __GIT_COMMIT__ + " %c %c </> %c React + TypeScript %c\n\n" +
  "%c Build at %c " + __COMPILE_TIME__ + " %c",
  "color: #2181c2; font-weight: bold;",
  "color: transparent;",
  "background: #5c5c5c; padding: 1px; border-radius: 3px 0 0 3px; color: #FFFFFF",
  "background: #52BF04; padding: 1px; border-radius: 0 3px 3px 0; color: #FFFFFF",
  "background: transparent; padding: 1px;",
  "background: #5c5c5c; padding: 1px; border-radius: 3px 0 0 3px; color: #FFFFFF",
  "background: #2181c2; padding: 1px; border-radius: 0 3px 3px 0; color: #FFFFFF",
  "background: transparent;",
  "background: #5c5c5c; padding: 1px; border-radius: 3px 0 0 3px; color: #FFFFFF",
  "background: #F2B544; padding: 1px; border-radius: 0 3px 3px 0; color: #FFFFFF",
  "background: transparent; padding: 1px;"
)

if (localStorage.getItem('i-wanna-go-back') === '1') {
  // Load the old html version of the site
  const { legacyHTML } = await import('./legacy.ts');
  createRoot(document.getElementsByTagName('body')[0]!).render(
    <span dangerouslySetInnerHTML={{ __html: legacyHTML }} />
  )
}  else {
  await import('./main.css');
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>
  )
}
