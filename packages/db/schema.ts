import { pgTable, text, timestamp, boolean, integer, uuid } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const links = pgTable('links', {
  id: uuid('id').default(sql`gen_random_uuid()`).primaryKey(),
  slug: text('slug').notNull().unique(),
  destinationUrl: text('destination_url').notNull(),
  ownerId: uuid('owner_id'),
  isActive: boolean('is_active').notNull().default(true),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  clickLimit: integer('click_limit'),
  passwordHash: text('password_hash'),
  tags: text('tags').array(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().default(sql`now()`),
});

export const clicks = pgTable('clicks', {
  id: uuid('id').default(sql`gen_random_uuid()`).primaryKey(),
  linkId: uuid('link_id').notNull(),
  ts: timestamp('ts', { withTimezone: true }).notNull().default(sql`now()`),
  ipHash: text('ip_hash'),
  userAgent: text('user_agent'),
  referrer: text('referrer'),
  country: text('country'),
  uaDevice: text('ua_device'),
  uaBrowser: text('ua_browser'),
});


