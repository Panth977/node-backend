import { z } from 'zod';
import { never } from './helper';

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

    get ref(): `${Method}.${Path}` {
        return `${this.method}.${this.path}`;
    }

    private constructor(method: Method, path: Path, params: Params, configs: Configs, description: string | undefined, frameworkArg: FrameworkArg) {
        this.method = method;
        this.path = path;
        this.params = params;
        this.configs = configs;
        this.description = description;
        this.frameworkArg = frameworkArg;
    }

    static build<FrameworkArg, Method extends string, Path extends string>(arg: FrameworkArg, method: Method, path: Path, description?: string) {
        return new Route(method, path, {}, never, description, arg);
    }

    addConfigs<Configs>(configs: Configs) {
        return new Route(this.method, this.path, this.params, configs, this.description, this.frameworkArg);
    }

    addParams<Params extends Record<string, z.ZodType>>(params: Params) {
        return new Route(this.method, this.path, Object.assign({}, this.params, params), this.configs, this.description, this.frameworkArg);
    }

    addDescription(description: string) {
        return new Route(this.method, this.path, this.params, this.configs, description, this.frameworkArg);
    }
}
