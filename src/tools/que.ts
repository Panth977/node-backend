type AsyncFunc<A, R> = (arg: A) => Promise<R>;

export function CreatePromiseQueControl<A, R>(maxParallelExecution: number, implementation: AsyncFunc<A, R>): AsyncFunc<A, R> {
    let running = 0;
    const queue: Array<() => void> = [];
    function dequeue() {
        running--;
        if (running < maxParallelExecution && queue.length) {
            running++;
            const nextTask = queue.shift();
            if (nextTask) nextTask();
        }
    }

    return async function (arg) {
        return new Promise((resolve, reject) => {
            async function runTask() {
                try {
                    const result = await implementation(arg);
                    resolve(result);
                } catch (error) {
                    reject(error);
                } finally {
                    dequeue();
                }
            }

            if (running < maxParallelExecution) {
                running++;
                runTask();
            } else {
                queue.push(runTask);
            }
        });
    };
}

export function CreateGroupPromiseQueControl<A, R>(delayInMs: number, implementation: AsyncFunc<A[], R[]>): AsyncFunc<A, R> {
    let queue: { arg: A; resolve: (result: R) => void; reject: (error: unknown) => void }[] = [];
    let timer: NodeJS.Timeout | null = null;

    const processQueue = async () => {
        const currentQueue = [...queue];
        queue = []; // Clear the queue
        timer = null;

        try {
            const args = currentQueue.map((item) => item.arg);
            const results = await implementation(args); // Process batch
            currentQueue.forEach((item, index) => item.resolve(results[index])); // Resolve individual promises
        } catch (error) {
            currentQueue.forEach((item) => item.reject(error)); // Reject if error occurs
        }
    };

    return async function (arg: A): Promise<R> {
        return new Promise<R>((resolve, reject) => {
            queue.push({ arg, resolve, reject });

            if (!timer) {
                timer = setTimeout(processQueue, delayInMs); // Set timer if not already set
            }
        });
    };
}
