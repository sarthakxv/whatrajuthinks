import { resolve } from "node:path";
import { createStore, type Store } from "./store.mjs";
import { createApi } from "./api.ts";

// Next.js development reloads route modules; keep one SQLite connection and generation lock per process.
const globalState = globalThis as typeof globalThis & {
  rajuStore?: Store;
  rajuReportLocks?: Set<string>;
};
let apiHandler: ReturnType<typeof createApi> | undefined;

export async function handleApi(request: Request): Promise<Response> {
  if (!apiHandler) {
    const path = process.env.DATA_PATH ?? resolve(process.cwd(), "data/app.sqlite");
    if (globalState.rajuStore && !globalState.rajuStore.deleteJob) {
      // Hot reload keeps older store objects; upgrade in place for existing workers.
      const refreshed = createStore(path);
      globalState.rajuStore.close();
      Object.assign(globalState.rajuStore, refreshed);
    }
    globalState.rajuStore ??= createStore(path);
    globalState.rajuReportLocks ??= new Set<string>();
    apiHandler = createApi({
      store: globalState.rajuStore,
      busy: globalState.rajuReportLocks,
    });
  }
  return apiHandler(request);
}
