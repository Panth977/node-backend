import { ZodOutputRecord, never } from './helper';
import Schema, { InferOutput, MergeSchemas } from './schema';
import Route from './route';
import Middleware from './middleware';

type InferImplementation<
    Info extends Middleware,
    Request extends Schema,
    Requirements extends Record<string | symbol, unknown>,
    ImplementationReturn,
> = (
    payload: InferOutput<Request> & { params: ZodOutputRecord<Route['params']> },
    attachments: Requirements,
    frameworkArg: Info['frameworkArg'],
    route: Route
) => Promise<ImplementationReturn>;
type ReturnHeaders<ResponseHeaders extends Schema['header']> = keyof ResponseHeaders extends never
    ? unknown
    : { header: { [k in keyof ResponseHeaders]: ResponseHeaders[k]['_input'] } };

export default class MiddlewareController<
    Info extends Middleware = Middleware,
    Requirements extends Record<string | symbol, unknown> = Record<string | symbol, unknown>,
    Request extends Schema = Schema,
    Response extends Schema = Schema,
    ImplementationReturn = unknown,
> {
    readonly info: Info;
    readonly requirements: Requirements;
    readonly request: Request;
    readonly response: Response;
    readonly implementationReturn: ImplementationReturn;
    readonly implementation: InferImplementation<Info, Request, Requirements, ImplementationReturn>;

    protected constructor(
        info: Info,
        requirements: Requirements,
        request: Request,
        response: Response,
        implementation: InferImplementation<Info, Request, Requirements, ImplementationReturn>
    ) {
        this.info = info;
        this.requirements = requirements;
        this.request = request;
        this.response = response;
        this.implementation = implementation;
        this.implementationReturn = never;
    }
    static build<Info extends Middleware>(info: Info) {
        return new MiddlewareController(info, {}, Schema.build(), Schema.build(), never);
    }

    addRequest<R extends Schema>(request: R) {
        return new MiddlewareController(this.info, {}, request, this.response, never);
    }
    addResponse<R extends Schema>(response: R) {
        return new MiddlewareController(this.info, {}, this.request, response, never);
    }
    addPreRequisite<
        _Info extends MiddlewareController['info'],
        _Requirements extends MiddlewareController['requirements'],
        _Request extends MiddlewareController['request'],
        _Response extends MiddlewareController['response'],
        _ImplementationReturn extends MiddlewareController['implementationReturn'],
    >(
        mController: () => MiddlewareController<_Info, _Requirements, _Request, _Response, _ImplementationReturn>
    ): MiddlewareController<
        Info,
        Requirements & _Requirements & { [k in _Info['id']]: _ImplementationReturn },
        MergeSchemas<Request, _Request>,
        Response,
        ImplementationReturn
    >;
    addPreRequisite() {
        return new MiddlewareController(this.info, this.requirements, this.request, this.response, never) as never;
    }
    addImplementation<ImplementationReturn extends ReturnHeaders<Response['header']>>(
        implementation: InferImplementation<Info, Request, Requirements, ImplementationReturn>
    ) {
        return new MiddlewareController(this.info, this.requirements, this.request, this.response, implementation);
    }
}
