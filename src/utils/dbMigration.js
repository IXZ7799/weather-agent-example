/**
 * Database migration utility for Supabase
 * Helps apply SQL migrations to the Supabase database
 */

import fs from 'fs';
import path from 'path';
import { supabase } from '@/integrations/supabase/client';

/**
 * Apply a specific migration file to the Supabase database
 * @param {string} migrationName - Name of the migration file (without extension)
 * @returns {Promise<Object>} - Result of the migration
 */
export const applyMigration = async (migrationName) => {
  try {
    const migrationPath = path.join(process.cwd(), 'src', 'db', 'migrations', `${migrationName}.sql`);
    
    // Read the migration file
    const migrationSql = fs.readFileSync(migrationPath, 'utf8');
    
    // Execute the SQL migration
    const { data, error } = await supabase.rpc('exec_sql', { sql: migrationSql });
    
    if (error) {
      throw new Error(`Migration error: ${error.message}`);
    }
    
    console.log(`Migration ${migrationName} applied successfully`);
    return { success: true, data };
  } catch (error) {
    console.error('Migration failed:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Apply all migrations in the migrations directory
 * @returns {Promise<Object>} - Result of the migrations
 */
export const applyAllMigrations = async () => {
  try {
    const migrationsDir = path.join(process.cwd(), 'src', 'db', 'migrations');
    
    // Get all SQL files in the migrations directory
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort(); // Apply in alphabetical order
    
    const results = [];
    
    // Apply each migration
    for (const file of migrationFiles) {
      const migrationName = file.replace('.sql', '');
      const result = await applyMigration(migrationName);
      results.push({ file, ...result });
    }
    
    return { success: true, results };
  } catch (error) {
    console.error('Migration process failed:', error);
    return { success: false, error: error.message };
  }
};

export default {
  applyMigration,
  applyAllMigrations
};
