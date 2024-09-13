"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const kafkajs_1 = require("kafkajs");
const path_1 = __importDefault(require("path"));
const cluster_1 = require("./cluster");
const kafka = new kafkajs_1.Kafka({
    clientId: 'batch-consumer',
    brokers: ['localhost:29092'],
});
const consumer = kafka.consumer({ groupId: 'batch-group' });
const task = path_1.default.resolve(__dirname, 'process-message.js');
const clusterSize = 10;
const batchSize = 10;
const run = async () => {
    await consumer.connect();
    await consumer.subscribe({ topic: 'batch-topic', fromBeginning: true });
    console.log('Consumer is ready...');
    await consumer.run({
        eachBatch: async ({ batch, resolveOffset, heartbeat, isRunning, isStale }) => {
            if (!isRunning() || isStale())
                return;
            const messages = batch.messages.slice(0, batchSize);
            const total = messages.length;
            console.log(`Received batch with ${total} messages`);
            let totalProcessed = 0;
            const cp = (0, cluster_1.initialize)({
                backgroundTaskFile: task,
                clusterSize,
                async onMessage(message) {
                    if (++totalProcessed !== total) {
                        return;
                    }
                    cp.killAll();
                    process.exit();
                }
            });
            for await (const data of messages) {
                cp.getProcess().send(data.value.toString());
            }
            // Wait for the entire batch to finish
            await heartbeat();
        },
    });
};
run().catch(console.error);
