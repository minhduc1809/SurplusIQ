import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { ALL_ENTITIES } from './entities';
import { DecisionEntity } from './modules/decisions/decision.entity';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
  username: process.env.POSTGRES_USER || 'surplus_admin',
  password: process.env.POSTGRES_PASSWORD || 'surplus_secret_pass',
  database: process.env.POSTGRES_DB || 'surplusiq_db',
  entities: [...ALL_ENTITIES, DecisionEntity],
  migrations: [path.join(__dirname, 'migrations/*{.ts,.js}')],
  synchronize: false,
});
