const mockOpenDatabase = jest.fn();
const mockBrowserKey = jest.fn();
jest.mock('expo-sqlite', () => ({
  openDatabaseAsync: (...args: unknown[]) => mockOpenDatabase(...args),
}));
jest.mock('../src/data/local/browser-vault', () => ({
  browserKey: (...args: unknown[]) => mockBrowserKey(...args),
}));
jest.mock('expo-secure-store', () => ({
  getItemAsync: async () => 'a'.repeat(64),
}));

test('web storage shares an opening attempt, retries a rejection and reuses the successful encrypted driver', async () => {
  const isolation = Object.getOwnPropertyDescriptor(globalThis, 'crossOriginIsolated');
  const crypto = Object.getOwnPropertyDescriptor(globalThis, 'crypto');
  const locks = Object.getOwnPropertyDescriptor(navigator, 'locks');
  Object.defineProperty(globalThis, 'crossOriginIsolated', { configurable: true, value: true });
  Object.defineProperty(globalThis, 'crypto', { configurable: true, value: { subtle: {} } });
  Object.defineProperty(navigator, 'locks', { configurable: true, value: { request: jest.fn() } });
  try {
    mockBrowserKey.mockResolvedValue({});
    mockOpenDatabase
      .mockRejectedValueOnce(new Error('Synthetic transient SQLite failure'))
      .mockResolvedValue({});
    const { openLocal } = require('../src/data/local/open.web');
    const first = openLocal();
    const concurrent = openLocal();
    expect(first).toBe(concurrent);
    await expect(first).rejects.toThrow('Synthetic transient SQLite failure');
    const recovered = await openLocal();
    expect(typeof recovered.transaction).toBe('function');
    expect(await openLocal()).toBe(recovered);
    expect(mockOpenDatabase).toHaveBeenCalledTimes(2);
    expect(mockBrowserKey).toHaveBeenCalledWith('local-v1');
  } finally {
    for (const [target, key, descriptor] of [
      [globalThis, 'crossOriginIsolated', isolation],
      [globalThis, 'crypto', crypto],
      [navigator, 'locks', locks],
    ] as const) {
      if (descriptor) Object.defineProperty(target, key, descriptor);
      else Reflect.deleteProperty(target, key);
    }
  }
});

test('native storage retries an opening failure while still requiring SQLCipher', async () => {
  mockOpenDatabase
    .mockReset()
    .mockRejectedValueOnce(new Error('Synthetic native opening failure'))
    .mockResolvedValue({
      execAsync: async () => {},
      getFirstAsync: async () => ({ cipher_version: 'synthetic-cipher' }),
    });
  const { openLocal } = require('../src/data/local/open');
  await expect(openLocal()).rejects.toThrow('Synthetic native opening failure');
  const recovered = await openLocal();
  expect(await openLocal()).toBe(recovered);
  expect(mockOpenDatabase).toHaveBeenCalledTimes(2);
});
