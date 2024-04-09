import { z } from 'zod';
import { AsyncFunction } from './async';
import { AsyncGenerator } from './async-generator';
import { SyncFunction } from './sync';
import { SyncGenerator } from './sync-generator';
import { Context } from './context';
import { getBuild } from './_helper';

export class BundleFunctions<B extends Record<never, never>> {
    private bundle: Record<never, never> = {};

    add<
        //
        N extends string,
        I extends z.ZodType,
        O extends z.ZodType,
        L,
        C extends Context,
    >(build: AsyncFunction.Build<N, I, O, L, C>): BundleFunctions<B & { [k in N]: AsyncFunction.Build<N, I, O, L, C> }>;
    add<
        //
        N extends string,
        I extends z.ZodType,
        O extends z.ZodType,
        L,
        C extends Context,
    >(build: SyncFunction.Build<N, I, O, L, C>): BundleFunctions<B & { [k in N]: SyncFunction.Build<N, I, O, L, C> }>;
    add<
        //
        N extends string,
        I extends z.ZodType,
        Y extends z.ZodType,
        TN extends z.ZodType,
        O extends z.ZodType,
        L,
        C extends Context,
    >(build: AsyncGenerator.Build<N, I, Y, TN, O, L, C>): BundleFunctions<B & { [k in N]: AsyncGenerator.Build<N, I, Y, TN, O, L, C> }>;
    add<
        //
        N extends string,
        I extends z.ZodType,
        Y extends z.ZodType,
        TN extends z.ZodType,
        O extends z.ZodType,
        L,
        C extends Context,
    >(build: SyncGenerator.Build<N, I, Y, TN, O, L, C>): BundleFunctions<B & { [k in N]: SyncGenerator.Build<N, I, Y, TN, O, L, C> }>;
    add(_build: unknown) {
        const build = getBuild(_build);
        Object.assign(this.bundle, { [build.name]: build });
        return this;
    }

    export(): B {
        return this.bundle as never;
    }
}
