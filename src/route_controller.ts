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
    payload: InferOutput<Request>,
    attachments: Requirements,
    route: {
        route: Route;
        frameworkArg: Info['frameworkArg'];
        params: ZodOutputRecord<Info['params']>;
    }
) => Promise<ReturnHeaders<Response['header']> & ReturnData<Response['body']> & { message?: string }>;
type ReturnHeaders<ResponseHeaders extends Schema['header']> = keyof ResponseHeaders extends never
    ? unknown
    : { header: { [k in keyof ResponseHeaders]: ResponseHeaders[k]['_input'] } };
type ReturnData<ResponseData extends Schema['body']> = ResponseData extends z.ZodNull ? unknown : { data: ResponseData['_input'] };

export default class RController<
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
        return new RController(info, {}, Schema.build(), Schema.build(), never, [], Schema.build());
    }

    addRequest<R extends Schema>(request: R) {
        return new RController(this.info, this.requirements, request, this.response, never, never, this.implementationResponse);
    }
    addResponse<R extends Schema>(response: R) {
        return new RController(this.info, this.requirements, this.request, response, never, never, response);
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
    ): RController<
        Info,
        Requirements & { [k in _Info['id']]: _ImplementationReturn },
        MergeSchemas<Request, _Request>,
        MergeSchemas<Response, _Response>,
        ImplementationResponse
    >;
    addMiddleware(...[mController]: [MiddlewareController, ...unknown[]]) {
        this.info.middlewareCheck(mController.info);
        return new RController(
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
        return new RController(
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
