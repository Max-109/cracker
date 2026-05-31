import { describe, expect, test } from 'bun:test';
import {
  decryptContent,
  decryptDek,
  encryptContent,
  encryptDek,
  generateDek,
} from './encryption.ts';

describe('chat encryption', () => {
  test('encrypts and decrypts chat content', () => {
    const dek = generateDek();
    const content = {
      role: 'user',
      parts: [{ type: 'text', text: 'hello from cracker' }],
    };

    const encrypted = encryptContent(content, dek);

    expect(encrypted).toStartWith('enc:');
    expect(encrypted).not.toContain('hello from cracker');
    expect(decryptContent(encrypted, dek)).toEqual(content);
  });

  test('returns plaintext legacy content unchanged', () => {
    const dek = generateDek();
    const legacy = { role: 'assistant', content: 'old message' };

    expect(decryptContent(legacy, dek)).toEqual(legacy);
  });

  test('decrypts encrypted data keys', () => {
    const dek = generateDek();
    const kek = generateDek();

    const encryptedDek = encryptDek(dek, kek);

    expect(encryptedDek).not.toEqual(dek.toString('base64'));
    expect(decryptDek(encryptedDek, kek)).toEqual(dek);
  });

  test('rejects tampered encrypted content', () => {
    const dek = generateDek();
    const encrypted = encryptContent({ message: 'do not change' }, dek);
    const payload = Buffer.from(encrypted.slice('enc:'.length), 'base64');
    payload[payload.length - 1] ^= 1;
    const tampered = `enc:${payload.toString('base64')}`;

    expect(() => decryptContent(tampered, dek)).toThrow();
  });
});
