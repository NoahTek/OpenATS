import "@testing-library/jest-dom/vitest";

// Ensure localStorage is functional in jsdom under Node 24+ where experimental global localStorage can be undefined
if (typeof window !== "undefined") {
  const store = new Map<string, string>();
  const localStorageMock: Storage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => store.set(key, String(value)),
    removeItem: (key: string) => { store.delete(key); },
    clear: () => store.clear(),
    get length() { return store.size; },
    key: (index: number) => Array.from(store.keys())[index] ?? null,
  };
  Object.defineProperty(window, "localStorage", { value: localStorageMock, configurable: true, writable: true });
  Object.defineProperty(globalThis, "localStorage", { value: localStorageMock, configurable: true, writable: true });
}
