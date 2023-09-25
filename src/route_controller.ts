import { z } from 'zod';
import type MiddlewareController from './middleware_controller';
import Route from './route';
import Schema, { InferOutput, MergeSchemas } from './schema';
import { ZodOutputRecord, never } from './helper';

export type InferImplementation<
    Info extends Route,
    Request extends Schema,
    Requirements extends Record<string | symbol, unknown>,
    Response extends Schema,
> = (
    payload: InferOutput<Request> & { params: ZodOutputRecord<Info['params']> },
    attachments: Requirements,
    frameworkArg: Info['frameworkArg'],
    route: Route
) => Promise<AllowVoid<ReturnHeaders<Response['header']> & ReturnData<Response['body']> & { message?: string }>>;
type AllowVoid<T extends Record<string, unknown>> = 'header' extends keyof T ? T : 'data' extends keyof T ? T : T | void;
type ReturnHeaders<ResponseHeaders extends Schema['header']> = keyof ResponseHeaders extends never
    ? unknown
    : { header: { [k in keyof ResponseHeaders]: ResponseHeaders[k]['_input'] } };
type ReturnData<ResponseData extends Schema['body']> = ResponseData extends z.ZodNull ? unknown : { data: ResponseData['_input'] };

export default class RouteController<
    Info extends Route = Route,
    Requirements extends Record<string | symbol, unknown> = Record<string | symbol, unknown>,
    Request extends Schema = Schema,
    Response extends Schema = Schema,
    ImplementationResponse extends Schema = Schema,
> {
    readonly info: Info;
    readonly requirements: Requirements;
    readonly request: Request;
    readonly response: Response;
    readonly implementation: InferImplementation<Info, Request, Requirements, ImplementationResponse>;
    readonly middleware: MiddlewareController[];
    readonly implementationResponse: ImplementationResponse;

    protected constructor(
        info: Info,
        requirements: Requirements,
        request: Request,
        response: Response,
        implementation: InferImplementation<Info, Request, Requirements, ImplementationResponse>,
        mController: MiddlewareController[],
        implementationResponse: ImplementationResponse
    ) {
        this.info = info;
        this.requirements = requirements;
        this.request = request;
        this.response = response;
        this.implementation = implementation;
        this.middleware = mController;
        this.implementationResponse = implementationResponse;
    }
    static build<Info extends Route>(info: Info) {
        return new RouteController(info, {}, Schema.build(), Schema.build(), never, [], Schema.build());
    }

    addRequest<R extends Schema>(builder: (current: Request) => R) {
        return new RouteController(this.info, this.requirements, builder(this.request), this.response, never, never, this.implementationResponse);
    }
    addResponse<R extends Schema>(builder: (current: Response) => R) {
        return new RouteController(this.info, this.requirements, this.request, builder(this.response), never, never, builder(this.response));
    }
    addMiddleware<
        _Info extends MiddlewareController['info'],
        _Requirements extends MiddlewareController['requirements'],
        _Request extends MiddlewareController['request'],
        _Response extends MiddlewareController['response'],
        _ImplementationReturn extends MiddlewareController['implementationReturn'],
    >(
        mController: MiddlewareController<_Info, _Requirements, _Request, _Response, _ImplementationReturn>,
        ...bug: Requirements extends _Requirements ? [] : [never]
    ): RouteController<
        Info,
        Requirements & { [k in _Info['id']]: _ImplementationReturn },
        MergeSchemas<Request, _Request>,
        MergeSchemas<Response, _Response>,
        ImplementationResponse
    >;
    addMiddleware(...[mController]: [MiddlewareController, ...unknown[]]) {
        this.info.middlewareCheck(mController.info);
        return new RouteController(
            this.info,
            this.requirements,
            this.request.merge(mController.request),
            this.response.merge(mController.response),
            never,
            [...this.middleware, mController],
            this.implementationResponse
        );
    }

    setImplementation(implementation: InferImplementation<Info, Request, Requirements, ImplementationResponse>) {
        return new RouteController(
            this.info,
            this.requirements,
            this.request,
            this.response,
            implementation,
            this.middleware,
            this.implementationResponse
        );
    }
}
