/** Stand-in for TanStack Start's useServerFn: our "server functions" are plain async API calls. */
export const useServerFn = <F>(fn: F) => fn;
