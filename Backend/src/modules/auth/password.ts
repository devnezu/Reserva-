import { hash, verify, argon2id } from 'argon2'

export const hashPassword = (password: string) => hash(password, { type: argon2id, memoryCost: 19456, timeCost: 2, parallelism: 1 })
export const verifyPassword = (encoded: string, password: string) => verify(encoded, password)

// Unknown emails still perform Argon2 verification, avoiding a cheap timing oracle.
let dummyHash: Promise<string> | undefined
export const getDummyHash = () => dummyHash ??= hashPassword('unavailable-account-dummy-password')
