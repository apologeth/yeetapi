export function shamirKeyToReadableString(shamirKey: Uint8Array) {
  return shamirKey.toString();
}

export function shamirKeyFromReadableString(shamirKeyString: string) {
  return Uint8Array.from(shamirKeyString.split(',').map((v) => Number(v)));
}
