/// <reference types="vite/client" />

declare namespace NodeJS {
  interface ProcessEnv {
    [key: string]: string | undefined;
  }
}

declare let process: {
  env: NodeJS.ProcessEnv;
};
