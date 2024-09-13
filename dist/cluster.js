"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initialize = initialize;
const child_process_1 = require("child_process");
function roundRobin(array, index = 0) {
    return function () {
        if (index >= array.length)
            index = 0;
        return array[index++];
    };
}
// Function to start child processes
function initializeCluster({ backgroundTaskFile, clusterSize, onMessage }) {
    const processes = new Map();
    for (let index = 0; index < clusterSize; index++) {
        const child = (0, child_process_1.fork)(backgroundTaskFile);
        child.on('exit', () => {
            // console.log(`process ${child.pid} exited`);
            processes.delete(child.pid);
        });
        child.on('error', error => {
            // console.log(`process ${child.pid} has an error`, error);
            process.exit(1);
        });
        child.on('message', (message) => {
            if (message !== 'item-done')
                return;
            onMessage(message);
        });
        processes.set(child.pid, child);
    }
    return {
        getProcess: roundRobin([...processes.values()]),
        killAll: () => {
            processes.forEach((child) => child.kill());
        },
    };
}
function initialize({ backgroundTaskFile, clusterSize, onMessage }) {
    const { getProcess, killAll } = initializeCluster({ backgroundTaskFile, clusterSize, onMessage });
    // Additional logic can be added here if needed
    return { getProcess, killAll };
}
