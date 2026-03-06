/**
 * Workers 友好密码策略。
 *
 * WHAT: 为 Better Auth 提供自定义密码哈希/校验实现。
 * WHY: 默认 `scrypt` 在 Cloudflare Workers 免费 CPU 配额下容易触发超时，
 * 这里改用 Web Crypto `PBKDF2`，同时结合应用密钥作为 pepper，降低运行时 CPU 压力。
 */

const PASSWORD_SCHEME = 'pbkdf2_sha256';
const PASSWORD_ITERATIONS = 25_000;
const SALT_BYTES = 16;
const KEY_BYTES = 32;

const textEncoder = new TextEncoder();

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function fromHex(value: string): Uint8Array {
  if (value.length % 2 !== 0) {
    throw new Error('invalid hex payload');
  }

  const bytes = new Uint8Array(value.length / 2);
  for (let index = 0; index < value.length; index += 2) {
    bytes[index / 2] = Number.parseInt(value.slice(index, index + 2), 16);
  }
  return bytes;
}

function constantTimeEqual(left: Uint8Array, right: Uint8Array): boolean {
  if (left.length !== right.length) {
    return false;
  }

  let diff = 0;
  for (let index = 0; index < left.length; index += 1) {
    diff |= left[index] ^ right[index];
  }
  return diff === 0;
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return Uint8Array.from(bytes).buffer;
}

async function deriveKey(password: string, pepper: string, salt: Uint8Array, iterations: number) {
  // WHY: 迭代次数刻意控制在 Workers 友好区间，并使用 BETTER_AUTH_SECRET 作为 pepper，
  // 在接受较低 CPU 开销的同时，避免把安全性完全押在数据库中的单份哈希上。
  const keyMaterial = await globalThis.crypto.subtle.importKey(
    'raw',
    textEncoder.encode(`${password}\u0000${pepper}`),
    'PBKDF2',
    false,
    ['deriveBits']
  );

  const derivedBits = await globalThis.crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      hash: 'SHA-256',
      salt: toArrayBuffer(salt),
      iterations
    },
    keyMaterial,
    KEY_BYTES * 8
  );

  return new Uint8Array(derivedBits);
}

/**
 * 为 Better Auth 创建密码钩子。
 *
 * WHAT: 返回 `hash/verify` 两个回调，供 email/password 登录链路复用。
 * WHY: 将密码策略封装成闭包后，可直接复用 `BETTER_AUTH_SECRET` 作为 pepper。
 */
export function createWorkerFriendlyPasswordStrategy(pepper: string) {
  return {
    async hash(password: string) {
      const salt = globalThis.crypto.getRandomValues(new Uint8Array(SALT_BYTES));
      const derivedKey = await deriveKey(password, pepper, salt, PASSWORD_ITERATIONS);
      return `${PASSWORD_SCHEME}$${PASSWORD_ITERATIONS}$${toHex(salt)}$${toHex(derivedKey)}`;
    },
    async verify({ hash, password }: { hash: string; password: string }) {
      const [scheme, iterationsRaw, saltHex, digestHex] = hash.split('$');
      if (scheme !== PASSWORD_SCHEME || !iterationsRaw || !saltHex || !digestHex) {
        return false;
      }

      const iterations = Number.parseInt(iterationsRaw, 10);
      if (!Number.isFinite(iterations) || iterations <= 0) {
        return false;
      }

      try {
        const salt = fromHex(saltHex);
        const expectedDigest = fromHex(digestHex);
        const actualDigest = await deriveKey(password, pepper, salt, iterations);
        return constantTimeEqual(actualDigest, expectedDigest);
      } catch {
        return false;
      }
    }
  };
}
