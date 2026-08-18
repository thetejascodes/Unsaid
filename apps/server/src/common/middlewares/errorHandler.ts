import type { Request, Response, NextFunction } from 'express';
import ApiError from '../utils/api-error.js';

export interface CustomError extends Error {
    statusCode: number;
    code?: string;
}

const errorHandler = (err: CustomError, req: Request, res: Response, next: NextFunction) => {
    console.error(err);

    if (err instanceof ApiError) {
        return res.status(err.statusCode).json({
            status: 'error',
            message: err.message,
            data: null
        })
    }
    if (err.code === '23505') {
        return res.status(409).json({
            status: 'error',
            message: 'A record with this value already exists',
            data: null,
        });
    }

    if (err.code === '23503') {
        return res.status(400).json({
            status: 'error',
            message: 'Related record not found',
            data: null,
        });
    }

    if (err.name === 'JsonWebTokenError') {
        return res.status(401).json({
            status: 'error',
            message: 'Invalid token',
            data: null,
        });
    }

    if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
            status: 'error',
            message: 'Token expired',
            data: null,
        });
    }

    return res.status(err.statusCode || 500).json({
        status: 'error',
        message: err.statusCode ? err.message : 'Internal Server Error',
        data: null,
    });

}

export default errorHandler;