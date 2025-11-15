"use client";

import { useEffect } from "react";
import { triggerDebuggerListeners } from "@/utils/debug";
import { execSync } from "child_process";
import figlet from 'figlet'
import Larry3D from "figlet/fonts/Larry 3D";
import Standard from "figlet/fonts/Standard";

export function DebugBootstrap() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    

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
      "%c Commit %c " + execSync('git rev-parse --short HEAD').toString().trim() + " %c %c </> %c React + TypeScript %c" +
      "color: #2181c2; font-weight: bold;",
      "color: transparent;",
      "background: #5c5c5c; padding: 1px; border-radius: 3px 0 0 3px; color: #FFFFFF",
      "background: #52BF04; padding: 1px; border-radius: 0 3px 3px 0; color: #FFFFFF",
      "background: transparent; padding: 1px;",
      "background: #5c5c5c; padding: 1px; border-radius: 3px 0 0 3px; color: #FFFFFF",
      "background: #2181c2; padding: 1px; border-radius: 0 3px 3px 0; color: #FFFFFF",
      "background: transparent;",
    )

    if (localStorage.getItem("start-debug-listener") === "true") {
      localStorage.removeItem("start-debug-listener");
    }

    triggerDebuggerListeners();

    if (localStorage.getItem("enable-debug") === "true") {
      import("vconsole").then(({ default: VConsole }) => {
        new VConsole();
      });
    }
  }, []);

  return null; // Just side-effects
}
