import { Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import * as definitions from './data-collections.json';

export interface AdminCollectionQueryOptions {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
}

@Injectable()
export class AdminSnapshotService {
  constructor(private readonly dataSource: DataSource) {}

  async read() {
    return this.dataSource.transaction('REPEATABLE READ', async (manager) => {
      await manager.query('SET TRANSACTION READ ONLY');
      await manager.query("SET LOCAL statement_timeout = '15s'");
      const [clock] = await manager.query('SELECT transaction_timestamp() AS exported_at');
      const collections: Record<string, Record<string, unknown>[]> = {};
      const dates = new Set(['week_start', 'week_end', 'date', 'target_date']);
      const quote = (identifier: string) => {
        if (
          !/^[a-z_]+$/.test(identifier) ||
          /password|token|secret|otp|backup_code|gateway|payment_txn|payload|old_value|new_value/i.test(
            identifier,
          )
        ) {
          throw new Error('Trường dữ liệu Admin không hợp lệ.');
        }
        return `"${identifier}"`;
      };
      for (const [key, definition] of Object.entries(definitions)) {
        if (
          !definition ||
          typeof definition !== 'object' ||
          !('fields' in (definition as Record<string, unknown>)) ||
          !('table' in (definition as Record<string, unknown>))
        ) {
          continue;
        }
        const fields = Object.keys(definition.fields)
          .map((field) =>
            dates.has(field) ? `${quote(field)}::text AS ${quote(field)}` : quote(field),
          )
          .join(', ');
        collections[key] = await manager.query(
          `SELECT ${fields} FROM ${quote(definition.table)} ORDER BY ${quote(definition.primaryKey)}`,
        );
      }
      const byId = (key: string) => new Map(collections[key].map((row) => [row.id, row]));
      const stores = byId('stores');
      const users = byId('users');
      const orders = byId('orders');
      const items = byId('items');
      for (const rows of Object.values(collections)) {
        for (const row of rows) {
          if (row.store_id) row.store_name = stores.get(row.store_id)?.name || row.store_id;
          const userId =
            row.customer_id || row.user_id || row.owner_user_id || row.actor_id || row.reporter_id;
          if (userId)
            row.user_label =
              userId === '00000000-0000-0000-0000-000000000000'
                ? 'SYSTEM'
                : users.get(userId)?.email || users.get(userId)?.phone || userId;
          if (row.order_id) row.order_code = orders.get(row.order_id)?.code || row.order_id;
          if (row.item_id) row.item_name = items.get(row.item_id)?.name || row.item_id;
        }
      }
      return {
        version: 1,
        exportedAt: new Date(clock.exported_at).toISOString(),
        source: 'PostgreSQL live',
        counts: Object.fromEntries(
          Object.entries(collections).map(([key, rows]) => [key, rows.length]),
        ),
        collections,
      };
    });
  }

  async readCollection(key: string, options: AdminCollectionQueryOptions = {}) {
    if (!Object.prototype.hasOwnProperty.call(definitions, key)) {
      throw new NotFoundException(`Collection "${key}" không tồn tại.`);
    }
    const snapshot = await this.read();
    const rawRows = snapshot.collections[key] ?? [];
    const normalizedStatus = options.status?.trim();
    const normalizedSearch = options.search?.trim().toLowerCase();

    const filtered = rawRows.filter((row) => {
      if (normalizedStatus && normalizedStatus !== 'ALL') {
        const rowStatus = String(row.status ?? row.severity ?? row.plan ?? '');
        if (rowStatus !== normalizedStatus) {
          return false;
        }
      }
      if (normalizedSearch) {
        return Object.values(row).some(
          (val) =>
            val !== null &&
            val !== undefined &&
            String(val).toLowerCase().includes(normalizedSearch),
        );
      }
      return true;
    });

    const limit = Math.min(Math.max(Number(options.limit) || 25, 1), 200);
    const total = filtered.length;
    const totalPages = Math.max(Math.ceil(total / limit), 1);
    const page = Math.min(Math.max(Number(options.page) || 1, 1), totalPages);
    const start = (page - 1) * limit;

    return {
      key,
      exportedAt: snapshot.exportedAt,
      page,
      limit,
      total,
      totalPages,
      items: filtered.slice(start, start + limit),
    };
  }

  async getMetricsOverview() {
    const [usersRes] = await this.dataSource.query(`
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE status = 'ACTIVE')::int AS active,
        COUNT(*) FILTER (WHERE status = 'LOCKED' OR (locked_until IS NOT NULL AND locked_until > NOW()))::int AS locked,
        COUNT(*) FILTER (WHERE two_factor_enabled = true)::int AS "twoFactorEnabled"
      FROM users
    `);

    const [sessionsRes] = await this.dataSource.query(`
      SELECT COUNT(DISTINCT actor_id)::int AS sessions
      FROM audit_logs
      WHERE created_at >= NOW() - INTERVAL '7 days'
    `);
    const sessionsCount = Math.max(
      Number(sessionsRes?.sessions || 0),
      Number(usersRes?.active || 0),
    );

    const [ordersRes] = await this.dataSource.query(`
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE status = 'PENDING_PAYMENT')::int AS "pendingPayment",
        COUNT(*) FILTER (WHERE status = 'PICKED_UP')::int AS "pickedUp",
        COUNT(*) FILTER (WHERE status = 'PAID')::int AS paid,
        COALESCE(SUM(total_amount), 0)::bigint AS "totalAmount",
        COALESCE(SUM(total_amount) FILTER (WHERE status IN ('PAID', 'PICKED_UP')), 0)::bigint AS "settledAmount"
      FROM orders
    `);

    const [complaintsRes] = await this.dataSource.query(`
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE status = 'PENDING_STORE')::int AS "pendingStore",
        COUNT(*) FILTER (WHERE status = 'ACCEPTED')::int AS accepted,
        COUNT(*) FILTER (WHERE status = 'REJECTED')::int AS rejected
      FROM complaints
    `);

    const [violationsRes] = await this.dataSource.query(`
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE status = 'PENDING')::int AS pending,
        COUNT(*) FILTER (WHERE status = 'REVIEWED')::int AS reviewed
      FROM violation_reports
    `);

    const [settlementRes] = await this.dataSource.query(`
      SELECT
        COUNT(*)::int AS "totalStatements",
        COALESCE(SUM(gross), 0)::bigint AS "totalGross",
        COALESCE(SUM(net_payable), 0)::bigint AS "totalNetPayable",
        COALESCE(SUM(commission), 0)::bigint AS "totalCommission",
        COUNT(*) FILTER (WHERE status = 'LOCKED')::int AS "lockedStatements",
        COUNT(*) FILTER (WHERE checksum IS NOT NULL AND checksum != '')::int AS "verifiedChecksums"
      FROM weekly_statements
    `);

    const [subscriptionsRes] = await this.dataSource.query(`
      SELECT
        COUNT(*)::int AS "totalSubscriptions",
        COUNT(*) FILTER (WHERE plan = 'PRO')::int AS "proStores",
        COUNT(*) FILTER (WHERE plan = 'TRIAL')::int AS "trialStores",
        COUNT(*) FILTER (WHERE status = 'ACTIVE')::int AS "activeSubscriptions"
      FROM subscriptions
    `);

    const [invoicesRes] = await this.dataSource.query(`
      SELECT
        COALESCE(SUM(amount) FILTER (WHERE status = 'PAID'), 0)::bigint AS "subscriptionRevenue"
      FROM subscription_invoices
    `);

    return {
      users: {
        total: Number(usersRes.total),
        active: Number(usersRes.active),
        locked: Number(usersRes.locked),
        sessions: sessionsCount,
        twoFactorEnabled: Number(usersRes.twoFactorEnabled),
      },
      orders: {
        total: Number(ordersRes.total),
        pendingPayment: Number(ordersRes.pendingPayment),
        pickedUp: Number(ordersRes.pickedUp),
        paid: Number(ordersRes.paid),
        totalAmount: Number(ordersRes.totalAmount),
        settledAmount: Number(ordersRes.settledAmount),
      },
      disputes: {
        totalComplaints: Number(complaintsRes.total),
        pendingStoreComplaints: Number(complaintsRes.pendingStore),
        acceptedComplaints: Number(complaintsRes.accepted),
        rejectedComplaints: Number(complaintsRes.rejected),
        totalViolations: Number(violationsRes.total),
        pendingViolations: Number(violationsRes.pending),
      },
      settlement: {
        totalStatements: Number(settlementRes.totalStatements),
        totalGross: Number(settlementRes.totalGross),
        totalNetPayable: Number(settlementRes.totalNetPayable),
        totalCommission: Number(settlementRes.totalCommission),
        lockedStatements: Number(settlementRes.lockedStatements),
        verifiedChecksums: Number(settlementRes.verifiedChecksums),
      },
      subscriptions: {
        totalSubscriptions: Number(subscriptionsRes.totalSubscriptions),
        proStores: Number(subscriptionsRes.proStores),
        trialStores: Number(subscriptionsRes.trialStores),
        activeSubscriptions: Number(subscriptionsRes.activeSubscriptions),
        subscriptionRevenue: Number(invoicesRes.subscriptionRevenue),
      },
    };
  }
}
