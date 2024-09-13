"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const kafkajs_1 = require("kafkajs");
const os_1 = require("os");
const child_process_1 = require("child_process");
const path_1 = __importDefault(require("path"));
const numCPUs = (0, os_1.cpus)().length;
const maxBatchSize = 100;
const task = path_1.default.resolve(__dirname, 'process-message.js');
let childProcesses = [];
const kafka = new kafkajs_1.Kafka({
    clientId: 'batch-consumer',
    brokers: ['localhost:29092'],
});
const consumer = kafka.consumer({ groupId: 'batch-group' });
async function runConsumer() {
    await consumer.connect();
    await consumer.subscribe({ topic: 'batch-topic', fromBeginning: true });
    await consumer.run({
        eachBatch: async (payload) => {
            const { batch, resolveOffset, heartbeat, isRunning, commitOffsetsIfNecessary } = payload;
            const messages = batch.messages;
            for (let i = 0; i < messages.length; i += maxBatchSize) {
                if (!isRunning())
                    break;
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
async function processBatch(batchSlice) {
    console.log(`Processing batch of ${batchSlice.length} messages`);
    const batchesPerProcess = Math.ceil(batchSlice.length / numCPUs);
    const processingPromises = [];
    for (let i = 0; i < numCPUs; i++) {
        const start = i * batchesPerProcess;
        const end = Math.min((i + 1) * batchesPerProcess, batchSlice.length);
        const subBatch = batchSlice.slice(start, end);
        const promise = new Promise((resolve) => {
            const child = (0, child_process_1.fork)(task);
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
