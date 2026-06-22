import { NativeConnection, Worker } from '@temporalio/worker';
import * as activities from '../../../temporal/activities/index';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function run() {
  const connection = await NativeConnection.connect({
    address: process.env.TEMPORAL_URL || 'localhost:7233',
  });

  const worker = await Worker.create({
    connection,
    workflowsPath: resolve(__dirname, '../../../temporal/workflows/index.ts'),
    activities,
    taskQueue: 'deseo-main-queue',
    identity: `deseo-worker-${process.pid}`
  });

  console.log('🔨 Temporal worker starting...');
  console.log(`📋 Task queue: deseo-main-queue`);
  console.log(`🆔 Worker identity: deseo-worker-${process.pid}`);
  console.log(`📡 Connected to Temporal at: ${process.env.TEMPORAL_URL || 'localhost:7233'}`);
  
  await worker.run();
}

run().catch((err) => {
  console.error('Worker failed:', err);
  process.exit(1);
});
