/**
 * ⚠️  DEVELOPMENT SEED DATA ONLY
 * This file MUST NOT be run in production.
 * Run with: npm run db:seed:dev --workspace=apps/api
 */

import 'reflect-metadata';
import * as dotenv from 'dotenv';
import { join } from 'path';
import { DataSource } from 'typeorm';

// Load development .env
dotenv.config({ path: join(__dirname, '../../../.env') });

if (process.env['NODE_ENV'] === 'production') {
  console.error('❌ REFUSING to seed production database. Set NODE_ENV=development to proceed.');
  process.exit(1);
}

async function runSeeds(): Promise<void> {
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env['DB_HOST'] ?? 'localhost',
    port: parseInt(process.env['DB_PORT'] ?? '5432', 10),
    username: process.env['DB_USERNAME'],
    password: process.env['DB_PASSWORD'],
    database: process.env['DB_DATABASE'],
    entities: [join(__dirname, '../modules/**/*.entity.{ts,js}')],
    synchronize: false,
  });

  await dataSource.initialize();
  console.log('✅ Database connected');

  try {
    await dataSource.transaction(async (manager) => {
      console.log('🌱 Seeding device categories...');
      await manager.query(`
        INSERT INTO device_categories (name, slug, is_active, sort_order) VALUES
          ('Mobile Phone', 'mobile-phone', true, 1),
          ('Laptop', 'laptop', true, 2),
          ('TV', 'tv', true, 3),
          ('Air Conditioner', 'air-conditioner', true, 4),
          ('Refrigerator', 'refrigerator', true, 5),
          ('Washing Machine', 'washing-machine', true, 6),
          ('Tablet', 'tablet', true, 7),
          ('Desktop PC', 'desktop-pc', true, 8),
          ('Microwave', 'microwave', true, 9),
          ('Water Purifier', 'water-purifier', true, 10)
        ON CONFLICT (slug) DO NOTHING
      `);

      console.log('🌱 Seeding device brands...');
      await manager.query(`
        INSERT INTO device_brands (name, slug, is_active) VALUES
          ('Samsung', 'samsung', true),
          ('LG', 'lg', true),
          ('Sony', 'sony', true),
          ('Whirlpool', 'whirlpool', true),
          ('Apple', 'apple', true),
          ('Dell', 'dell', true),
          ('HP', 'hp', true),
          ('Lenovo', 'lenovo', true),
          ('Asus', 'asus', true),
          ('Acer', 'acer', true),
          ('OnePlus', 'oneplus', true),
          ('Xiaomi', 'xiaomi', true),
          ('Oppo', 'oppo', true),
          ('Vivo', 'vivo', true),
          ('Realme', 'realme', true),
          ('Haier', 'haier', true),
          ('Bosch', 'bosch', true),
          ('IFB', 'ifb', true),
          ('Voltas', 'voltas', true),
          ('Godrej', 'godrej', true)
        ON CONFLICT (slug) DO NOTHING
      `);

      console.log('🌱 Seeding category-brand associations...');
      await manager.query(`
        INSERT INTO device_category_brands (category_id, brand_id)
        SELECT c.id, b.id FROM device_categories c, device_brands b
        WHERE
          (c.slug = 'mobile-phone' AND b.slug IN ('samsung', 'apple', 'oneplus', 'xiaomi', 'oppo', 'vivo', 'realme', 'lg', 'sony'))
          OR (c.slug = 'laptop' AND b.slug IN ('apple', 'dell', 'hp', 'lenovo', 'asus', 'acer', 'samsung'))
          OR (c.slug = 'tv' AND b.slug IN ('samsung', 'lg', 'sony', 'haier', 'oneplus'))
          OR (c.slug = 'air-conditioner' AND b.slug IN ('samsung', 'lg', 'voltas', 'haier', 'godrej', 'whirlpool'))
          OR (c.slug = 'refrigerator' AND b.slug IN ('samsung', 'lg', 'whirlpool', 'haier', 'godrej', 'bosch', 'ifb'))
          OR (c.slug = 'washing-machine' AND b.slug IN ('samsung', 'lg', 'whirlpool', 'haier', 'ifb', 'bosch', 'godrej'))
          OR (c.slug = 'tablet' AND b.slug IN ('apple', 'samsung', 'lenovo', 'xiaomi'))
          OR (c.slug = 'desktop-pc' AND b.slug IN ('dell', 'hp', 'lenovo', 'asus', 'acer'))
        ON CONFLICT DO NOTHING
      `);

      console.log('🌱 Seeding development users...');

      // bcrypt hash for "DevPassword1!" at cost factor 12
      const devPasswordHash = '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TiGX5p45FqbFzKhK5CZ.3LvnWRFe';

      // Admin user
      await manager.query(`
        INSERT INTO users (id, email, mobile, password_hash, role, status, is_email_verified, is_mobile_verified)
        VALUES (
          '00000000-0000-0000-0000-000000000001',
          'admin@fixme.dev',
          '9000000001',
          '${devPasswordHash}',
          'ADMIN',
          'ACTIVE',
          true,
          true
        ) ON CONFLICT (email) DO NOTHING
      `);
      await manager.query(`
        INSERT INTO admin_users (user_id, full_name)
        VALUES ('00000000-0000-0000-0000-000000000001', 'Dev Admin')
        ON CONFLICT (user_id) DO NOTHING
      `);

      // Customer user
      await manager.query(`
        INSERT INTO users (id, email, mobile, password_hash, role, status, is_email_verified, is_mobile_verified)
        VALUES (
          '00000000-0000-0000-0000-000000000002',
          'customer@fixme.dev',
          '9000000002',
          '${devPasswordHash}',
          'CUSTOMER',
          'ACTIVE',
          true,
          true
        ) ON CONFLICT (email) DO NOTHING
      `);
      await manager.query(`
        INSERT INTO customers (id, user_id, first_name, last_name)
        VALUES ('00000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000002', 'Ravi', 'Kumar')
        ON CONFLICT (user_id) DO NOTHING
      `);

      // Customer address
      await manager.query(`
        INSERT INTO addresses (customer_id, type, house_building, street, area, landmark, city, state, pincode, latitude, longitude, is_default)
        VALUES (
          '00000000-0000-0000-0000-000000000012',
          'HOME', 'Flat 201, Green Valley Apartments', 'MG Road', 'Koramangala', 'Near Forum Mall',
          'Bengaluru', 'Karnataka', '560034', 12.9352, 77.6245, true
        ) ON CONFLICT DO NOTHING
      `);

      // Fixer user
      await manager.query(`
        INSERT INTO users (id, email, mobile, password_hash, role, status, is_email_verified, is_mobile_verified)
        VALUES (
          '00000000-0000-0000-0000-000000000003',
          'fixer@fixme.dev',
          '9000000003',
          '${devPasswordHash}',
          'FIXER',
          'ACTIVE',
          true,
          true
        ) ON CONFLICT (email) DO NOTHING
      `);
      await manager.query(`
        INSERT INTO fixers (
          id, user_id, owner_name, company_name, gstin,
          description, experience_years, emergency_service,
          working_hours_start, working_hours_end,
          working_days, verification_status,
          average_rating, total_reviews, completed_jobs,
          address_line, city, state, pincode, latitude, longitude
        )
        VALUES (
          '00000000-0000-0000-0000-000000000013',
          '00000000-0000-0000-0000-000000000003',
          'Suresh Patel',
          'TechFix Solutions Pvt Ltd',
          '29AAGCB1234N1Z5',
          'Expert repair services for all major mobile, laptop, and TV brands. 10+ years of experience.',
          10,
          true,
          '09:00',
          '20:00',
          ARRAY['MON','TUE','WED','THU','FRI','SAT'],
          'VERIFIED',
          4.7,
          32,
          45,
          '12, Industrial Estate', 'Bengaluru', 'Karnataka', '560058', 12.9716, 77.5946
        )
        ON CONFLICT (user_id) DO NOTHING
      `);

      // Fixer services
      await manager.query(`
        INSERT INTO fixer_services (fixer_id, category_id, brand_id)
        SELECT
          '00000000-0000-0000-0000-000000000013',
          c.id,
          b.id
        FROM device_categories c
        CROSS JOIN device_brands b
        WHERE
          (c.slug = 'mobile-phone' AND b.slug IN ('samsung', 'apple', 'oneplus'))
          OR (c.slug = 'laptop' AND b.slug IN ('dell', 'hp', 'lenovo'))
        ON CONFLICT (fixer_id, category_id, brand_id) DO NOTHING
      `);

      // Fixer service areas
      await manager.query(`
        INSERT INTO fixer_service_areas (fixer_id, type, pincode, city, state)
        VALUES
          ('00000000-0000-0000-0000-000000000013', 'PINCODE', '560034', 'Bengaluru', 'Karnataka'),
          ('00000000-0000-0000-0000-000000000013', 'PINCODE', '560058', 'Bengaluru', 'Karnataka'),
          ('00000000-0000-0000-0000-000000000013', 'PINCODE', '560001', 'Bengaluru', 'Karnataka'),
          ('00000000-0000-0000-0000-000000000013', 'CITY', NULL, 'Bengaluru', 'Karnataka')
        ON CONFLICT DO NOTHING
      `);

      // Sample repair request
      await manager.query(`
        INSERT INTO problem_requests (
          id, customer_id, category_id, brand_id, device_model,
          problem_title, problem_description, warranty_status, urgency,
          status, city, state, pincode, latitude, longitude
        )
        SELECT
          '00000000-0000-0000-0000-000000000020',
          '00000000-0000-0000-0000-000000000012',
          c.id,
          b.id,
          'Samsung Galaxy S23',
          'Screen cracked, touch not working',
          'I dropped my Samsung Galaxy S23. The screen is cracked and the touch is not responding properly. Bottom half of screen is black.',
          false,
          'HIGH',
          'OPEN',
          'Bengaluru',
          'Karnataka',
          '560034',
          12.9352,
          77.6245
        FROM device_categories c, device_brands b
        WHERE c.slug = 'mobile-phone' AND b.slug = 'samsung'
        ON CONFLICT DO NOTHING
      `);

      console.log('');
      console.log('✅ Development seed data created successfully!');
      console.log('');
      console.log('🔐 Development Credentials (password for all: DevPassword1!)');
      console.log('   Admin:    admin@fixme.dev     / 9000000001');
      console.log('   Customer: customer@fixme.dev  / 9000000002');
      console.log('   Fixer:    fixer@fixme.dev     / 9000000003');
      console.log('');
      console.log('⚠️  These are DEVELOPMENT credentials only. Never use in production.');
    });
  } finally {
    await dataSource.destroy();
  }
}

runSeeds().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
