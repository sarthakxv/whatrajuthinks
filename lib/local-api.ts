import { resolve } from "node:path";
import { createStore, type Store } from "./store.mjs";
import { createApi } from "./api";

// Next.js development reloads route modules; keep one SQLite connection and generation lock per process.
const globalState = globalThis as typeof globalThis & {
  rajuStore?: Store;
  rajuReportLocks?: Set<string>;
};
let apiHandler: ReturnType<typeof createApi> | undefined;

export async function handleApi(request: Request): Promise<Response> {
  if (!apiHandler) {
    globalState.rajuStore ??= createStore(
      process.env.DATA_PATH ?? resolve(process.cwd(), "data/app.sqlite"),
    );
    globalState.rajuReportLocks ??= new Set<string>();
    apiHandler = createApi({
      store: globalState.rajuStore,
      busy: globalState.rajuReportLocks,
    });
  }
  return apiHandler(request);
}
