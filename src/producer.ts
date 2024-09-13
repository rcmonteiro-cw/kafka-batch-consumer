import { Kafka } from 'kafkajs';

// Kafka Configuration
const kafka = new Kafka({
  clientId: 'message-producer',
  brokers: ['localhost:29092'], // Kafka broker in Docker
});

const producer = kafka.producer();

// Function to generate a random message
const createRandomMessage = (): string => {
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

// Function to produce messages at random intervals
const produceMessage = async () => {
  await producer.connect();

  const sendRandomMessage = async () => {
    const message = createRandomMessage();
    console.log(`Producing message: ${message}`);

    // Send message to the Kafka topic
    await producer.send({
      topic: 'batch-topic',
      messages: [{ value: message }],
    });

    // Schedule the next message at a random interval (1 to 5 seconds)
    const randomInterval = 100;
    setTimeout(sendRandomMessage, randomInterval);
  };

  // Start producing messages
  sendRandomMessage();
};

produceMessage().catch(console.error);
