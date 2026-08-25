const { execSync } = require('child_process');

function run(cmd, desc, ignoreError = false) {
  console.log(`\n▶️  ${desc}`);
  console.log(`$ ${cmd}`);
  try {
    execSync(cmd, { stdio: 'inherit' });
  } catch (err) {
    if (!ignoreError) {
      console.error(`❌ Failed: ${desc}`);
      process.exit(1);
    } else {
      console.warn(`⚠️ Warning: ${desc} exited with error (continuing)...`);
    }
  }
}

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  console.log('=====================================================');
  console.log('🔄 [FixMe] Triggering Automated Build & DB Refresh...');
  console.log('=====================================================');

  // 1. Docker compose down
  run('docker compose down', 'Stopping existing containers', true);

  // 2. Build monorepo
  run('npm run build', 'Building monorepo packages');

  // 3. Docker compose up services
  run(
    'docker compose up postgres redis minio minio-setup -d',
    'Starting postgres, redis, minio background containers',
    true
  );

  // 4. Wait for postgres to accept connections
  console.log('\n⏳ Waiting 5 seconds for PostgreSQL to initialize...');
  await sleep(5000);

  // 5. Database migrations
  run('npm run db:migrate --workspace=apps/api', 'Running database migrations', true);

  // 6. Database seed
  run('npm run db:seed:dev --workspace=apps/api', 'Seeding database with test data', true);

  console.log('\n=====================================================');
  console.log('✅ [FixMe] Automated refresh completed successfully!');
  console.log('=====================================================\n');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
