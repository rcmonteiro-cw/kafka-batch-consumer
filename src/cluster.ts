import { fork, ChildProcess } from 'child_process';

interface ClusterOptions {
    backgroundTaskFile: string;
    clusterSize: number;
    onMessage: (message: any) => void;
}

function roundRobin<T>(array: T[], index = 0): () => T {
    return function () {
        if (index >= array.length) index = 0;
        return array[index++];
    };
}

// Function to start child processes
function initializeCluster({ backgroundTaskFile, clusterSize, onMessage }: ClusterOptions) {
    const processes = new Map<number, ChildProcess>();

    for (let index = 0; index < clusterSize; index++) {
        const child = fork(backgroundTaskFile);

        child.on('exit', () => {
            // console.log(`process ${child.pid} exited`);
            processes.delete(child.pid!);
        });

        child.on('error', error => {
            // console.log(`process ${child.pid} has an error`, error);
            process.exit(1);
        });

        child.on('message', (message: any) => {
            if (message !== 'item-done') return;
            onMessage(message);
        });

        processes.set(child.pid!, child);
    }

    return {
        getProcess: roundRobin([...processes.values()]),
        killAll: () => {
            processes.forEach((child) => child.kill());
        },
    };
}

export function initialize({ backgroundTaskFile, clusterSize, onMessage }: ClusterOptions) {
    const { getProcess, killAll } = initializeCluster({ backgroundTaskFile, clusterSize, onMessage });

    // Additional logic can be added here if needed

    return { getProcess, killAll };
}