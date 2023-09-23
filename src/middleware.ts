export default class Middleware<ID extends string = string, FrameworkArg = unknown> {
    readonly id: ID;
    readonly frameworkArg: FrameworkArg;

    private constructor(id: ID, frameworkArg: FrameworkArg) {
        this.id = id;
        this.frameworkArg = frameworkArg;
    }

    static build<FrameworkArg, ID extends string>(arg: FrameworkArg, id: ID) {
        return new Middleware(id, arg);
    }
}
