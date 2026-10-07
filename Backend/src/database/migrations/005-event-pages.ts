import { legacyEventContent } from '../event-content.js'

const literal = (value: string) => `'${value.replaceAll("'", "''")}'`
export const eventPagesMigration = {
  version: 5,
  sql: `
    ALTER TABLE events ADD COLUMN slug TEXT NOT NULL DEFAULT '';
    UPDATE events SET slug = 'evento-' || id;
    ${legacyEventContent.map((event) => `
      UPDATE events SET slug = ${literal(event.slug)} WHERE seed_key = ${literal(event.key)};
      UPDATE events SET content = ${literal(event.content)} WHERE seed_key = ${literal(event.key)} AND TRIM(content) = '';
    `).join('\n')}
    UPDATE events SET slug = 'noite-pop' WHERE seed_key = 'demo-pop';
    CREATE UNIQUE INDEX events_slug ON events(slug);
  `,
}
