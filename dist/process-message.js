"use strict";
process.on('message', (msg) => {
    console.log(`Processing message: ${msg}`);
    try {
        // Simulate processing delay
        setTimeout(() => {
            if (process.send) {
                process.send(`Successfully processed: ${msg}`);
            }
            else {
                console.error('process.send is not defined');
            }
            process.exit(0);
        }, 1000);
    }
    catch (error) {
        console.error('Error processing message:', error);
        process.exit(1);
    }
});
