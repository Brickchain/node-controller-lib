# Brickchain integrity controller library for node/express

This library helps you in creating a controller that binds with a realm and serves user interactive action-descriptors

Typical controllers allow for access to local or remote services such as locks, alarms, document signing, crypto services or banks.

A controller can use a security realm to verify role mandates or identify users via facts and a web of trust. This library contains all functionality to set up the binding to a realm, and the basic functionality to create a service.

This is the node version of the controller library, with dependence to node, node-jose and express for building a web-service with a controller endpoint.

See https://developer.brickchain.com/ for full documentation.

Building the library:

```sh
    npm install
    npm run build
```

This will create the dist folder with typescript declarations and
ES6/commonjs bundles.

Importing the library:

```js
    import { Controller, Integrity } from "@brickchain/node-controller-lib"
```
