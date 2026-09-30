// For provider APIs that expose callbacks but no AbortSignal.
export function latestRequest() {
  let version = 0;
  return {
    start() {
      const current = ++version;
      return (commit: () => void) => {
        if (current === version) commit();
      };
    },
    cancel() { version++; },
  };
}
