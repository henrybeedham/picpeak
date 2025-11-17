exports.up = async function(knex) {
  // Add user upload settings to events table
  const hasAllowUserUploads = await knex.schema.hasColumn('events', 'allow_user_uploads');
  const hasUploadCategoryId = await knex.schema.hasColumn('events', 'upload_category_id');
  
  if (!hasAllowUserUploads || !hasUploadCategoryId) {
    await knex.schema.alterTable('events', function(table) {
      if (!hasAllowUserUploads) {
        table.boolean('allow_user_uploads').defaultTo(false);
      }
      if (!hasUploadCategoryId) {
        table.integer('upload_category_id').references('id').inTable('photo_categories').onDelete('SET NULL');
      }
    });
  }
  
  // Add uploaded_by field to photos table to track who uploaded
  const hasUploadedBy = await knex.schema.hasColumn('photos', 'uploaded_by');
  if (!hasUploadedBy) {
    await knex.schema.alterTable('photos', function(table) {
      table.string('uploaded_by').defaultTo('admin'); // 'admin' or guest identifier
    });
  }
};

exports.down = async function(knex) {
  await knex.schema.alterTable('events', function(table) {
    table.dropColumn('allow_user_uploads');
    table.dropColumn('upload_category_id');
  });
  
  await knex.schema.alterTable('photos', function(table) {
    table.dropColumn('uploaded_by');
  });
};