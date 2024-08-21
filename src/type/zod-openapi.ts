import { createDocument, ZodOpenApiObject } from 'zod-openapi';

type Exists<T> = Exclude<T, undefined>;
export type SecuritySchemeObject = Exclude<Exists<Exists<ZodOpenApiObject['components']>['securitySchemes']>[string], { $ref: string }>;

export type OpenAPIObject = ReturnType<typeof createDocument>;
export type PathItemObject = Exists<OpenAPIObject['paths']>[string];
export type Methods = Exclude<keyof PathItemObject, '$ref' | `x-${string}` | 'servers' | 'parameters' | 'summary' | 'description'>;
export type OperationObject = Exists<PathItemObject[Methods]>;

export type ComponentsObject = Exists<OpenAPIObject['components']>;
export type SchemaObject = Exclude<Exists<ComponentsObject['schemas']>[string], { $ref: string }>;
export type ReferenceObject = Exclude<Exists<ComponentsObject['schemas']>[string], SchemaObject>;
