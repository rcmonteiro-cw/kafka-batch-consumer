import { Kafka } from 'kafkajs';
import { fork } from 'child_process';
import path from 'path';

const kafka = new Kafka({
  clientId: 'batch-consumer',
  brokers: ['localhost:29092'],
});

const consumer = kafka.consumer({ groupId: 'batch-group' });
const task = path.resolve(__dirname, 'process-message.js')

const run = async () => {
  await consumer.connect();
  await consumer.subscribe({ topic: 'batch-topic', fromBeginning: true });

  console.log('Consumer is ready...');

  // Batch size and processing logic
  const batchSize = 10;

  await consumer.run({
    eachBatch: async ({ batch, resolveOffset, heartbeat, isRunning, isStale }) => {
      if (!isRunning() || isStale()) return;

      const messages = batch.messages.slice(0, batchSize);
      
      console.log(`Received batch with ${messages.length} messages`);

      // Process each message with a child process
      const promises = messages.map(message =>
        new Promise<void>((resolve, reject) => {
          const scriptPath = path.resolve(__dirname, 'process-message.js');
          console.log(`Forking child process for message: ${message.value!.toString()} with script: ${scriptPath}`);
          
          const child = fork(task);
          child.send(message.value!.toString());
          
          child.on('exit', () => {
            console.log(`process exited`)
          })

          child.on('message', (msg) => {
            console.log(`Processed: ${msg}`);
            resolveOffset(message.offset);
            resolve();
          });

          child.on('error', (err) => {
            console.error('Child process error:', err);
            reject(err);
          });
        })
      );

      // Wait for the entire batch to finish
      await Promise.all(promises);
      await heartbeat();
    },
  });
};

run().catch(console.error);
