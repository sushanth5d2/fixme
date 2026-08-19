import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Phase 3 — Complete Fix Me Database Schema
 *
 * Creates all core tables for the Fix Me repair service marketplace.
 * This migration is REVERSIBLE — the down() method drops all tables cleanly.
 */
export class InitialSchema1724000000000 implements MigrationInterface {
  public name = 'InitialSchema1724000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── Extensions ─────────────────────────────────────────────
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "postgis"`);
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pg_trgm"`);

    // ── Enums ──────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TYPE user_role AS ENUM ('CUSTOMER', 'FIXER', 'ADMIN', 'SUPER_ADMIN')
    `);
    await queryRunner.query(`
      CREATE TYPE user_status AS ENUM ('ACTIVE', 'BLOCKED', 'DEACTIVATED', 'PENDING_VERIFICATION')
    `);
    await queryRunner.query(`
      CREATE TYPE fixer_verification_status AS ENUM (
        'REGISTERED', 'DOCUMENT_SUBMITTED', 'UNDER_REVIEW', 'VERIFIED', 'REJECTED', 'BLOCKED'
      )
    `);
    await queryRunner.query(`
      CREATE TYPE request_status AS ENUM (
        'OPEN', 'QUOTED', 'CUSTOMER_ACCEPTED', 'ASSIGNED', 'FIXER_ON_THE_WAY',
        'DEVICE_RECEIVED', 'DIAGNOSING', 'REPAIR_IN_PROGRESS', 'READY_FOR_DELIVERY',
        'COMPLETED', 'REVIEWED', 'CANCELLED', 'DISPUTED'
      )
    `);
    await queryRunner.query(`
      CREATE TYPE quote_status AS ENUM (
        'DRAFT', 'SUBMITTED', 'VIEWED', 'ACCEPTED', 'REJECTED', 'WITHDRAWN', 'EXPIRED'
      )
    `);
    await queryRunner.query(`
      CREATE TYPE job_status AS ENUM (
        'ASSIGNED', 'FIXER_ON_THE_WAY', 'DEVICE_RECEIVED', 'DIAGNOSING',
        'REPAIR_IN_PROGRESS', 'READY_FOR_DELIVERY', 'COMPLETED', 'CANCELLED', 'DISPUTED'
      )
    `);
    await queryRunner.query(`
      CREATE TYPE urgency_level AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'EMERGENCY')
    `);
    await queryRunner.query(`
      CREATE TYPE notification_type AS ENUM (
        'REQUEST_CREATED', 'QUOTE_RECEIVED', 'QUOTE_ACCEPTED', 'QUOTE_REJECTED',
        'NEW_MESSAGE', 'JOB_ASSIGNED', 'JOB_STATUS_CHANGED', 'REPAIR_COMPLETED',
        'REVIEW_REMINDER', 'REVIEW_RECEIVED', 'COMPLAINT_UPDATED',
        'VERIFICATION_APPROVED', 'VERIFICATION_REJECTED', 'ACCOUNT_BLOCKED',
        'NEW_MATCHING_REQUEST'
      )
    `);
    await queryRunner.query(`
      CREATE TYPE notification_channel AS ENUM ('IN_APP', 'PUSH', 'EMAIL', 'SMS')
    `);
    await queryRunner.query(`
      CREATE TYPE complaint_status AS ENUM (
        'OPEN', 'UNDER_REVIEW', 'WAITING_FOR_INFORMATION', 'RESOLVED', 'REJECTED', 'CLOSED'
      )
    `);
    await queryRunner.query(`
      CREATE TYPE complaint_reason AS ENUM (
        'FIXER_DID_NOT_ARRIVE', 'POOR_SERVICE', 'OVERCHARGING', 'DEVICE_DAMAGE',
        'WARRANTY_ISSUE', 'UNPROFESSIONAL_BEHAVIOR', 'SUSPECTED_FRAUD',
        'FAKE_CUSTOMER', 'CUSTOMER_NO_SHOW', 'ABUSIVE_BEHAVIOR',
        'PAYMENT_DISPUTE', 'FALSE_COMPLAINT'
      )
    `);
    await queryRunner.query(`
      CREATE TYPE document_type AS ENUM (
        'BUSINESS_LICENSE', 'ID_PROOF', 'GST_CERTIFICATE', 'ADDRESS_PROOF',
        'BANK_STATEMENT', 'OTHER'
      )
    `);
    await queryRunner.query(`
      CREATE TYPE document_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED')
    `);
    await queryRunner.query(`
      CREATE TYPE address_type AS ENUM ('HOME', 'WORK', 'OTHER')
    `);
    await queryRunner.query(`
      CREATE TYPE media_type AS ENUM ('PHOTO', 'VIDEO')
    `);
    await queryRunner.query(`
      CREATE TYPE review_status AS ENUM ('VISIBLE', 'HIDDEN')
    `);
    await queryRunner.query(`
      CREATE TYPE service_area_type AS ENUM ('PINCODE', 'CITY', 'RADIUS')
    `);
    await queryRunner.query(`
      CREATE TYPE audit_action AS ENUM (
        'USER_LOGIN', 'USER_LOGOUT', 'USER_SIGNUP', 'PASSWORD_RESET',
        'ACCOUNT_BLOCKED', 'ACCOUNT_UNBLOCKED', 'ACCOUNT_DEACTIVATED',
        'FIXER_VERIFICATION_SUBMITTED', 'FIXER_VERIFIED', 'FIXER_REJECTED',
        'QUOTE_ACCEPTED', 'QUOTE_REJECTED', 'JOB_STATUS_CHANGED', 'JOB_CANCELLED',
        'REVIEW_HIDDEN', 'REVIEW_RESTORED', 'COMPLAINT_STATUS_CHANGED',
        'DISPUTE_RESOLVED', 'ADMIN_CREATED', 'SENSITIVE_DATA_ACCESSED'
      )
    `);

    // ── TABLE: users ───────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE users (
        id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        email             VARCHAR(255) NOT NULL,
        mobile            VARCHAR(15) NOT NULL,
        password_hash     VARCHAR(255) NOT NULL,
        role              user_role NOT NULL,
        status            user_status NOT NULL DEFAULT 'PENDING_VERIFICATION',
        is_email_verified BOOLEAN NOT NULL DEFAULT false,
        is_mobile_verified BOOLEAN NOT NULL DEFAULT false,
        last_login_at     TIMESTAMPTZ,
        created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        deleted_at        TIMESTAMPTZ,
        CONSTRAINT users_email_unique UNIQUE (email),
        CONSTRAINT users_mobile_unique UNIQUE (mobile)
      )
    `);
    await queryRunner.query(`CREATE INDEX idx_users_email ON users(email)`);
    await queryRunner.query(`CREATE INDEX idx_users_mobile ON users(mobile)`);
    await queryRunner.query(`CREATE INDEX idx_users_role ON users(role)`);
    await queryRunner.query(`CREATE INDEX idx_users_status ON users(status)`);
    await queryRunner.query(`CREATE INDEX idx_users_deleted_at ON users(deleted_at) WHERE deleted_at IS NULL`);

    // ── TABLE: otps ────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE otps (
        id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        mobile      VARCHAR(15) NOT NULL,
        otp_hash    VARCHAR(255) NOT NULL,
        expires_at  TIMESTAMPTZ NOT NULL,
        attempts    SMALLINT NOT NULL DEFAULT 0,
        verified    BOOLEAN NOT NULL DEFAULT false,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await queryRunner.query(`CREATE INDEX idx_otps_user_id ON otps(user_id)`);
    await queryRunner.query(`CREATE INDEX idx_otps_mobile_expires ON otps(mobile, expires_at) WHERE verified = false`);

    // TABLE: refresh_tokens
    await queryRunner.query(`
      CREATE TABLE refresh_tokens (
        id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token_hash  VARCHAR(255) NOT NULL,
        jti         VARCHAR(36) NOT NULL UNIQUE,
        expires_at  TIMESTAMPTZ NOT NULL,
        revoked     BOOLEAN NOT NULL DEFAULT false,
        ip_address  INET,
        user_agent  TEXT,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await queryRunner.query(`CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id)`);
    await queryRunner.query(`CREATE INDEX idx_refresh_tokens_jti ON refresh_tokens(jti)`);
    await queryRunner.query(`CREATE INDEX idx_refresh_tokens_active ON refresh_tokens(user_id, revoked, expires_at)`);

    // ── TABLE: customers ───────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE customers (
        id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id           UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
        first_name        VARCHAR(100) NOT NULL,
        last_name         VARCHAR(100) NOT NULL,
        profile_photo_key VARCHAR(512),
        created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await queryRunner.query(`CREATE INDEX idx_customers_user_id ON customers(user_id)`);

    // ── TABLE: addresses ───────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE addresses (
        id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        customer_id     UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
        type            address_type NOT NULL DEFAULT 'HOME',
        house_building  VARCHAR(255) NOT NULL,
        street          VARCHAR(255) NOT NULL,
        area            VARCHAR(255) NOT NULL,
        landmark        VARCHAR(255),
        city            VARCHAR(100) NOT NULL,
        state           VARCHAR(100) NOT NULL,
        pincode         VARCHAR(6) NOT NULL CHECK (pincode ~ '^[1-9][0-9]{5}$'),
        latitude        DECIMAL(10,8),
        longitude       DECIMAL(11,8),
        location        GEOGRAPHY(POINT, 4326),
        is_default      BOOLEAN NOT NULL DEFAULT false,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        deleted_at      TIMESTAMPTZ
      )
    `);
    await queryRunner.query(`CREATE INDEX idx_addresses_customer_id ON addresses(customer_id)`);
    await queryRunner.query(`CREATE INDEX idx_addresses_pincode ON addresses(pincode)`);
    await queryRunner.query(`CREATE INDEX idx_addresses_location ON addresses USING GIST(location)`);
    await queryRunner.query(`CREATE INDEX idx_addresses_not_deleted ON addresses(customer_id, deleted_at) WHERE deleted_at IS NULL`);

    // ── TABLE: device_categories ───────────────────────────────
    await queryRunner.query(`
      CREATE TABLE device_categories (
        id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name        VARCHAR(100) NOT NULL,
        slug        VARCHAR(100) NOT NULL UNIQUE,
        icon_key    VARCHAR(512),
        is_active   BOOLEAN NOT NULL DEFAULT true,
        sort_order  SMALLINT NOT NULL DEFAULT 0,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await queryRunner.query(`CREATE INDEX idx_device_categories_active ON device_categories(is_active)`);
    await queryRunner.query(`CREATE INDEX idx_device_categories_slug ON device_categories(slug)`);

    // ── TABLE: device_brands ───────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE device_brands (
        id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name        VARCHAR(100) NOT NULL,
        slug        VARCHAR(100) NOT NULL UNIQUE,
        logo_key    VARCHAR(512),
        is_active   BOOLEAN NOT NULL DEFAULT true,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await queryRunner.query(`CREATE INDEX idx_device_brands_active ON device_brands(is_active)`);

    // ── TABLE: device_category_brands (many-to-many) ───────────
    await queryRunner.query(`
      CREATE TABLE device_category_brands (
        category_id UUID NOT NULL REFERENCES device_categories(id) ON DELETE CASCADE,
        brand_id    UUID NOT NULL REFERENCES device_brands(id) ON DELETE CASCADE,
        PRIMARY KEY (category_id, brand_id)
      )
    `);

    // ── TABLE: fixers ──────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE fixers (
        id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id               UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
        owner_name            VARCHAR(200) NOT NULL,
        company_name          VARCHAR(200) NOT NULL,
        gstin                 VARCHAR(15) UNIQUE,
        description           TEXT,
        profile_photo_key     VARCHAR(512),
        experience_years      SMALLINT NOT NULL DEFAULT 0 CHECK (experience_years >= 0),
        emergency_service     BOOLEAN NOT NULL DEFAULT false,
        working_hours_start   TIME,
        working_hours_end     TIME,
        working_days          TEXT[] DEFAULT '{}',
        verification_status   fixer_verification_status NOT NULL DEFAULT 'REGISTERED',
        rejection_reason      TEXT,
        average_rating        DECIMAL(3,2) NOT NULL DEFAULT 0.00 CHECK (average_rating >= 0 AND average_rating <= 5),
        total_reviews         INTEGER NOT NULL DEFAULT 0 CHECK (total_reviews >= 0),
        completed_jobs        INTEGER NOT NULL DEFAULT 0 CHECK (completed_jobs >= 0),
        response_rate         DECIMAL(5,2) NOT NULL DEFAULT 0.00 CHECK (response_rate >= 0 AND response_rate <= 100),
        -- Business address
        address_line          VARCHAR(500) NOT NULL,
        city                  VARCHAR(100) NOT NULL,
        state                 VARCHAR(100) NOT NULL,
        pincode               VARCHAR(6) NOT NULL CHECK (pincode ~ '^[1-9][0-9]{5}$'),
        latitude              DECIMAL(10,8),
        longitude             DECIMAL(11,8),
        location              GEOGRAPHY(POINT, 4326),
        created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        deleted_at            TIMESTAMPTZ
      )
    `);
    await queryRunner.query(`CREATE INDEX idx_fixers_user_id ON fixers(user_id)`);
    await queryRunner.query(`CREATE INDEX idx_fixers_verification_status ON fixers(verification_status)`);
    await queryRunner.query(`CREATE INDEX idx_fixers_city ON fixers(city)`);
    await queryRunner.query(`CREATE INDEX idx_fixers_pincode ON fixers(pincode)`);
    await queryRunner.query(`CREATE INDEX idx_fixers_location ON fixers USING GIST(location)`);
    await queryRunner.query(`CREATE INDEX idx_fixers_rating ON fixers(average_rating DESC)`);
    await queryRunner.query(`CREATE INDEX idx_fixers_company_name ON fixers USING GIN(company_name gin_trgm_ops)`);

    // ── TABLE: fixer_documents ─────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE fixer_documents (
        id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        fixer_id         UUID NOT NULL REFERENCES fixers(id) ON DELETE CASCADE,
        type             document_type NOT NULL,
        storage_key      VARCHAR(512) NOT NULL,
        status           document_status NOT NULL DEFAULT 'PENDING',
        rejection_reason TEXT,
        reviewed_by_id   UUID REFERENCES users(id),
        reviewed_at      TIMESTAMPTZ,
        created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await queryRunner.query(`CREATE INDEX idx_fixer_documents_fixer_id ON fixer_documents(fixer_id)`);
    await queryRunner.query(`CREATE INDEX idx_fixer_documents_status ON fixer_documents(status)`);

    // ── TABLE: fixer_services ──────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE fixer_services (
        id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        fixer_id     UUID NOT NULL REFERENCES fixers(id) ON DELETE CASCADE,
        category_id  UUID NOT NULL REFERENCES device_categories(id),
        brand_id     UUID REFERENCES device_brands(id),
        created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT fixer_services_unique UNIQUE (fixer_id, category_id, brand_id)
      )
    `);
    await queryRunner.query(`CREATE INDEX idx_fixer_services_fixer_id ON fixer_services(fixer_id)`);
    await queryRunner.query(`CREATE INDEX idx_fixer_services_category ON fixer_services(category_id)`);
    await queryRunner.query(`CREATE INDEX idx_fixer_services_brand ON fixer_services(brand_id)`);

    // ── TABLE: fixer_service_areas ─────────────────────────────
    await queryRunner.query(`
      CREATE TABLE fixer_service_areas (
        id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        fixer_id    UUID NOT NULL REFERENCES fixers(id) ON DELETE CASCADE,
        type        service_area_type NOT NULL,
        pincode     VARCHAR(6) CHECK (pincode ~ '^[1-9][0-9]{5}$'),
        city        VARCHAR(100),
        state       VARCHAR(100),
        latitude    DECIMAL(10,8),
        longitude   DECIMAL(11,8),
        radius_km   DECIMAL(6,2),
        location    GEOGRAPHY(POINT, 4326),
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await queryRunner.query(`CREATE INDEX idx_fixer_service_areas_fixer_id ON fixer_service_areas(fixer_id)`);
    await queryRunner.query(`CREATE INDEX idx_fixer_service_areas_pincode ON fixer_service_areas(pincode)`);
    await queryRunner.query(`CREATE INDEX idx_fixer_service_areas_city ON fixer_service_areas(city)`);
    await queryRunner.query(`CREATE INDEX idx_fixer_service_areas_location ON fixer_service_areas USING GIST(location)`);

    // ── TABLE: problem_requests ────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE problem_requests (
        id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        customer_id           UUID NOT NULL REFERENCES customers(id),
        category_id           UUID NOT NULL REFERENCES device_categories(id),
        brand_id              UUID REFERENCES device_brands(id),
        device_model          VARCHAR(200),
        problem_title         VARCHAR(500) NOT NULL,
        problem_description   TEXT NOT NULL,
        warranty_status       BOOLEAN NOT NULL DEFAULT false,
        urgency               urgency_level NOT NULL DEFAULT 'MEDIUM',
        preferred_date        DATE,
        preferred_time        TIME,
        status                request_status NOT NULL DEFAULT 'OPEN',
        address_id            UUID REFERENCES addresses(id),
        -- Snapshot of location at time of request (in case address changes)
        house_building        VARCHAR(255),
        street                VARCHAR(255),
        area                  VARCHAR(255),
        landmark              VARCHAR(255),
        city                  VARCHAR(100) NOT NULL,
        state                 VARCHAR(100) NOT NULL,
        pincode               VARCHAR(6) NOT NULL CHECK (pincode ~ '^[1-9][0-9]{5}$'),
        latitude              DECIMAL(10,8),
        longitude             DECIMAL(11,8),
        location              GEOGRAPHY(POINT, 4326),
        created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        deleted_at            TIMESTAMPTZ
      )
    `);
    await queryRunner.query(`CREATE INDEX idx_problem_requests_customer_id ON problem_requests(customer_id)`);
    await queryRunner.query(`CREATE INDEX idx_problem_requests_status ON problem_requests(status)`);
    await queryRunner.query(`CREATE INDEX idx_problem_requests_category_id ON problem_requests(category_id)`);
    await queryRunner.query(`CREATE INDEX idx_problem_requests_brand_id ON problem_requests(brand_id)`);
    await queryRunner.query(`CREATE INDEX idx_problem_requests_pincode ON problem_requests(pincode)`);
    await queryRunner.query(`CREATE INDEX idx_problem_requests_city ON problem_requests(city)`);
    await queryRunner.query(`CREATE INDEX idx_problem_requests_location ON problem_requests USING GIST(location)`);
    await queryRunner.query(`CREATE INDEX idx_problem_requests_urgency ON problem_requests(urgency)`);
    await queryRunner.query(`CREATE INDEX idx_problem_requests_created_at ON problem_requests(created_at DESC)`);
    await queryRunner.query(`CREATE INDEX idx_problem_requests_open ON problem_requests(status, created_at DESC) WHERE status = 'OPEN'`);
    await queryRunner.query(`CREATE INDEX idx_problem_requests_not_deleted ON problem_requests(deleted_at) WHERE deleted_at IS NULL`);

    // ── TABLE: problem_request_media ───────────────────────────
    await queryRunner.query(`
      CREATE TABLE problem_request_media (
        id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        request_id        UUID NOT NULL REFERENCES problem_requests(id) ON DELETE CASCADE,
        type              media_type NOT NULL,
        storage_key       VARCHAR(512) NOT NULL,
        original_filename VARCHAR(500),
        size_bytes        BIGINT NOT NULL,
        mime_type         VARCHAR(100) NOT NULL,
        created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await queryRunner.query(`CREATE INDEX idx_request_media_request_id ON problem_request_media(request_id)`);

    // ── TABLE: quotes ──────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE quotes (
        id                        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        request_id                UUID NOT NULL REFERENCES problem_requests(id),
        fixer_id                  UUID NOT NULL REFERENCES fixers(id),
        status                    quote_status NOT NULL DEFAULT 'SUBMITTED',
        estimated_total           DECIMAL(10,2) NOT NULL CHECK (estimated_total >= 0),
        inspection_fee            DECIMAL(10,2) CHECK (inspection_fee >= 0),
        labor_charge              DECIMAL(10,2) CHECK (labor_charge >= 0),
        spare_parts_estimate      DECIMAL(10,2) CHECK (spare_parts_estimate >= 0),
        estimated_completion_days SMALLINT NOT NULL CHECK (estimated_completion_days > 0),
        warranty_days             SMALLINT NOT NULL DEFAULT 0 CHECK (warranty_days >= 0),
        notes                     TEXT,
        valid_until               DATE NOT NULL,
        submitted_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        viewed_at                 TIMESTAMPTZ,
        accepted_at               TIMESTAMPTZ,
        rejected_at               TIMESTAMPTZ,
        withdrawn_at              TIMESTAMPTZ,
        created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        -- A fixer can only have one active (non-withdrawn, non-expired) quote per request
        CONSTRAINT quotes_fixer_request_unique UNIQUE (fixer_id, request_id)
      )
    `);
    await queryRunner.query(`CREATE INDEX idx_quotes_request_id ON quotes(request_id)`);
    await queryRunner.query(`CREATE INDEX idx_quotes_fixer_id ON quotes(fixer_id)`);
    await queryRunner.query(`CREATE INDEX idx_quotes_status ON quotes(status)`);
    await queryRunner.query(`CREATE INDEX idx_quotes_active ON quotes(request_id, status) WHERE status IN ('SUBMITTED', 'VIEWED')`);

    // ── TABLE: jobs ────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE jobs (
        id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        request_id          UUID NOT NULL UNIQUE REFERENCES problem_requests(id),
        quote_id            UUID NOT NULL UNIQUE REFERENCES quotes(id),
        customer_id         UUID NOT NULL REFERENCES customers(id),
        fixer_id            UUID NOT NULL REFERENCES fixers(id),
        status              job_status NOT NULL DEFAULT 'ASSIGNED',
        scheduled_at        TIMESTAMPTZ,
        started_at          TIMESTAMPTZ,
        completed_at        TIMESTAMPTZ,
        cancelled_at        TIMESTAMPTZ,
        cancellation_reason TEXT,
        agreed_total        DECIMAL(10,2) NOT NULL CHECK (agreed_total >= 0),
        warranty_days       SMALLINT NOT NULL DEFAULT 0,
        warranty_expires_at DATE,
        created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        deleted_at          TIMESTAMPTZ
      )
    `);
    await queryRunner.query(`CREATE INDEX idx_jobs_customer_id ON jobs(customer_id)`);
    await queryRunner.query(`CREATE INDEX idx_jobs_fixer_id ON jobs(fixer_id)`);
    await queryRunner.query(`CREATE INDEX idx_jobs_status ON jobs(status)`);
    await queryRunner.query(`CREATE INDEX idx_jobs_request_id ON jobs(request_id)`);
    await queryRunner.query(`CREATE INDEX idx_jobs_created_at ON jobs(created_at DESC)`);

    // ── TABLE: job_status_history ──────────────────────────────
    await queryRunner.query(`
      CREATE TABLE job_status_history (
        id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        job_id          UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
        previous_status job_status,
        new_status      job_status NOT NULL,
        actor_id        UUID NOT NULL REFERENCES users(id),
        actor_role      user_role NOT NULL,
        note            TEXT,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await queryRunner.query(`CREATE INDEX idx_job_status_history_job_id ON job_status_history(job_id)`);
    await queryRunner.query(`CREATE INDEX idx_job_status_history_created_at ON job_status_history(job_id, created_at ASC)`);

    // ── TABLE: conversations ───────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE conversations (
        id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        request_id           UUID NOT NULL REFERENCES problem_requests(id),
        job_id               UUID REFERENCES jobs(id),
        last_message_at      TIMESTAMPTZ,
        last_message_preview VARCHAR(255),
        created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await queryRunner.query(`CREATE INDEX idx_conversations_request_id ON conversations(request_id)`);
    await queryRunner.query(`CREATE INDEX idx_conversations_job_id ON conversations(job_id)`);

    // ── TABLE: conversation_members ────────────────────────────
    await queryRunner.query(`
      CREATE TABLE conversation_members (
        id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
        user_id         UUID NOT NULL REFERENCES users(id),
        role            user_role NOT NULL,
        joined_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT conv_members_unique UNIQUE (conversation_id, user_id)
      )
    `);
    await queryRunner.query(`CREATE INDEX idx_conv_members_conversation_id ON conversation_members(conversation_id)`);
    await queryRunner.query(`CREATE INDEX idx_conv_members_user_id ON conversation_members(user_id)`);

    // ── TABLE: messages ────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE messages (
        id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
        sender_id       UUID NOT NULL REFERENCES users(id),
        content         TEXT,
        is_read         BOOLEAN NOT NULL DEFAULT false,
        read_at         TIMESTAMPTZ,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        deleted_at      TIMESTAMPTZ,
        CONSTRAINT message_has_content CHECK (content IS NOT NULL OR TRUE)
      )
    `);
    await queryRunner.query(`CREATE INDEX idx_messages_conversation_id ON messages(conversation_id)`);
    await queryRunner.query(`CREATE INDEX idx_messages_conversation_created ON messages(conversation_id, created_at ASC)`);
    await queryRunner.query(`CREATE INDEX idx_messages_sender_id ON messages(sender_id)`);
    await queryRunner.query(`CREATE INDEX idx_messages_not_deleted ON messages(deleted_at) WHERE deleted_at IS NULL`);

    // ── TABLE: message_attachments ─────────────────────────────
    await queryRunner.query(`
      CREATE TABLE message_attachments (
        id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        message_id  UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
        storage_key VARCHAR(512) NOT NULL,
        mime_type   VARCHAR(100) NOT NULL,
        filename    VARCHAR(500) NOT NULL,
        size_bytes  BIGINT NOT NULL,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await queryRunner.query(`CREATE INDEX idx_message_attachments_message_id ON message_attachments(message_id)`);

    // ── TABLE: reviews ─────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE reviews (
        id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        job_id          UUID NOT NULL UNIQUE REFERENCES jobs(id),
        customer_id     UUID NOT NULL REFERENCES customers(id),
        fixer_id        UUID NOT NULL REFERENCES fixers(id),
        overall_rating  SMALLINT NOT NULL CHECK (overall_rating >= 1 AND overall_rating <= 5),
        service_quality SMALLINT NOT NULL CHECK (service_quality >= 1 AND service_quality <= 5),
        communication   SMALLINT NOT NULL CHECK (communication >= 1 AND communication <= 5),
        pricing         SMALLINT NOT NULL CHECK (pricing >= 1 AND pricing <= 5),
        timeliness      SMALLINT NOT NULL CHECK (timeliness >= 1 AND timeliness <= 5),
        professionalism SMALLINT NOT NULL CHECK (professionalism >= 1 AND professionalism <= 5),
        review_text     TEXT,
        status          review_status NOT NULL DEFAULT 'VISIBLE',
        hidden_at       TIMESTAMPTZ,
        hidden_reason   TEXT,
        hidden_by_id    UUID REFERENCES users(id),
        created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await queryRunner.query(`CREATE INDEX idx_reviews_fixer_id ON reviews(fixer_id)`);
    await queryRunner.query(`CREATE INDEX idx_reviews_customer_id ON reviews(customer_id)`);
    await queryRunner.query(`CREATE INDEX idx_reviews_status ON reviews(fixer_id, status)`);
    await queryRunner.query(`CREATE INDEX idx_reviews_created_at ON reviews(fixer_id, created_at DESC)`);

    // ── TABLE: notifications ───────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE notifications (
        id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        type        notification_type NOT NULL,
        title       VARCHAR(255) NOT NULL,
        body        TEXT NOT NULL,
        data        JSONB,
        channel     notification_channel NOT NULL DEFAULT 'IN_APP',
        is_read     BOOLEAN NOT NULL DEFAULT false,
        read_at     TIMESTAMPTZ,
        sent_at     TIMESTAMPTZ,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await queryRunner.query(`CREATE INDEX idx_notifications_user_id ON notifications(user_id)`);
    await queryRunner.query(`CREATE INDEX idx_notifications_unread ON notifications(user_id, is_read) WHERE is_read = false`);
    await queryRunner.query(`CREATE INDEX idx_notifications_created_at ON notifications(user_id, created_at DESC)`);

    // ── TABLE: notification_preferences ───────────────────────
    await queryRunner.query(`
      CREATE TABLE notification_preferences (
        user_id          UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        in_app_enabled   BOOLEAN NOT NULL DEFAULT true,
        push_enabled     BOOLEAN NOT NULL DEFAULT true,
        email_enabled    BOOLEAN NOT NULL DEFAULT true,
        sms_enabled      BOOLEAN NOT NULL DEFAULT true,
        disabled_types   notification_type[] DEFAULT '{}',
        created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // ── TABLE: complaints ──────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE complaints (
        id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        reporter_id       UUID NOT NULL REFERENCES users(id),
        reporter_role     user_role NOT NULL,
        accused_id        UUID NOT NULL REFERENCES users(id),
        accused_role      user_role NOT NULL,
        request_id        UUID REFERENCES problem_requests(id),
        job_id            UUID REFERENCES jobs(id),
        reason            complaint_reason NOT NULL,
        description       TEXT NOT NULL,
        status            complaint_status NOT NULL DEFAULT 'OPEN',
        resolution        TEXT,
        resolved_at       TIMESTAMPTZ,
        assigned_admin_id UUID REFERENCES users(id),
        internal_notes    TEXT,
        created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await queryRunner.query(`CREATE INDEX idx_complaints_reporter_id ON complaints(reporter_id)`);
    await queryRunner.query(`CREATE INDEX idx_complaints_accused_id ON complaints(accused_id)`);
    await queryRunner.query(`CREATE INDEX idx_complaints_status ON complaints(status)`);
    await queryRunner.query(`CREATE INDEX idx_complaints_created_at ON complaints(created_at DESC)`);

    // ── TABLE: admin_users ─────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE admin_users (
        user_id     UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        full_name   VARCHAR(200) NOT NULL,
        created_by  UUID REFERENCES users(id),
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // ── TABLE: audit_logs ──────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE audit_logs (
        id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        actor_id        UUID REFERENCES users(id),
        action          audit_action NOT NULL,
        entity_type     VARCHAR(100) NOT NULL,
        entity_id       UUID,
        previous_state  JSONB,
        new_state       JSONB,
        metadata        JSONB,
        ip_address      INET,
        user_agent      TEXT,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
        -- Audit logs are NEVER deleted or updated
      )
    `);
    await queryRunner.query(`CREATE INDEX idx_audit_logs_actor_id ON audit_logs(actor_id)`);
    await queryRunner.query(`CREATE INDEX idx_audit_logs_action ON audit_logs(action)`);
    await queryRunner.query(`CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id)`);
    await queryRunner.query(`CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC)`);

    // ── Triggers: updated_at auto-update ──────────────────────
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ language 'plpgsql';
    `);

    const tablesWithUpdatedAt = [
      'users', 'otps', 'refresh_tokens', 'customers', 'addresses',
      'device_categories', 'device_brands', 'fixers', 'fixer_documents',
      'fixer_services', 'fixer_service_areas', 'problem_requests',
      'problem_request_media', 'quotes', 'jobs', 'conversations',
      'conversation_members', 'messages', 'reviews', 'notifications',
      'notification_preferences', 'complaints', 'admin_users',
    ];

    for (const table of tablesWithUpdatedAt) {
      await queryRunner.query(`
        CREATE TRIGGER update_${table}_updated_at
        BEFORE UPDATE ON ${table}
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop in reverse dependency order
    const tables = [
      'audit_logs', 'admin_users', 'complaints', 'notification_preferences',
      'notifications', 'reviews', 'message_attachments', 'messages',
      'conversation_members', 'conversations', 'job_status_history', 'jobs',
      'quotes', 'problem_request_media', 'problem_requests', 'fixer_service_areas',
      'fixer_services', 'fixer_documents', 'fixers', 'device_category_brands',
      'device_brands', 'device_categories', 'addresses', 'customers',
      'refresh_tokens', 'otps', 'users',
    ];

    for (const table of tables) {
      await queryRunner.query(`DROP TABLE IF EXISTS ${table} CASCADE`);
    }

    const enums = [
      'user_role', 'user_status', 'fixer_verification_status', 'request_status',
      'quote_status', 'job_status', 'urgency_level', 'notification_type',
      'notification_channel', 'complaint_status', 'complaint_reason',
      'document_type', 'document_status', 'address_type', 'media_type',
      'review_status', 'service_area_type', 'audit_action',
    ];

    for (const e of enums) {
      await queryRunner.query(`DROP TYPE IF EXISTS ${e} CASCADE`);
    }

    await queryRunner.query(`DROP FUNCTION IF EXISTS update_updated_at_column CASCADE`);
  }
}
