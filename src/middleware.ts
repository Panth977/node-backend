export default class Middleware<ID extends string | symbol = string, FrameworkArg = unknown> {
    readonly id: ID;
    readonly frameworkArg: FrameworkArg;
    readonly features: Record<string, string>;

    private constructor(id: ID, frameworkArg: FrameworkArg, features: Record<string, string>) {
        this.id = id;
        this.frameworkArg = frameworkArg;
        this.features = features;
    }

    static build<FrameworkArg, ID extends string | symbol>(arg: FrameworkArg, id: ID) {
        return new Middleware(id, arg, {});
    }

    addFeatures(features: Record<string, string>) {
        return new Middleware(this.id, this.frameworkArg, Object.assign({}, this.features ?? {}, features));
    }
}
