import { onUpdateTrigger } from '../../../utils/updateTimestamp.js';

export function up(knex) {
  return knex.schema
    .createTable('submissions', table => {
      table
        .increments('id')
        .primary()
        .unsigned();
      table.decimal('c2sRate');
      table.decimal('s2cRate');
      table.decimal('MinRTT');
      table.decimal('MaxRTT');
      table.decimal('latitude');
      table.decimal('longitude');
      table.string('address', 255);
      table.string('ClientIP', 255);
      table.string('FullResults', 2048);
      table.json('fields');
      table.timestamps(true, true);
    })
    .then(() =>
      knex.raw(
        onUpdateTrigger(knex.context.client.config.client, 'submissions'),
      ),
    );
}

export function down(knex) {
  return knex.schema.dropTable('submissions');
}
