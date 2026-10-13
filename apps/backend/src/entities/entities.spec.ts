import { getMetadataArgsStorage } from 'typeorm';
import { ALL_ENTITIES } from './index';
import { AppDataSource } from '../data-source';
import { StoreEntity } from './stores/store.entity';
import { SavedPlaceEntity } from './auth/saved-place.entity';
import { OfferEntity } from './catalog/offer.entity';
import { OrderEntity } from './orders/order.entity';
import { ReviewEntity } from './complaints/review.entity';
import { UserEntity } from './auth/user.entity';

describe('TypeORM Entities Specification & Integrity', () => {
  it('should export all 61 domain entities in ALL_ENTITIES', () => {
    expect(ALL_ENTITIES).toBeDefined();
    expect(ALL_ENTITIES.length).toBe(61);
  });

  it('should register all entities in TypeORM metadata storage', () => {
    const storage = getMetadataArgsStorage();
    const registeredEntityTargets = new Set(storage.tables.map((t) => t.target));

    for (const entityClass of ALL_ENTITIES) {
      expect(registeredEntityTargets.has(entityClass)).toBe(true);
    }
  });

  it('should have primary columns defined for all entities', () => {
    const storage = getMetadataArgsStorage();
    for (const entityClass of ALL_ENTITIES) {
      const columns = storage.columns.filter((c) => c.target === entityClass);
      const primaryGenerated = storage.generations.filter((g) => g.target === entityClass);
      const hasPrimaryKey = columns.some((c) => c.options.primary) || primaryGenerated.length > 0;
      expect(hasPrimaryKey).toBe(true);
    }
  });

  it('should configure PostGIS spatial point columns on Store and SavedPlace entities', () => {
    const storage = getMetadataArgsStorage();
    const storeColumns = storage.columns.filter((c) => c.target === StoreEntity);
    const storeLocationCol = storeColumns.find((c) => c.propertyName === 'location');
    expect(storeLocationCol).toBeDefined();
    expect(storeLocationCol?.options.type).toBe('geometry');
    expect(storeLocationCol?.options.spatialFeatureType).toBe('Point');
    expect(storeLocationCol?.options.srid).toBe(4326);

    const savedPlaceColumns = storage.columns.filter((c) => c.target === SavedPlaceEntity);
    const placeLocationCol = savedPlaceColumns.find((c) => c.propertyName === 'location');
    expect(placeLocationCol).toBeDefined();
    expect(placeLocationCol?.options.type).toBe('geometry');
    expect(placeLocationCol?.options.spatialFeatureType).toBe('Point');
    expect(placeLocationCol?.options.srid).toBe(4326);
  });

  it('should enforce CHECK constraints on Offer, Order, and Review entities', () => {
    const storage = getMetadataArgsStorage();
    const checks = storage.checks;

    const offerChecks = checks.filter((c) => c.target === OfferEntity);
    expect(offerChecks.length).toBeGreaterThanOrEqual(3);
    const offerCheckExpressions = offerChecks.map((c) => c.expression);
    expect(offerCheckExpressions.some((e) => e.includes('remaining_quantity'))).toBe(true);
    expect(
      offerCheckExpressions.some((e) => e.includes('floor_price') && e.includes('original_price')),
    ).toBe(true);
    expect(offerCheckExpressions.some((e) => e.includes('price_change_count'))).toBe(true);

    const orderChecks = checks.filter((c) => c.target === OrderEntity);
    expect(orderChecks.length).toBeGreaterThanOrEqual(1);
    expect(orderChecks[0].expression).toContain('quantity');

    const reviewChecks = checks.filter((c) => c.target === ReviewEntity);
    expect(reviewChecks.length).toBeGreaterThanOrEqual(1);
    expect(reviewChecks[0].expression).toContain('rating');
  });

  it('should configure AppDataSource with all entities and synchronize set to false', () => {
    expect(AppDataSource.options.type).toBe('postgres');
    expect(AppDataSource.options.synchronize).toBe(false);

    const dataSourceEntities = AppDataSource.options.entities as unknown[];
    expect(Array.isArray(dataSourceEntities)).toBe(true);
    for (const entityClass of ALL_ENTITIES) {
      expect(dataSourceEntities).toContain(entityClass);
    }
  });

  it('should verify UserEntity has email and phone columns for BR-001', () => {
    const storage = getMetadataArgsStorage();
    const userColumns = storage.columns.filter((c) => c.target === UserEntity);
    const emailCol = userColumns.find((c) => c.propertyName === 'email');
    const phoneCol = userColumns.find((c) => c.propertyName === 'phone');
    expect(emailCol).toBeDefined();
    expect(phoneCol).toBeDefined();
  });
});
