import { HttpEndpoint } from './http';
import { SseEndpoint } from './sse';

export class BundleEndpoints {
    private allReady: (HttpEndpoint.Build | SseEndpoint.Build)[] = [];
    private allTodo: (HttpEndpoint.Build | SseEndpoint.Build)[] = [];
    set ready(build: unknown) {
        this.allReady.push(build as never);
    }
    set todo(build: unknown) {
        this.allTodo.push(build as never);
    }
    getReadyEndpoints() {
        return this.allReady;
    }
    getAllTodo() {
        return this.allTodo;
    }
}
