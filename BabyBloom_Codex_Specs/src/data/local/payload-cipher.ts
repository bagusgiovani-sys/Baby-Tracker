import type { PayloadCipher } from './sqlite-driver.ts';
const encode = (bytes: Uint8Array) => btoa(Array.from(bytes).map(byte => String.fromCharCode(byte)).join(''));
const decode = (value: string): Uint8Array<ArrayBuffer> => Uint8Array.from(atob(value), char => char.charCodeAt(0));
export function payloadCipher(key: CryptoKey): PayloadCipher {
    return {
        encrypt: async (value) => {
            const iv = crypto.getRandomValues(new Uint8Array(12));
            const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(value));
            return `enc1:${encode(iv)}:${encode(new Uint8Array(ciphertext))}`;
        },
        decrypt: async (value) => {
            const [version, iv, ciphertext, ...extra] = value.split(':');
            if (version !== 'enc1' || !iv || !ciphertext || extra.length)
                throw new Error('storage_error');
            const bytes = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: decode(iv) }, key, decode(ciphertext));
            return new TextDecoder().decode(bytes);
        },
    };
}
