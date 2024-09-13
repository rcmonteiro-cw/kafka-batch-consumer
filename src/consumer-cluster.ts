import { Kafka } from 'kafkajs';
import { fork } from 'child_process';
import path from 'path';
import { initialize } from './cluster';

const kafka = new Kafka({
  clientId: 'batch-consumer',
  brokers: ['localhost:29092'],
});

const consumer = kafka.consumer({ groupId: 'batch-group' });
const task = path.resolve(__dirname, 'process-message.js');
const clusterSize = 10;
const batchSize = 10;

const run = async () => {
  await consumer.connect();
  await consumer.subscribe({ topic: 'batch-topic', fromBeginning: true });

  console.log('Consumer is ready...');

  await consumer.run({
    eachBatch: async ({ batch, resolveOffset, heartbeat, isRunning, isStale }) => {
      if (!isRunning() || isStale()) return;

      const messages = batch.messages.slice(0, batchSize);
      const total = messages.length

      console.log(`Received batch with ${total} messages`);

      let totalProcessed = 0;

      const cp = initialize({
        backgroundTaskFile: task,
        clusterSize,
        async onMessage(message: any) {
          if (++totalProcessed !== total) {
            return
          }

          cp.killAll();
          process.exit();
        }
      })
      for await (const data of messages) {
        cp.getProcess().send(data.value!.toString());
      }

      // Wait for the entire batch to finish
      await heartbeat();
    },
  });
};

run().catch(console.error);
