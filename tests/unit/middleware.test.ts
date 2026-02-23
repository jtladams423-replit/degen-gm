import { describe, it, expect } from 'vitest';
import { sanitizeString, AppError, ValidationError, NotFoundError, ConflictError } from '../../server/middleware';

describe('Middleware utilities', () => {
  describe('sanitizeString', () => {
    it('should trim whitespace', () => {
      expect(sanitizeString('  hello  ')).toBe('hello');
    });

    it('should remove null bytes', () => {
      expect(sanitizeString('he\0llo')).toBe('hello');
    });

    it('should handle empty string', () => {
      expect(sanitizeString('')).toBe('');
    });
  });

  describe('Error classes', () => {
    it('AppError should have correct status code', () => {
      const err = new AppError('test', 418);
      expect(err.statusCode).toBe(418);
      expect(err.message).toBe('test');
      expect(err.isOperational).toBe(true);
    });

    it('ValidationError should be 400', () => {
      const err = new ValidationError('bad input', ['field: required']);
      expect(err.statusCode).toBe(400);
      expect(err.details).toEqual(['field: required']);
    });

    it('NotFoundError should be 404', () => {
      const err = new NotFoundError();
      expect(err.statusCode).toBe(404);
    });

    it('ConflictError should be 409', () => {
      const err = new ConflictError();
      expect(err.statusCode).toBe(409);
    });

    it('errors should be instances of Error', () => {
      expect(new AppError('test', 500)).toBeInstanceOf(Error);
      expect(new ValidationError('test')).toBeInstanceOf(AppError);
      expect(new NotFoundError()).toBeInstanceOf(AppError);
      expect(new ConflictError()).toBeInstanceOf(AppError);
    });
  });
});
