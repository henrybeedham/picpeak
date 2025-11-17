const knex = require('knex');
const path = require('path');

describe('Legacy Migrations - Idempotency Tests', () => {
  let db;
  
  beforeAll(async () => {
    // Create an in-memory SQLite database for testing
    db = knex({
      client: 'sqlite3',
      connection: {
        filename: ':memory:'
      },
      useNullAsDefault: true
    });
    
    // Create minimal schema for testing
    await db.schema.createTable('events', (table) => {
      table.increments('id').primary();
      table.string('slug').unique().notNullable();
    });
    
    await db.schema.createTable('photos', (table) => {
      table.increments('id').primary();
      table.string('filename').notNullable();
    });
    
    await db.schema.createTable('photo_categories', (table) => {
      table.increments('id').primary();
      table.string('name').notNullable();
    });
    
    await db.schema.createTable('email_templates', (table) => {
      table.increments('id').primary();
      table.string('template_key').unique().notNullable();
      table.string('subject');
      table.text('body_html');
      table.text('body_text');
    });
  });
  
  afterAll(async () => {
    await db.destroy();
  });
  
  test('Migration 011: should handle existing allow_user_uploads column', async () => {
    // Pre-add one of the columns to simulate partial migration
    await db.schema.alterTable('events', (table) => {
      table.boolean('allow_user_uploads').defaultTo(false);
    });
    
    // Run the migration - should not throw error
    const migration011 = require('../../migrations/legacy/011_add_user_upload_settings.js');
    await expect(migration011.up(db)).resolves.not.toThrow();
    
    // Verify both columns exist
    const hasAllowUserUploads = await db.schema.hasColumn('events', 'allow_user_uploads');
    const hasUploadCategoryId = await db.schema.hasColumn('events', 'upload_category_id');
    const hasUploadedBy = await db.schema.hasColumn('photos', 'uploaded_by');
    
    expect(hasAllowUserUploads).toBe(true);
    expect(hasUploadCategoryId).toBe(true);
    expect(hasUploadedBy).toBe(true);
  });
  
  test('Migration 011: should run successfully when run twice', async () => {
    const migration011 = require('../../migrations/legacy/011_add_user_upload_settings.js');
    
    // First run
    await expect(migration011.up(db)).resolves.not.toThrow();
    
    // Second run should also succeed (idempotent)
    await expect(migration011.up(db)).resolves.not.toThrow();
    
    // Verify columns still exist
    const hasAllowUserUploads = await db.schema.hasColumn('events', 'allow_user_uploads');
    expect(hasAllowUserUploads).toBe(true);
  });
  
  test('Migration 006: should handle existing photo_counter column', async () => {
    // Pre-add the column to simulate it already existing
    await db.schema.alterTable('photo_categories', (table) => {
      table.integer('photo_counter').defaultTo(0).notNullable();
    });
    
    // Run the migration - should not throw error
    const migration006 = require('../../migrations/legacy/006_add_photo_counter_to_categories.js');
    await expect(migration006.up(db)).resolves.not.toThrow();
    
    // Verify column exists
    const hasPhotoCounter = await db.schema.hasColumn('photo_categories', 'photo_counter');
    expect(hasPhotoCounter).toBe(true);
  });
  
  test('Migration 008: should handle already renamed email template columns', async () => {
    // Pre-rename the columns to simulate partial migration
    if (await db.schema.hasColumn('email_templates', 'subject')) {
      await db.schema.alterTable('email_templates', (table) => {
        table.renameColumn('subject', 'subject_en');
        table.renameColumn('body_html', 'body_html_en');
        table.renameColumn('body_text', 'body_text_en');
      });
    }
    
    // Run the migration - should not throw error
    const migration008 = require('../../migrations/legacy/008_add_language_support_to_email_templates.js');
    await expect(migration008.up(db)).resolves.not.toThrow();
    
    // Verify German columns were added
    const hasSubjectDe = await db.schema.hasColumn('email_templates', 'subject_de');
    const hasBodyHtmlDe = await db.schema.hasColumn('email_templates', 'body_html_de');
    
    expect(hasSubjectDe).toBe(true);
    expect(hasBodyHtmlDe).toBe(true);
  });
});
