import { env } from '../config/env.js';
import { executeOrchestration } from './orchestrator.js';

let queue = null;
let worker = null;

export async function initQueue() {
  if (!env.redisUrl) {
    console.warn('REDIS_URL not configured; using synchronous orchestration fallback.');
    return null;
  }

  try {
    const { Queue, Worker } = await import('bullmq');
    const { default: IORedis } = await import('ioredis');
    const connection = new IORedis(env.redisUrl, { maxRetriesPerRequest: null });

    queue = new Queue('agent-orchestration', {
      connection,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 },
        removeOnComplete: 100,
        removeOnFail: 200,
      },
    });

    worker = new Worker(
      'agent-orchestration',
      async (job) => executeOrchestration(job.data),
      { connection, concurrency: 4 }
    );

    return { queue, worker };
  } catch (error) {
    console.warn('BullMQ unavailable, falling back to synchronous orchestration.', error?.message || error);
    return null;
  }
}

export async function enqueueOrchestration(payload) {
  if (queue) {
    return queue.add('orchestrate', payload);
  }
  return executeOrchestration(payload);
}
