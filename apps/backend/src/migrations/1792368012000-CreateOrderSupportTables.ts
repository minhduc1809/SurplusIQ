import type { MigrationInterface, QueryRunner } from 'typeorm';

/** Sự cố khi nhận (KX03), trò chuyện theo đơn (KX11), tặng suất (KX18) và đổi suất (KX05). */
export class CreateOrderSupportTables1792368012000 implements MigrationInterface {
  async up(q: QueryRunner): Promise<void> {
    await q.query(`CREATE TABLE IF NOT EXISTS "pickup_incidents" (
      "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
      "order_id" uuid NOT NULL,
      "store_id" uuid NOT NULL,
      "customer_id" uuid NOT NULL,
      "type" varchar(20) NOT NULL,
      "note" varchar(500),
      "status" varchar(20) NOT NULL DEFAULT 'OPEN',
      "outcome" varchar(20),
      "store_response" varchar(500),
      "responded_by" uuid,
      "resolved_at" timestamptz,
      "created_at" timestamptz NOT NULL DEFAULT now()
    )`);
    await q.query(
      `CREATE INDEX IF NOT EXISTS "IDX_pickup_incidents_order" ON "pickup_incidents" ("order_id")`,
    );
    await q.query(
      `CREATE INDEX IF NOT EXISTS "IDX_pickup_incidents_store" ON "pickup_incidents" ("store_id", "status")`,
    );

    await q.query(`CREATE TABLE IF NOT EXISTS "order_messages" (
      "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
      "order_id" uuid NOT NULL,
      "store_id" uuid NOT NULL,
      "sender_role" varchar(10) NOT NULL,
      "sender_id" uuid NOT NULL,
      "body" varchar(500) NOT NULL,
      "read_at" timestamptz,
      "created_at" timestamptz NOT NULL DEFAULT now()
    )`);
    await q.query(
      `CREATE INDEX IF NOT EXISTS "IDX_order_messages_order" ON "order_messages" ("order_id", "created_at")`,
    );
    await q.query(
      `CREATE INDEX IF NOT EXISTS "IDX_order_messages_store" ON "order_messages" ("store_id")`,
    );

    await q.query(`CREATE TABLE IF NOT EXISTS "order_gifts" (
      "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
      "order_id" uuid NOT NULL,
      "from_user_id" uuid NOT NULL,
      "to_user_id" uuid NOT NULL,
      "status" varchar(20) NOT NULL DEFAULT 'PENDING',
      "message" varchar(200),
      "expires_at" timestamptz NOT NULL,
      "responded_at" timestamptz,
      "created_at" timestamptz NOT NULL DEFAULT now()
    )`);
    await q.query(
      `CREATE INDEX IF NOT EXISTS "IDX_order_gifts_order" ON "order_gifts" ("order_id")`,
    );
    await q.query(
      `CREATE INDEX IF NOT EXISTS "IDX_order_gifts_to" ON "order_gifts" ("to_user_id", "status")`,
    );
    // Một đơn chỉ có một lời tặng đang chờ tại một thời điểm.
    await q.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "UQ_order_gifts_pending" ON "order_gifts" ("order_id") WHERE "status" = 'PENDING'`,
    );

    await q.query(
      `ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "swapped_from_offer_id" uuid, ADD COLUMN IF NOT EXISTS "swapped_at" timestamptz`,
    );
  }

  async down(q: QueryRunner): Promise<void> {
    await q.query(
      `ALTER TABLE "orders" DROP COLUMN IF EXISTS "swapped_from_offer_id", DROP COLUMN IF EXISTS "swapped_at"`,
    );
    await q.query(`DROP TABLE IF EXISTS "order_gifts"`);
    await q.query(`DROP TABLE IF EXISTS "order_messages"`);
    await q.query(`DROP TABLE IF EXISTS "pickup_incidents"`);
  }
}
