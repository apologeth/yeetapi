import { combine } from 'shamir-secret-sharing';
import NotFoundError from '../errors/not-found';
import { notNull } from './assert';
import { decryptFromKMS } from './kms';

export function shamirKeyToReadableString(shamirKey: Uint8Array) {
  return shamirKey.toString();
}

export function shamirKeyFromReadableString(shamirKeyString: string) {
  return Uint8Array.from(shamirKeyString.split(',').map((v) => Number(v)));
}

export async function recoverPrivateKey(
  encryptedShard: string,
  anotherShard: string,
) {
  const decoder = new TextDecoder();
  const _shardKMS = await decryptFromKMS(encryptedShard);
  notNull(new NotFoundError('shard key not found'), _shardKMS);
  const shardKMS = shamirKeyFromReadableString(_shardKMS!);
  const secondShareKey = shamirKeyFromReadableString(anotherShard);
  const combined = await combine([shardKMS, secondShareKey]);

  return decoder.decode(combined);
}
