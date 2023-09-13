# Panth977/Node Backend

A powerful Node.js package for building fast and efficient APIs with Express and Zod. Automatically generates route documentation and provides essential classes for API development.

- filter out json
- verify if property matches given conditions
- create custom sanitizer functions:

## [Github](https://github.com/Panth977/node-backend)

## Table of Contents

- [Installation](#installation)
- [Middleware](#middleware)
- [Route](#route)
- [Server](#server)

## Installation

You can install this package via npm or yarn:

```sh
npm install @panth977/node-backend
# or
yarn add @panth977/node-backend
```

# Middleware

The `Middleware` class is a part of the `@panth977/node-backend` package, designed to simplify the creation and management of middleware functions for Route applications.

## Usage

You can create middleware instances and define their behavior using the following methods:

### `constructor(name: string)`

Create a new instance of the Middleware class with the specified `name`.

```javascript
import { Middleware } from '@panth977/node-backend';

const myMiddleware = new Middleware('MyMiddleware');
```

### `setHeaders(headers: Record<string, zod.ZodType<any>>)`

Define the expected headers for the middleware, which provides autocomplete and type inference support for header properties.

```javascript
myMiddleware.setHeaders({ 'x-auth': zod.string() });
```

### `addPreRequisite(prerequisite: () => Middleware)`

Specify if this middleware requires another middleware to run first. This is used for type inference and does not affect the runtime behavior.

```javascript
myMiddleware.addPreRequisite(() => AddConsole);
```

### `setImplementation(implementation: (payload: Record<string, any>, attachments: Record<string, any>) => Promise<MiddlewareResult>)`

Set the implementation function for the middleware. This function defines the middleware's behavior and is executed when the middleware is called.

- `payload`: Contains headers and query properties with autocomplete.
- `attachments`: Contains values returned by other middleware functions that ran before.

```javascript
myMiddleware.setImplementation(async function (payload, attachments) {
  // Your middleware logic here
  // You can access headers using payload.headers
  // You can access attachments returned by prerequisite middleware functions
  
  // Return an object with Attachment and ResponseHeaders properties
  return {
    Attachment: { uid: decoded.data.uid },
    ResponseHeaders: {},
  };
});
```

## Example

Here's an example of how to create and use a middleware instance:

```javascript
import { Middleware, ResponseSymbol, HttpsResponse } from '@panth977/node-backend';

const AddConsole = new Middleware('Console')
  .setImplementation(async function (payload, attachments) {
    const { instance, store, console } = buildLogger();
    payload[ResponseSymbol].on('finish', store); // you can use symbols to access original request & response from express
    log('🏃‍');
    return {
        Attachment: console, // will added to [attachments against "Console" key]
        ResponseHeaders: {
            'x-instance-id': instance,
        },
    };
  })

const RootAuthorization = new Middleware('RootAuthorization')
  .setHeaders({ 'x-auth': zod.string() })
  .addPreRequisite(() => AddConsole)
  .setImplementation(async function (payload, attachments) {
    const token  = payload.headers['x-auth'] // autocomplete, using type inferences from [setHeaders]
    attachments.Console.log('checking token') // autocomplete, using type inferences from [addPreRequisite]
    // Your middleware logic here
    if (decoded.status === 'failed') {
        // exit the pipeline and set response details right here
        throw new HttpsResponse('unauthenticated', 'Invalid or expired token was found!') 
    }
    return {
      Attachment: { uid: decoded.data.uid }, // will be added in [attachments] in pipeline
      ResponseHeaders: {}, // sent to response
    };
  });
```

# Route

The `Route` class is a part of the `@panth977/node-backend` package, designed to simplify the creation and management of routes for Express applications. It also allows you to specify route-specific middleware and request body validation.

## Usage

You can create route instances and define their behavior using the following methods:

### `constructor(method: string, path: string)`

Create a new instance of the Route class with the specified HTTP `method` (e.g., 'GET', 'POST') and `path`.

```javascript
import { Route } from '@panth977/node-backend';

const myRoute = new Route('post', '/company');
```

### `addMiddleware(middleware: Middleware)`

Add middleware functions to the route. These middleware functions will be executed before the route's main implementation.

```javascript
import middleware from '../../middleware';

myRoute
  .addMiddleware(middleware.AddConsole)
  .addMiddleware(middleware.RootAuthorization);
```

### `setBody(bodySchema: zod.ZodType<any>)`

Specify the expected request body schema using Zod validation. This helps validate and parse incoming request data.

```javascript
myRoute.setBody(zod.object({ company_name: zod.string() }));
```

### `setImplementation(implementation: (payload: Record<string, any>, attachments: Record<string, any>) => Promise<RouteResult>)`

Set the implementation function for the route. This function defines the route's behavior and is executed when the route is accessed.

- `payload`: Contains the parsed request data, including the validated request body.
- `attachments`: Contains values returned by middleware functions added to the route.

```javascript
myRoute.setImplementation(async function (payload, attachments) {
  // Your route logic here
  
  return {
    ResponseHeaders: {},
    ResponseData: new HttpsResponse('ok', 'Successfully Created Company', {
      company_id: companyRef.company_id,
      account_id: accountRef.account_id,
    }),
  };
});
```

## Example

Here's an example of how to create and use a route instance:

```javascript
import { Route } from '@panth977/node-backend';
import middleware from '../../middleware';
import { zod } from '../../utils/validators';

const createCompany = new Route('post', '/company')
  .addMiddleware(middleware.AddConsole)
  .addMiddleware(middleware.RootAuthorization)
  .setBody(zod.object({ company_name: zod.string() }))
  .setImplementation(async function (payload, attachments) {
    // Your route logic here
    
    return {
      ResponseHeaders: {}, // will be added to response headers
      // 3rd argument will be set to client in body under "data"
      ResponseData: new HttpsResponse('ok', 'Successfully Created Company', {
        company_id: companyRef.company_id,
      }), 
    };
  });
```

# Server

The `Server` class is a part of the `@panth977/node-backend` package, designed to simplify the setup and serving of an Express application. It allows you to define API versions and organize your routes efficiently.

## Usage

You can create a `Server` instance and configure it using the following methods:

### `constructor(apiVersion: string, companyName: string)`

Create a new instance of the Server class with the specified API version and company name.

```javascript
import { Server } from '@panth977/node-backend';

const server = new Server('1.0.0', 'My Company');
```

### `addRoute(collectionName: string, route: Route)`

Add routes to your server by specifying a `collectionName` and a `Route` instance. This method allows you to organize routes under specific collections for documentation purposes.

```javascript
import { Route } from '@panth977/node-backend';

// Example Route instances
const getUserFriends = new Route('get', '/user/friends/:friend_id');
const getUserProfile = new Route('get', '/user/profile');
const createCompany = new Route('post', '/company/create');
// ...

server
    .addRoute('user', getFriends)
    .addRoute('user', getProfile)
    .addRoute('company', createCompany)
    .addRoute('company', editCompany)
    .addRoute('company', getCompany)
    .addRoute('company', getCompanies);
```

### `serve(expressApp: Express)`

Serve the configured routes on the provided Express application (`expressApp`). This method will attach the defined routes to your Express app.

```javascript
const express = require('express');
const app = express();

server.serve(app);
```

## Example

Here's an example of how to create a `Server` instance, configure routes, and serve them on an Express application:

```javascript
import { Server } from '@panth977/node-backend';
import { Route } from '@panth977/node-backend';

const server = new Server('1.0.0', 'My Company')
    .addRoute('user', getFriends)
    .addRoute('user', getProfile)
    .addRoute('company', createCompany)
    .addRoute('company', editCompany)
    .addRoute('company', getCompany)
    .addRoute('company', getCompanies);

const express = require('express');
const app = express();

server.serve(app);
```
