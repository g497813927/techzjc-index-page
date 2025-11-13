import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import figlet from 'figlet'
import Larry3D from "figlet/fonts/Larry 3D";
import './main.css'

figlet.parseFont("Larry3D", Larry3D);

console.log(
  "%c" +
  figlet.textSync('TECHZJC', {
      font: 'Larry3D',
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

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
