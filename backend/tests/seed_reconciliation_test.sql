-- ============================================================================
-- RECONCILIATION TEST DATA
-- 7 scenarios testing every confidence × cluster combination
-- ============================================================================
-- Run with:
--   docker exec ciri-db psql -U ciri -d ciri -f /test_data.sql
-- Or copy-paste into:
--   docker exec -it ciri-db psql -U ciri -d ciri
-- ============================================================================

-- Shared constants
-- Company:      00000000-0000-0000-0000-000000000001
-- Bank account:  00000000-0000-0000-0000-000000000010 (Driftskonto)

-- ── CLEANUP from previous runs ──
DELETE FROM cluster_data_points WHERE description_key LIKE 'TEST_%';
DELETE FROM reconciliation_matches WHERE bank_transaction_id IN
  (SELECT id FROM bank_transactions WHERE raw_description LIKE 'TEST_%');
DELETE FROM posteringer WHERE bilag_id IN
  (SELECT id FROM bilag WHERE description LIKE 'TEST_%');
DELETE FROM bilag WHERE description LIKE 'TEST_%';
DELETE FROM bank_transactions WHERE raw_description LIKE 'TEST_%';
DELETE FROM reconciliation_rules WHERE name LIKE 'TEST_%';


-- ============================================================================
-- CLUSTER DATA: Build history for accounts 6540/kontor, 7140/reise, 4010/varekjop
-- ============================================================================

-- ┌─────────────────────────────────────────────────────────────┐
-- │ STRONG CLUSTER: account 6540 / kontor                       │
-- │ 12 data points, 4 merchants, 0 overrides → strength ~0.80  │
-- └─────────────────────────────────────────────────────────────┘

INSERT INTO cluster_data_points (id, company_id, account_number, category, merchant_name, description_key, amount, direction, source, confirmed_at, was_overridden) VALUES
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', '6540', 'kontor', 'Microsoft',     'TEST_MICROSOFT_365',      1875.00, 'DEBIT', 'user_confirmed', NOW() - interval '10 days', false),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', '6540', 'kontor', 'Microsoft',     'TEST_MICROSOFT_AZURE',    2340.00, 'DEBIT', 'user_confirmed', NOW() - interval '20 days', false),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', '6540', 'kontor', 'GitHub',        'TEST_GITHUB_TEAM',         699.00, 'DEBIT', 'user_confirmed', NOW() - interval '15 days', false),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', '6540', 'kontor', 'GitHub',        'TEST_GITHUB_COPILOT',      190.00, 'DEBIT', 'user_confirmed', NOW() - interval '25 days', false),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', '6540', 'kontor', 'Dropbox',       'TEST_DROPBOX_BUSINESS',    250.00, 'DEBIT', 'user_confirmed', NOW() - interval '30 days', false),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', '6540', 'kontor', 'Dropbox',       'TEST_DROPBOX_EXTRA',       150.00, 'DEBIT', 'user_confirmed', NOW() - interval '35 days', false),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', '6540', 'kontor', 'Slack',         'TEST_SLACK_PRO',           850.00, 'DEBIT', 'user_confirmed', NOW() - interval '40 days', false),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', '6540', 'kontor', 'Slack',         'TEST_SLACK_ENTERPRISE',   1200.00, 'DEBIT', 'user_confirmed', NOW() - interval '45 days', false),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', '6540', 'kontor', 'Microsoft',     'TEST_MICROSOFT_TEAMS',     450.00, 'DEBIT', 'user_confirmed', NOW() - interval '5 days',  false),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', '6540', 'kontor', 'GitHub',        'TEST_GITHUB_ACTIONS',      320.00, 'DEBIT', 'user_confirmed', NOW() - interval '8 days',  false),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', '6540', 'kontor', 'Dropbox',       'TEST_DROPBOX_TRANSFER',    175.00, 'DEBIT', 'user_confirmed', NOW() - interval '12 days', false),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', '6540', 'kontor', 'Slack',         'TEST_SLACK_ADDON',         300.00, 'DEBIT', 'user_confirmed', NOW() - interval '18 days', false);


-- ┌─────────────────────────────────────────────────────────────┐
-- │ GROWING CLUSTER: account 7140 / reise                       │
-- │ 6 data points, 2 merchants, 0 overrides → strength ~0.55   │
-- └─────────────────────────────────────────────────────────────┘

INSERT INTO cluster_data_points (id, company_id, account_number, category, merchant_name, description_key, amount, direction, source, confirmed_at, was_overridden) VALUES
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', '7140', 'reise', 'SAS',           'TEST_SAS_FLIGHT',         1250.00, 'DEBIT', 'user_confirmed', NOW() - interval '10 days', false),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', '7140', 'reise', 'SAS',           'TEST_SAS_UPGRADE',        2100.00, 'DEBIT', 'user_confirmed', NOW() - interval '20 days', false),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', '7140', 'reise', 'SAS',           'TEST_SAS_BAGGAGE',         350.00, 'DEBIT', 'user_confirmed', NOW() - interval '30 days', false),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', '7140', 'reise', 'Norwegian',     'TEST_NORWEGIAN_FLIGHT',   1890.00, 'DEBIT', 'user_confirmed', NOW() - interval '15 days', false),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', '7140', 'reise', 'Norwegian',     'TEST_NORWEGIAN_FLEX',     2450.00, 'DEBIT', 'user_confirmed', NOW() - interval '25 days', false),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', '7140', 'reise', 'SAS',           'TEST_SAS_LOUNGE',          450.00, 'DEBIT', 'user_confirmed', NOW() - interval '35 days', false);


-- ┌─────────────────────────────────────────────────────────────┐
-- │ CONTAMINATED CLUSTER: account 4010 / varekjop               │
-- │ 10 data points, 3 merchants, 4 overrides (40%) → capped    │
-- └─────────────────────────────────────────────────────────────┘

INSERT INTO cluster_data_points (id, company_id, account_number, category, merchant_name, description_key, amount, direction, source, confirmed_at, was_overridden, overridden_at) VALUES
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', '4010', 'varekjop', 'Komplett',    'TEST_KOMPLETT_ORDER',     5500.00, 'DEBIT', 'user_confirmed', NOW() - interval '10 days', false, NULL),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', '4010', 'varekjop', 'Komplett',    'TEST_KOMPLETT_RETURN',    3200.00, 'DEBIT', 'user_confirmed', NOW() - interval '15 days', false, NULL),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', '4010', 'varekjop', 'Elkjop',      'TEST_ELKJOP_PURCHASE',    8900.00, 'DEBIT', 'user_confirmed', NOW() - interval '20 days', false, NULL),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', '4010', 'varekjop', 'Elkjop',      'TEST_ELKJOP_MONITOR',     4500.00, 'DEBIT', 'user_confirmed', NOW() - interval '25 days', false, NULL),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', '4010', 'varekjop', 'Power',       'TEST_POWER_PRINTER',      2800.00, 'DEBIT', 'user_confirmed', NOW() - interval '30 days', false, NULL),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', '4010', 'varekjop', 'Power',       'TEST_POWER_KEYBOARD',     1200.00, 'DEBIT', 'user_confirmed', NOW() - interval '35 days', false, NULL),
  -- These 4 were OVERRIDDEN by user (40% override rate → contaminated!)
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', '4010', 'varekjop', 'Komplett',    'TEST_KOMPLETT_WRONG1',    6600.00, 'DEBIT', 'auto_confirmed', NOW() - interval '12 days', true, NOW() - interval '11 days'),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', '4010', 'varekjop', 'Elkjop',      'TEST_ELKJOP_WRONG1',      7200.00, 'DEBIT', 'auto_confirmed', NOW() - interval '22 days', true, NOW() - interval '21 days'),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', '4010', 'varekjop', 'Power',       'TEST_POWER_WRONG1',       3100.00, 'DEBIT', 'auto_confirmed', NOW() - interval '32 days', true, NOW() - interval '31 days'),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', '4010', 'varekjop', 'Komplett',    'TEST_KOMPLETT_WRONG2',    4400.00, 'DEBIT', 'auto_confirmed', NOW() - interval '18 days', true, NOW() - interval '17 days'));


-- ============================================================================
-- SCENARIO 1: HIGH confidence + STRONG cluster → expect AUTO_CONFIRMED
-- Exact amount, similar name, close date → score ~0.95
-- ============================================================================

INSERT INTO bilag (id, company_id, bilag_number, document_date, receipt_date, description,
  gross_amount, net_amount, mva_amount, mva_code, counterparty_name, category,
  suggested_account, file_path, file_hash_sha256, original_filename, mime_type,
  status, created_by_ciri, ciri_confidence, created_at, updated_at)
VALUES (
  'eeee0001-0001-0001-0001-000000000001',
  '00000000-0000-0000-0000-000000000001',
  'TEST-S1-001', '2025-02-10', NOW(), 'TEST_Notion Team abonnement februar',
  1875.00, 1500.00, 375.00, '1', 'Notion Labs Inc', 'kontor',
  '6540', '/fake/path', 'abc123', 'notion_feb.pdf', 'application/pdf',
  'APPROVED', true, 0.95, NOW(), NOW()
);

INSERT INTO bank_transactions (id, company_id, bank_account_id, external_transaction_id,
  booking_date, amount, currency, direction, raw_description, merchant_name,
  category, reconciliation_status, reconciled_by_ciri, is_private,
  private_marked_by_ciri, match_attempts, imported_at, updated_at)
VALUES (
  'ffff0001-0001-0001-0001-000000000001',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000010',
  'TEST_TX_S1_001', '2025-02-10',
  -1875.00, 'NOK', 'DEBIT',
  'TEST_NOTION LABS TEAM PLAN FEB', 'Notion Labs Inc',
  'KONTOR', 'UNMATCHED', false, false,
  false, 0, NOW(), NOW()
);


-- ============================================================================
-- SCENARIO 2: MEDIUM confidence + STRONG cluster → expect AUTO_CONFIRMED
-- Exact amount but weak name match, 5-day date gap → score ~0.72
-- ============================================================================

INSERT INTO bilag (id, company_id, bilag_number, document_date, receipt_date, description,
  gross_amount, net_amount, mva_amount, mva_code, counterparty_name, category,
  suggested_account, file_path, file_hash_sha256, original_filename, mime_type,
  status, created_by_ciri, ciri_confidence, created_at, updated_at)
VALUES (
  'eeee0002-0002-0002-0002-000000000002',
  '00000000-0000-0000-0000-000000000001',
  'TEST-S2-002', '2025-02-05', NOW(), 'TEST_Programvarelisenser Q1',
  2340.00, 1872.00, 468.00, '1', 'IT-Innkjop AS', 'kontor',
  '6540', '/fake/path', 'def456', 'itlisenser_q1.pdf', 'application/pdf',
  'APPROVED', true, 0.88, NOW(), NOW()
);

INSERT INTO bank_transactions (id, company_id, bank_account_id, external_transaction_id,
  booking_date, amount, currency, direction, raw_description, merchant_name,
  category, reconciliation_status, reconciled_by_ciri, is_private,
  private_marked_by_ciri, match_attempts, imported_at, updated_at)
VALUES (
  'ffff0002-0002-0002-0002-000000000002',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000010',
  'TEST_TX_S2_002', '2025-02-10',
  -2340.00, 'NOK', 'DEBIT',
  'TEST_BETALING SOFTWARE LISENS', 'IT-Innkjop',
  'KONTOR', 'UNMATCHED', false, false,
  false, 0, NOW(), NOW()
);


-- ============================================================================
-- SCENARIO 3: HIGH confidence + GROWING cluster → expect AUTO_CONFIRMED
-- Exact amount, good name, close date → score ~0.92
-- ============================================================================

INSERT INTO bilag (id, company_id, bilag_number, document_date, receipt_date, description,
  gross_amount, net_amount, mva_amount, mva_code, counterparty_name, category,
  suggested_account, file_path, file_hash_sha256, original_filename, mime_type,
  status, created_by_ciri, ciri_confidence, created_at, updated_at)
VALUES (
  'eeee0003-0003-0003-0003-000000000003',
  '00000000-0000-0000-0000-000000000001',
  'TEST-S3-003', '2025-02-12', NOW(), 'TEST_SAS flybillett Bergen-Oslo',
  1890.00, 1890.00, 0.00, '5', 'SAS Scandinavian Airlines', 'reise',
  '7140', '/fake/path', 'ghi789', 'sas_bergen_oslo.pdf', 'application/pdf',
  'APPROVED', true, 0.94, NOW(), NOW()
);

INSERT INTO bank_transactions (id, company_id, bank_account_id, external_transaction_id,
  booking_date, amount, currency, direction, raw_description, merchant_name,
  category, reconciliation_status, reconciled_by_ciri, is_private,
  private_marked_by_ciri, match_attempts, imported_at, updated_at)
VALUES (
  'ffff0003-0003-0003-0003-000000000003',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000010',
  'TEST_TX_S3_003', '2025-02-13',
  -1890.00, 'NOK', 'DEBIT',
  'TEST_SAS SCANDINAVIAN BGO-OSL', 'SAS',
  'REISE', 'UNMATCHED', false, false,
  false, 0, NOW(), NOW()
);


-- ============================================================================
-- SCENARIO 4: MEDIUM confidence + GROWING cluster → expect SUGGESTED
-- Exact amount but weak name, 7-day gap → score ~0.72
-- Growing cluster can't lower threshold → blocks MEDIUM
-- ============================================================================

INSERT INTO bilag (id, company_id, bilag_number, document_date, receipt_date, description,
  gross_amount, net_amount, mva_amount, mva_code, counterparty_name, category,
  suggested_account, file_path, file_hash_sha256, original_filename, mime_type,
  status, created_by_ciri, ciri_confidence, created_at, updated_at)
VALUES (
  'eeee0004-0004-0004-0004-000000000004',
  '00000000-0000-0000-0000-000000000001',
  'TEST-S4-004', '2025-02-03', NOW(), 'TEST_Reiseutgifter konferanse',
  2450.00, 2450.00, 0.00, '5', 'Reiseregning Ansatt', 'reise',
  '7140', '/fake/path', 'jkl012', 'reise_konferanse.pdf', 'application/pdf',
  'APPROVED', true, 0.80, NOW(), NOW()
);

INSERT INTO bank_transactions (id, company_id, bank_account_id, external_transaction_id,
  booking_date, amount, currency, direction, raw_description, merchant_name,
  category, reconciliation_status, reconciled_by_ciri, is_private,
  private_marked_by_ciri, match_attempts, imported_at, updated_at)
VALUES (
  'ffff0004-0004-0004-0004-000000000004',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000010',
  'TEST_TX_S4_004', '2025-02-10',
  -2450.00, 'NOK', 'DEBIT',
  'TEST_BETALING REISE DIVERSE', 'Ukjent',
  'REISE', 'UNMATCHED', false, false,
  false, 0, NOW(), NOW()
);


-- ============================================================================
-- SCENARIO 5: HIGH confidence + NO cluster → expect SUGGESTED
-- Perfect match but brand new account (8010/telefon) has zero history
-- ============================================================================

INSERT INTO bilag (id, company_id, bilag_number, document_date, receipt_date, description,
  gross_amount, net_amount, mva_amount, mva_code, counterparty_name, category,
  suggested_account, file_path, file_hash_sha256, original_filename, mime_type,
  status, created_by_ciri, ciri_confidence, created_at, updated_at)
VALUES (
  'eeee0005-0005-0005-0005-000000000005',
  '00000000-0000-0000-0000-000000000001',
  'TEST-S5-005', '2025-02-14', NOW(), 'TEST_Telenor Bedrift mobilabonnement',
  599.00, 479.20, 119.80, '1', 'Telenor Norge AS', 'telefon',
  '6900', '/fake/path', 'mno345', 'telenor_feb.pdf', 'application/pdf',
  'APPROVED', true, 0.97, NOW(), NOW()
);

INSERT INTO bank_transactions (id, company_id, bank_account_id, external_transaction_id,
  booking_date, amount, currency, direction, raw_description, merchant_name,
  category, reconciliation_status, reconciled_by_ciri, is_private,
  private_marked_by_ciri, match_attempts, imported_at, updated_at)
VALUES (
  'ffff0005-0005-0005-0005-000000000005',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000010',
  'TEST_TX_S5_005', '2025-02-14',
  -599.00, 'NOK', 'DEBIT',
  'TEST_TELENOR NORGE BEDRIFT MOBIL', 'Telenor Norge AS',
  'UKATEGORISERT', 'UNMATCHED', false, false,
  false, 0, NOW(), NOW()
);


-- ============================================================================
-- SCENARIO 6: HIGH confidence + CONTAMINATED cluster → expect SUGGESTED
-- Perfect match but account 4010/varekjop has 40% override rate
-- ============================================================================

INSERT INTO bilag (id, company_id, bilag_number, document_date, receipt_date, description,
  gross_amount, net_amount, mva_amount, mva_code, counterparty_name, category,
  suggested_account, file_path, file_hash_sha256, original_filename, mime_type,
  status, created_by_ciri, ciri_confidence, created_at, updated_at)
VALUES (
  'eeee0006-0006-0006-0006-000000000006',
  '00000000-0000-0000-0000-000000000001',
  'TEST-S6-006', '2025-02-11', NOW(), 'TEST_Komplett.no serverkomponenter',
  8900.00, 7120.00, 1780.00, '1', 'Komplett Services AS', 'varekjop',
  '4010', '/fake/path', 'pqr678', 'komplett_server.pdf', 'application/pdf',
  'APPROVED', true, 0.96, NOW(), NOW()
);

INSERT INTO bank_transactions (id, company_id, bank_account_id, external_transaction_id,
  booking_date, amount, currency, direction, raw_description, merchant_name,
  category, reconciliation_status, reconciled_by_ciri, is_private,
  private_marked_by_ciri, match_attempts, imported_at, updated_at)
VALUES (
  'ffff0006-0006-0006-0006-000000000006',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000010',
  'TEST_TX_S6_006', '2025-02-12',
  -8900.00, 'NOK', 'DEBIT',
  'TEST_KOMPLETT SERVICES NETTBUTIKK', 'Komplett Services AS',
  'VAREKJOP', 'UNMATCHED', false, false,
  false, 0, NOW(), NOW()
);


-- ============================================================================
-- SCENARIO 7: LOW confidence + STRONG cluster → expect SUGGESTED
-- Amount mismatch (15%), bad name → score ~0.45
-- Even strong cluster can't save a LOW match
-- ============================================================================

INSERT INTO bilag (id, company_id, bilag_number, document_date, receipt_date, description,
  gross_amount, net_amount, mva_amount, mva_code, counterparty_name, category,
  suggested_account, file_path, file_hash_sha256, original_filename, mime_type,
  status, created_by_ciri, ciri_confidence, created_at, updated_at)
VALUES (
  'eeee0007-0007-0007-0007-000000000007',
  '00000000-0000-0000-0000-000000000001',
  'TEST-S7-007', '2025-01-28', NOW(), 'TEST_Diverse kontorrekvisita',
  1200.00, 960.00, 240.00, '1', 'Staples Norway AS', 'kontor',
  '6540', '/fake/path', 'stu901', 'staples_jan.pdf', 'application/pdf',
  'APPROVED', true, 0.70, NOW(), NOW()
);

INSERT INTO bank_transactions (id, company_id, bank_account_id, external_transaction_id,
  booking_date, amount, currency, direction, raw_description, merchant_name,
  category, reconciliation_status, reconciled_by_ciri, is_private,
  private_marked_by_ciri, match_attempts, imported_at, updated_at)
VALUES (
  'ffff0007-0007-0007-0007-000000000007',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000010',
  'TEST_TX_S7_007', '2025-02-12',
  -1380.00, 'NOK', 'DEBIT',
  'TEST_NETTHANDEL KONTORSENTER BUTIKK', 'Kontorsenter AS',
  'KONTOR', 'UNMATCHED', false, false,
  false, 0, NOW(), NOW()
);


-- Verify what we inserted
SELECT 'Bilags:' as type, count(*) as count FROM bilag WHERE description LIKE 'TEST_%'
UNION ALL
SELECT 'Transactions:', count(*) FROM bank_transactions WHERE raw_description LIKE 'TEST_%'
UNION ALL
SELECT 'Cluster points:', count(*) FROM cluster_data_points WHERE description_key LIKE 'TEST_%';
