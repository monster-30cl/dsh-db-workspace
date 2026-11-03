import { createPublicKey, publicEncrypt, randomBytes, createCipheriv, constants } from 'node:crypto'

/** Validate a one-use browser public key before starting any interactive authentication. */
export function revealKey(request) {
  if (!request || typeof request.challenge !== 'string' || !/^[a-f0-9]{32}$/u.test(request.challenge)) throw new Error('无效的安全查看请求。')
  const key = createPublicKey({ key: request.publicKey, format: 'jwk' })
  if (key.asymmetricKeyType !== 'rsa' || key.asymmetricKeyDetails.modulusLength !== 2048 || request.publicKey?.d) throw new Error('无效的安全查看密钥。')
  return key
}

/** Only ciphertext may travel over the command bridge (whose results are logged). */
export function encryptPassword(password, key, challenge) {
  const secret = randomBytes(32), iv = randomBytes(12)
  try {
    const cipher = createCipheriv('aes-256-gcm', secret, iv)
    cipher.setAAD(Buffer.from(challenge))
    const data = Buffer.concat([cipher.update(password, 'utf8'), cipher.final(), cipher.getAuthTag()])
    return {
      challenge,
      wrappedKey: publicEncrypt({ key, padding: constants.RSA_PKCS1_OAEP_PADDING, oaepHash: 'sha256' }, secret).toString('base64'),
      iv: iv.toString('base64'), data: data.toString('base64'),
    }
  } finally { secret.fill(0) }
}
