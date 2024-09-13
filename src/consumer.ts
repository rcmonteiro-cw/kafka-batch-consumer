import { Kafka, Consumer, EachBatchPayload } from 'kafkajs';
import { cpus } from 'os';
import { fork, ChildProcess } from 'child_process';
import path from 'path';

const numCPUs = cpus().length;
const maxBatchSize = 100;
const task = path.resolve(__dirname, 'process-message.js');
let childProcesses: ChildProcess[] = [];

const kafka = new Kafka({
  clientId: 'batch-consumer',
  brokers: ['localhost:29092'],
});

const consumer = kafka.consumer({ groupId: 'batch-group' });

async function runConsumer() {
  await consumer.connect();
  await consumer.subscribe({ topic: 'batch-topic', fromBeginning: true });

  await consumer.run({
    eachBatch: async (payload: EachBatchPayload) => {
      const { batch, resolveOffset, heartbeat, isRunning, commitOffsetsIfNecessary } = payload;
      const messages = batch.messages;

      for (let i = 0; i < messages.length; i += maxBatchSize) {
        if (!isRunning()) break;

        const batchSlice = messages.slice(i, i + maxBatchSize);
        await processBatch(batchSlice);

        const lastOffset = batchSlice[batchSlice.length - 1].offset;
        resolveOffset(lastOffset);
        await commitOffsetsIfNecessary();
        await heartbeat();
      }
    },
  });
}

async function processBatch(batchSlice: any[]) {
  console.log(`Processing batch of ${batchSlice.length} messages`);
  
  const batchesPerProcess = Math.ceil(batchSlice.length / numCPUs);
  const processingPromises: Promise<void>[] = [];

  for (let i = 0; i < numCPUs; i++) {
    const start = i * batchesPerProcess;
    const end = Math.min((i + 1) * batchesPerProcess, batchSlice.length);
    const subBatch = batchSlice.slice(start, end);

    const promise = new Promise<void>((resolve) => {
      const child = fork(task);
      childProcesses.push(child);

      child.send({ batch: subBatch });

      child.on('message', (message) => {
        console.log(`Child process ${i} completed:`, message);
        childProcesses = childProcesses.filter(p => p !== child);
        resolve();
      });
    });

    processingPromises.push(promise);
  }

  await Promise.all(processingPromises);
  console.log('All child processes for this batch completed');
}

runConsumer().catch(console.error);
