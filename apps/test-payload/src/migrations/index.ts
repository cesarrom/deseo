import * as migration_20260619_182447_add_posts_table from './20260619_182447_add_posts_table';

export const migrations = [
  {
    up: migration_20260619_182447_add_posts_table.up,
    down: migration_20260619_182447_add_posts_table.down,
    name: '20260619_182447_add_posts_table'
  },
];
