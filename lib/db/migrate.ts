import { config } from 'dotenv';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
config({
  path: '.env.local',
});

const runMigrate = async () => {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL is not defined');
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not defined');
  }

  console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
  console.log('Service Role Key:', process.env.SUPABASE_SERVICE_ROLE_KEY.substring(0, 5) + '...');

  console.log('⏳ Running migrations...');
  const start = Date.now();

  try {
    // Read SQL migration files from the migrations folder
    const migrationsDir = path.join(process.cwd(), 'lib/db/migrations');
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort(); // Ensure migrations run in order

    // Combine all migrations into a single file
    let combinedSQL = '';
    for (const file of migrationFiles) {
      console.log(`Adding migration: ${file}`);
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf8');
      combinedSQL += `\n-- Migration: ${file}\n${sql}\n`;
    }

    // Write combined SQL to a temporary file
    const tempFilePath = path.join(process.cwd(), 'combined_migrations.sql');
    fs.writeFileSync(tempFilePath, combinedSQL);
    console.log(`Combined migrations written to ${tempFilePath}`);

    // Extract project reference from URL
    const projectRef = process.env.NEXT_PUBLIC_SUPABASE_URL.match(/https:\/\/([^.]+)/)?.[1];
    if (!projectRef) {
      throw new Error('Could not extract project reference from Supabase URL');
    }

    // Use PSQL to execute the migrations
    // This requires the Supabase CLI to be installed and logged in
    console.log('Executing migrations with PSQL...');
    
    // Create a temporary .env file for psql
    const psqlEnvPath = path.join(process.cwd(), '.psql.env');
    fs.writeFileSync(psqlEnvPath, `
PGPASSWORD=${process.env.SUPABASE_SERVICE_ROLE_KEY}
PGUSER=postgres
PGHOST=db.${projectRef}.supabase.co
PGDATABASE=postgres
PGPORT=5432
    `);
    
    try {
      // Execute the SQL using psql
      const result = await execAsync(`
        source ${psqlEnvPath} && psql -f ${tempFilePath}
      `);
      console.log('Migration output:', result.stdout);
      if (result.stderr) {
        console.error('Migration errors:', result.stderr);
      }
    } catch (err) {
      console.error('Error executing migrations with PSQL:', err);
      
      // Alternative approach: Use the Supabase REST API
      console.log('Trying alternative approach with REST API...');
      
      // Create a simple HTML form to upload and execute the SQL
      const formPath = path.join(process.cwd(), 'migration_form.html');
      fs.writeFileSync(formPath, `
<!DOCTYPE html>
<html>
<head>
  <title>Manual Migration</title>
</head>
<body>
  <h1>Manual Migration</h1>
  <p>Please copy the SQL below and execute it in the Supabase SQL Editor:</p>
  <textarea style="width: 100%; height: 300px;">${combinedSQL}</textarea>
  <p>After executing the SQL, you can close this page.</p>
</body>
</html>
      `);
      
      console.log(`
==========================================================
MANUAL MIGRATION REQUIRED
==========================================================
1. Open ${formPath} in your browser
2. Copy the SQL
3. Go to your Supabase project: ${process.env.NEXT_PUBLIC_SUPABASE_URL}
4. Open the SQL Editor
5. Paste and execute the SQL
6. Return to this terminal and press Enter to continue
==========================================================
      `);
      
      // Wait for user input
      await new Promise(resolve => {
        process.stdin.once('data', () => {
          resolve(null);
        });
      });
    } finally {
      // Clean up temporary files
      try {
        fs.unlinkSync(psqlEnvPath);
      } catch (err) {
        console.error('Error cleaning up temporary files:', err);
      }
    }

    const end = Date.now();
    console.log('✅ Migrations completed in', end - start, 'ms');
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed');
    console.error(err);
    process.exit(1);
  }
};

runMigrate().catch((err) => {
  console.error('❌ Migration failed');
  console.error(err);
  process.exit(1);
});
