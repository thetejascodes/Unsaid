import jwt, { type SignOptions } from 'jsonwebtoken'
import { config } from '../config/index.js'

export const generateAccessToken = (payload: { userId: string }) => {
  const options: SignOptions = {
    expiresIn: config.jwt.accessExpiresIn as NonNullable<SignOptions['expiresIn']>,
  }
  return jwt.sign(payload, config.jwt.accessSecret, options)
}

export const verifyAccessToken = (token: string) => {
  return jwt.verify(token, config.jwt.accessSecret)
}

export const generateRefreshToken = (payload: { userId: string }) => {
  const options: SignOptions = {
    expiresIn: config.jwt.refreshExpiresIn as NonNullable<SignOptions['expiresIn']>,
  }
  return jwt.sign(payload, config.jwt.refreshSecret, options)
}

export const verifyRefreshToken = (token: string) => {
  return jwt.verify(token, config.jwt.refreshSecret)
}