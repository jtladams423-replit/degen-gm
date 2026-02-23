import { type Request, Response, NextFunction } from "express";
import { type ZodSchema, ZodError } from "zod";
import crypto from "crypto";
import { logger } from "./logger";

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode: number, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class ValidationError extends AppError {
  public readonly details: string[];

  constructor(message: string, details: string[] = []) {
    super(message, 400);
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Resource not found") {
    super(message, 404);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class ConflictError extends AppError {
  constructor(message = "Resource already exists") {
    super(message, 409);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) =>
  (req: Request, res: Response, next: NextFunction) => Promise.resolve(fn(req, res, next)).catch(next);

export function validateRequest(bodySchema?: ZodSchema, querySchema?: ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (bodySchema) {
        const result = bodySchema.safeParse(req.body);
        if (!result.success) {
          const details = result.error.errors.map(
            (e) => `${e.path.join(".")}: ${e.message}`
          );
          throw new ValidationError("Request body validation failed", details);
        }
        req.body = result.data;
      }

      if (querySchema) {
        const result = querySchema.safeParse(req.query);
        if (!result.success) {
          const details = result.error.errors.map(
            (e) => `${e.path.join(".")}: ${e.message}`
          );
          throw new ValidationError("Query parameter validation failed", details);
        }
      }

      next();
    } catch (err) {
      next(err);
    }
  };
}

export function requestId(req: Request, _res: Response, next: NextFunction) {
  (req as any).id = crypto.randomUUID();
  next();
}

export function errorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  if (res.headersSent) {
    return next(err);
  }

  const reqId = (req as any).id || "unknown";

  if (err instanceof ValidationError) {
    return res.status(400).json({
      error: {
        message: err.message,
        code: "VALIDATION_ERROR",
        requestId: reqId,
        details: err.details,
      },
    });
  }

  if (err instanceof ZodError) {
    const details = err.errors.map((e) => `${e.path.join(".")}: ${e.message}`);
    return res.status(400).json({
      error: {
        message: "Validation failed",
        code: "VALIDATION_ERROR",
        requestId: reqId,
        details,
      },
    });
  }

  if (err instanceof AppError) {
    const code = err.statusCode === 404
      ? "NOT_FOUND"
      : err.statusCode === 409
        ? "CONFLICT"
        : "APP_ERROR";

    return res.status(err.statusCode).json({
      error: {
        message: err.message,
        code,
        requestId: reqId,
        details: [],
      },
    });
  }

  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";

  logger.error("Internal Server Error", { source: "middleware", error: err.message, stack: err.stack, requestId: reqId });

  return res.status(status).json({
    error: {
      message: status === 500 ? "Internal Server Error" : message,
      code: "INTERNAL_ERROR",
      requestId: reqId,
      details: [],
    },
  });
}

export function sanitizeString(input: string): string {
  return input.trim().replace(/\0/g, "");
}
