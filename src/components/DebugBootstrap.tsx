"use client";

import { useEffect } from "react";
import { triggerDebuggerListeners } from "@/utils/debug";

export function DebugBootstrap() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    console.info(
      "%c TECHZJC %c Commit %s · Built %s",
      "background: #2181c2; color: #fff; padding: 2px 4px; border-radius: 3px;",
      "color: inherit;",
      process.env.NEXT_PUBLIC_COMMIT_SHA,
      process.env.NEXT_PUBLIC_BUILD_TIME,
    );

    if (process.env.NEXT_PUBLIC_VERCEL_ENV === "true") {
      console.log(
        "%c ▲ Deployed on Vercel ",
        "color: white; background: black; padding: 4px; border-radius: 4px;"
      );
    }

    if (localStorage.getItem("start-debug-listener") === "true") {
      localStorage.removeItem("start-debug-listener");
    }

    triggerDebuggerListeners();

    if (localStorage.getItem("enable-debug") === "true") {
      void Promise.all([
        import("figlet"),
        import("figlet/fonts/Larry 3D"),
        import("figlet/fonts/Standard"),
        import("vconsole"),
      ]).then(([{ default: figlet }, { default: Larry3D }, { default: Standard }, { default: VConsole }]) => {
          figlet.parseFont("Larry3D", Larry3D);
          figlet.parseFont("Standard", Standard);
          const fontToUse = window.innerWidth < 600 ? "Standard" : "Larry3D";
          const vConsole = new VConsole();
          const vercelBuild = process.env.NEXT_PUBLIC_VERCEL_ENV === "true"
            ? "\n▲ Deployed on Vercel"
            : "";

          vConsole.log.log(
            figlet.textSync("TECHZJC", { font: fontToUse }) +
              "\nCommit: " + process.env.NEXT_PUBLIC_COMMIT_SHA +
              "\n</> React + TypeScript\n" +
              "Build at: " + process.env.NEXT_PUBLIC_BUILD_TIME +
              vercelBuild,
          );
        }).catch((error) => {
          if (process.env.NODE_ENV === "development") {
            console.warn("Failed to load the optional debug console.", error);
          }
        });
    }
  }, []);

  return null;
}
