import { z } from 'zod';
import { never } from './helper';
import Middleware from './middleware';

export default class Route<
    Method extends string = string,
    Path extends string = string,
    Params extends Record<string, z.ZodType> = Record<string, z.ZodType>,
    Configs = unknown,
    FrameworkArg = unknown,
> {
    readonly method: Method;
    readonly path: Path;
    readonly params: Params;
    readonly description: string | undefined;
    readonly configs: Configs;
    readonly frameworkArg: FrameworkArg;
    readonly tags: string[];
    readonly features: Record<string, string> = {};
    private middlewareAdded = new Set<string | symbol>();

    get ref(): `${Method}.${Path}` {
        return `${this.method}.${this.path}`;
    }

    protected constructor(
        method: Method,
        path: Path,
        params: Params,
        configs: Configs,
        description: string | undefined,
        frameworkArg: FrameworkArg,
        tags: string[]
    ) {
        this.method = method;
        this.path = path;
        this.params = params;
        this.configs = configs;
        this.description = description;
        this.frameworkArg = frameworkArg;
        this.tags = tags;
    }

    static build<FrameworkArg, Method extends string, Path extends string>(arg: FrameworkArg, method: Method, path: Path, description?: string) {
        return new Route(method, path, {}, never, description, arg, []);
    }

    setDescription(description: string) {
        (this.description as string) = description;
        return this;
    }

    setTags(...tags: string[]) {
        this.tags.push(...tags);
        return this;
    }

    middlewareCheck(middleware: Middleware) {
        if (this.middlewareAdded.has(middleware.id)) {
            throw new Error('Middleware of same ID was encountered again!');
        }
        Object.assign(this.features, middleware.features);
        this.middlewareAdded.add(middleware.id);
    }

    addFeatures(features: Record<string, string>) {
        Object.assign(this.features, features);
        return this;
    }
}
