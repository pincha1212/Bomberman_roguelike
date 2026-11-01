import { relations } from 'drizzle-orm';
import { integer, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';

// Users table linked with Firebase Auth UID
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(), // Firebase Auth UID
  email: text('email').notNull(),
  displayName: text('display_name'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Leaderboard entries for Bomberman Roguelike runs
export const leaderboard = pgTable('leaderboard', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id)
    .notNull(),
  playerName: text('player_name').notNull(),
  score: integer('score').notNull(),
  depth: integer('depth').notNull(),
  runTimeFormatted: text('run_time_formatted').notNull(),
  kills: integer('kills').notNull().default(0),
  coins: integer('coins').notNull().default(0),
  relicsCount: integer('relics_count').notNull().default(0),
  causeOfDeath: text('cause_of_death').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

// Relationships
export const usersRelations = relations(users, ({ many }) => ({
  leaderboardEntries: many(leaderboard),
}));

export const leaderboardRelations = relations(leaderboard, ({ one }) => ({
  user: one(users, {
    fields: [leaderboard.userId],
    references: [users.id],
  }),
}));
