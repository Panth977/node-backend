import { z } from 'zod';
import { HttpBuild, Method } from './http';
import { Context } from '../functions';
import { SseBuild } from './sse';

export class BundleEndpoints {
    private allReady: (
        | HttpBuild<
              Method,
              string,
              z.AnyZodObject,
              z.AnyZodObject,
              z.AnyZodObject,
              z.ZodType,
              z.AnyZodObject,
              z.ZodType,
              unknown,
              Context,
              Record<never, never>
          >
        | SseBuild<string, z.AnyZodObject, z.AnyZodObject, z.AnyZodObject, unknown, Context, Record<never, never>>
    )[] = [];
    private allTodo: (
        | HttpBuild<
              Method,
              string,
              z.AnyZodObject,
              z.AnyZodObject,
              z.AnyZodObject,
              z.ZodType,
              z.AnyZodObject,
              z.ZodType,
              unknown,
              Context,
              Record<never, never>
          >
        | SseBuild<string, z.AnyZodObject, z.AnyZodObject, z.AnyZodObject, unknown, Context, Record<never, never>>
    )[] = [];
    set ready(build: unknown) {
        this.allReady.push(build as never);
    }
    set todo(build: unknown) {
        this.allTodo.push(build as never);
    }
    getEndpoints() {
        return {
            ready: this.allReady,
            todo: this.allTodo,
        };
    }
}
