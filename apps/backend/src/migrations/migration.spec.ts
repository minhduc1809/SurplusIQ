import { QueryRunner } from 'typeorm';
import { InitialPostgisSchema1700000000000 } from './1700000000000-InitialPostgisSchema';

describe('InitialPostgisSchema Migration Specification', () => {
  let migration: InitialPostgisSchema1700000000000;
  let executedQueries: string[];
  let mockQueryRunner: Partial<QueryRunner>;

  beforeEach(() => {
    migration = new InitialPostgisSchema1700000000000();
    executedQueries = [];
    mockQueryRunner = {
      query: jest.fn().mockImplementation(async (query: string) => {
        executedQueries.push(query);
        return [];
      }),
    };
  });

  it('should have the correct migration timestamp name', () => {
    expect(migration.name).toBe('InitialPostgisSchema1700000000000');
  });

  it('should execute up queries creating postgis extensions and spatial tables', async () => {
    await migration.up(mockQueryRunner as QueryRunner);
    expect(executedQueries.length).toBeGreaterThan(0);

    const fullSql = executedQueries.join('\n');

    // Extensions
    expect(fullSql).toContain('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
    expect(fullSql).toContain('CREATE EXTENSION IF NOT EXISTS "postgis"');
    expect(fullSql).toContain('CREATE EXTENSION IF NOT EXISTS "citext"');

    // GIST spatial indexes
    expect(fullSql).toContain('USING GIST ("location")');
    expect(fullSql).toContain('IDX_stores_location');
    expect(fullSql).toContain('IDX_saved_places_location');

    // Core domain tables
    expect(fullSql).toContain('CREATE TABLE IF NOT EXISTS "users"');
    expect(fullSql).toContain('CREATE TABLE IF NOT EXISTS "stores"');
    expect(fullSql).toContain('CREATE TABLE IF NOT EXISTS "items"');
    expect(fullSql).toContain('CREATE TABLE IF NOT EXISTS "offers"');
    expect(fullSql).toContain('CREATE TABLE IF NOT EXISTS "orders"');
    expect(fullSql).toContain('CREATE TABLE IF NOT EXISTS "payment_transactions"');
    expect(fullSql).toContain('CREATE TABLE IF NOT EXISTS "pickup_tokens"');
    expect(fullSql).toContain('CREATE TABLE IF NOT EXISTS "complaints"');
    expect(fullSql).toContain('CREATE TABLE IF NOT EXISTS "weekly_statements"');
    expect(fullSql).toContain('CREATE TABLE IF NOT EXISTS "anomalies"');
    expect(fullSql).toContain('CREATE TABLE IF NOT EXISTS "platform_settings"');

    // Check constraints
    expect(fullSql).toContain('chk_offers_remaining_qty');
    expect(fullSql).toContain('chk_offers_price_bounds');
    expect(fullSql).toContain('chk_orders_quantity_range');
    expect(fullSql).toContain('chk_reviews_rating_range');
  });

  it('should execute down queries dropping all tables in reverse order', async () => {
    await migration.down(mockQueryRunner as QueryRunner);
    expect(executedQueries.length).toBeGreaterThan(0);

    const fullSql = executedQueries.join('\n');
    expect(fullSql).toContain('DROP TABLE IF EXISTS "platform_settings" CASCADE;');
    expect(fullSql).toContain('DROP TABLE IF EXISTS "users" CASCADE;');
    expect(fullSql).toContain('DROP TABLE IF EXISTS "orders" CASCADE;');
    expect(fullSql).toContain('DROP TABLE IF EXISTS "stores" CASCADE;');
  });
});
