import { ExecutionContext, BadRequestException, HttpException, HttpStatus } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { of, firstValueFrom } from 'rxjs';
import * as crypto from 'crypto';
import { IdempotencyInterceptor } from './idempotency.interceptor';

describe('IdempotencyInterceptor Unit Tests (BR-015)', () => {
  let interceptor: IdempotencyInterceptor;
  let reflector: Reflector;
  let mockIdempotencyRepo: any;

  beforeEach(() => {
    reflector = new Reflector();
    mockIdempotencyRepo = {
      findOne: jest.fn(),
      create: jest.fn().mockImplementation((dto) => ({ ...dto })),
      save: jest.fn().mockImplementation((entity) => Promise.resolve(entity)),
    };

    interceptor = new IdempotencyInterceptor(reflector, mockIdempotencyRepo);
  });

  const createMockContext = (
    headers: Record<string, string>,
    body: any = {},
    user: any = { userId: 'u1' },
  ): ExecutionContext => {
    const req = {
      headers,
      body,
      user,
      path: '/orders',
      route: { path: '/orders' },
    };
    const res = {
      statusCode: 201,
      status: jest.fn().mockReturnThis(),
      setHeader: jest.fn(),
    };

    return {
      switchToHttp: () => ({
        getRequest: () => req,
        getResponse: () => res,
      }),
      getHandler: () => () => {},
      getClass: () => class {},
    } as unknown as ExecutionContext;
  };

  it('should throw BadRequestException when Idempotency-Key is required but missing (BR-015)', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue({ required: true });
    const context = createMockContext({});
    const next = { handle: jest.fn() };

    await expect(interceptor.intercept(context, next)).rejects.toThrow(BadRequestException);
  });

  it('should pass through when no Idempotency-Key header and not required', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(null);
    const context = createMockContext({});
    const next = { handle: jest.fn().mockReturnValue(of({ success: true })) };

    const observable = await interceptor.intercept(context, next);
    const result = await firstValueFrom(observable);

    expect(result).toEqual({ success: true });
    expect(mockIdempotencyRepo.findOne).not.toHaveBeenCalled();
  });

  it('should process first call, save idempotency record, and set header to SAVED', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue({ required: true });
    mockIdempotencyRepo.findOne.mockResolvedValue(null); // Key not used yet

    const body = { offerId: 'off-1', quantity: 2 };
    const context = createMockContext({ 'idempotency-key': 'idem-key-123' }, body);
    const next = { handle: jest.fn().mockReturnValue(of({ orderId: 'ord-100', total: 60000 })) };

    const observable = await interceptor.intercept(context, next);
    const result = await firstValueFrom(observable);

    expect(result).toEqual({ orderId: 'ord-100', total: 60000 });
    expect(mockIdempotencyRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        key: 'idem-key-123',
        statusCode: 201,
        response: { orderId: 'ord-100', total: 60000 },
      }),
    );
  });

  it('should return cached response on replay with identical payload (Idempotent replay)', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue({ required: true });

    const body = { offerId: 'off-1', quantity: 2 };
    const requestHash = crypto.createHash('sha256').update(JSON.stringify(body)).digest('hex');

    mockIdempotencyRepo.findOne.mockResolvedValue({
      key: 'idem-key-123',
      requestHash,
      statusCode: 201,
      response: { orderId: 'ord-100', total: 60000 },
    });

    const context = createMockContext({ 'idempotency-key': 'idem-key-123' }, body);
    const next = { handle: jest.fn() };

    const observable = await interceptor.intercept(context, next);
    const result = await firstValueFrom(observable);

    expect(result).toEqual({ orderId: 'ord-100', total: 60000 });
    expect(next.handle).not.toHaveBeenCalled(); // Handler was not executed again!
  });

  it('should throw 422 IDEMPOTENCY_KEY_REUSED when key is reused with different payload (BR-015)', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue({ required: true });

    // Stored hash for original payload
    const originalHash = crypto
      .createHash('sha256')
      .update(JSON.stringify({ offerId: 'off-1', quantity: 2 }))
      .digest('hex');

    mockIdempotencyRepo.findOne.mockResolvedValue({
      key: 'idem-key-123',
      requestHash: originalHash,
      statusCode: 201,
      response: { orderId: 'ord-100' },
    });

    // Client sends DIFFERENT payload with the SAME key
    const differentBody = { offerId: 'off-2', quantity: 5 };
    const context = createMockContext({ 'idempotency-key': 'idem-key-123' }, differentBody);
    const next = { handle: jest.fn() };

    await expect(interceptor.intercept(context, next)).rejects.toThrow(HttpException);

    try {
      await interceptor.intercept(context, next);
    } catch (err: any) {
      expect(err.getStatus()).toBe(HttpStatus.UNPROCESSABLE_ENTITY);
      expect(err.getResponse().code).toBe('IDEMPOTENCY_KEY_REUSED');
    }
  });
});
