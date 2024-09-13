"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const kafkajs_1 = require("kafkajs");
const kafka = new kafkajs_1.Kafka({
    clientId: 'message-producer',
    brokers: ['localhost:29092'], // Kafka broker in Docker
});
const producer = kafka.producer();
// Function to generate a random message
const createRandomMessage = () => {
    const messages = [
        'Hello World',
        'Kafka is awesome!',
        'Batch processing is great!',
        'Random message for Kafka!',
        'Node.js + Kafka = ❤️',
    ];
    const randomIndex = Math.floor(Math.random() * messages.length);
    return messages[randomIndex];
};
// Function to produce a specified number of messages
const produceMessages = async (numMessages) => {
    await producer.connect();
    const batchSize = 1000; // Number of messages to send in each batch
    let messagesSent = 0;
    while (messagesSent < numMessages) {
        const messages = [];
        for (let i = 0; i < batchSize && messagesSent < numMessages; i++) {
            messages.push({ value: createRandomMessage() });
            messagesSent++;
        }
        // Send batch of messages to the Kafka topic
        await producer.send({
            topic: 'batch-topic',
            messages,
        });
        // Log progress every 1 million messages
        if (messagesSent % 1000000 === 0) {
            console.log(`Produced ${messagesSent} messages`);
        }
    }
    console.log(`Finished producing ${numMessages} messages`);
    await producer.disconnect();
};
// Produce 100 million messages
produceMessages(100000).catch(console.error);
