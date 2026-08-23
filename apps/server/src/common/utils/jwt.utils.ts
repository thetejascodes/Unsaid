import jwt, { type SignOptions } from 'jsonwebtoken'
import config  from '../config/index.js'
import ApiError from './api-error.js'

export const generateAccessToken = (payload: { userId: string }) => {
  const options: SignOptions = {
    expiresIn: config.jwt.accessExpiresIn as NonNullable<SignOptions['expiresIn']>,
  }
  return jwt.sign(payload, config.jwt.accessSecret, options)
}

export const verifyAccessToken = (token: string) => {
  const payload = jwt.verify(token, config.jwt.accessSecret)
  if(typeof payload === 'string' || !('userId' in payload)){
        throw ApiError.internal("unexpected token payload")
  }
  return payload;
}

export const generateRefreshToken = (payload: { userId: string }) => {
  const options: SignOptions = {
    expiresIn: config.jwt.refreshExpiresIn as NonNullable<SignOptions['expiresIn']>,
  }
  return jwt.sign(payload, config.jwt.refreshSecret, options)
}

export const verifyRefreshToken = (token: string) => {
  const payload = jwt.verify(token, config.jwt.refreshSecret)
  if(typeof payload === "string" || !('userId' in payload)){
    throw ApiError.internal("unexpected token payload")
  }
  return payload;
}