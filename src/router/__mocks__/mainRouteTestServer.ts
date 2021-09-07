import express from 'express';
// eslint-disable-next-line import/no-unresolved
import { Express } from 'express-serve-static-core';
import { MultiTenancyOptions, getRequestInformation, InvalidResourceError } from 'fhir-works-on-aws-interface';

import { buildMainRouterDecorator } from '../routes/tenantBasedMainRouterDecorator';
import RouteHelper from '../routes/routeHelper';
import { applicationErrorMapper, httpErrorHandler, unknownErrorHandler } from '../routes/errorHandling';

let perRequestOverrideAccessTokenScopes: string[] = [];
export function setPerRequestAccessTokenScopes(scopes: string[]) {
    perRequestOverrideAccessTokenScopes = scopes;
}

function provideDecodedToken(scopes: string[]) {
    return {
        sub: 'fake',
        name: 'not real',
        iat: 1516239022,
        'cognito:groups': [
            'tenantprefix:915b76f7-8744-4010-bd31-a1e4c0d9fc64',
            'tenantprefix:125545f5-e7e3-4868-898d-092f1023344b',
            'tenantprefix:fe470d0a-c7e9-4857-a39c-9a06f68b517b',
            'practitioner',
        ],
        scope: scopes,
    };
}

function handleAuth(mainRouter: express.Router, resourceType: string) {
    // AuthZ
    mainRouter.use(async (req: express.Request, res: express.Response, next: express.NextFunction) => {
        let path: string;
        // RouteHelper.extractResourceUrl can throw an exception
        try {
            path = RouteHelper.extractResourceUrl(req.method, req.path);
        } catch (e) {
            next(e);
            return;
        }

        const requestInformation = getRequestInformation(req.method, path);
        if (requestInformation.resourceType !== resourceType) {
            next(new InvalidResourceError('The request info must contain a resource type'));
            return;
        }

        res.locals.userIdentity = provideDecodedToken(
            perRequestOverrideAccessTokenScopes.length !== 0
                ? perRequestOverrideAccessTokenScopes
                : ['openid', 'profile'],
        );
        perRequestOverrideAccessTokenScopes = [];
        next();
    });
}

let createResourceId: string = '9876';
export function setExpectedCreateResourceId(id: string) {
    createResourceId = id;
}

export function getExpectedCreateResourceId() {
    return createResourceId;
}
export function createResponseBody(resourceType: string, tenantId?: string, resourceId?: string) {
    return {
        tenantId: tenantId || 'NONE',
        resourceType,
        resourceId: resourceId || 'NONE',
    };
}
async function sendResponseWithResourceId(req: express.Request, res: express.Response) {
    const { resourceType, tenantId, id } = req.params;
    res.status(200)
        .json(createResponseBody(resourceType, tenantId, id))
        .send(`Ok`);
}
async function sendResponseNoResourceId(req: express.Request, res: express.Response) {
    const { resourceType, tenantId } = req.params;
    res.status(200)
        .json(createResponseBody(resourceType, tenantId, undefined))
        .send(`Ok`);
}

export function createMetaData() {
    return {
        message: 'success',
        resource: {
            FHIRVersion: 'R4',
            resources: ['Patient', 'Questionnaire'],
        },
    };
}

export async function createServer(multiTenancyOptions: MultiTenancyOptions, type: string): Promise<Express> {
    const server = express();

    // error customization, if request is invalid
    const mainRouter = express.Router();

    mainRouter.use(express.urlencoded({ extended: true }));
    mainRouter.use(
        express.json({
            type: ['application/json', 'application/fhir+json', 'application/json-patch+json'],
            // 6MB is the maximum payload that Lambda accepts
            limit: '6mb',
        }),
    );
    const mainRouterDecorator = buildMainRouterDecorator(mainRouter, multiTenancyOptions);

    const metaDataRouter = express.Router(RouteHelper.getRouterOptions());

    // READ
    metaDataRouter.get('/', async (req: express.Request, res: express.Response) => {
        res.send(createMetaData());
    });

    mainRouterDecorator.use('/metadata', metaDataRouter);

    handleAuth(mainRouter, type);

    const itemRouter = express.Router(RouteHelper.getRouterOptions());

    itemRouter.post(
        '/',
        RouteHelper.wrapAsync(async (req: express.Request, res: express.Response) => {
            const { resourceType, tenantId } = req.params;
            res.status(201)
                .json(createResponseBody(resourceType, tenantId, createResourceId))
                .send(`Ok`);
        }),
    );

    itemRouter.put('/:id', RouteHelper.wrapAsync(sendResponseWithResourceId));
    itemRouter.patch('/:id', RouteHelper.wrapAsync(sendResponseWithResourceId));
    itemRouter.delete('/:id', RouteHelper.wrapAsync(sendResponseWithResourceId));

    itemRouter.get('/', RouteHelper.wrapAsync(sendResponseNoResourceId));
    itemRouter.get('/_history', RouteHelper.wrapAsync(sendResponseNoResourceId));
    itemRouter.get('/:id', RouteHelper.wrapAsync(sendResponseWithResourceId));
    itemRouter.get('/:id/_history/:vid', RouteHelper.wrapAsync(sendResponseWithResourceId));
    itemRouter.get('/:id/_history', RouteHelper.wrapAsync(sendResponseWithResourceId));

    mainRouterDecorator.use(`/:resourceType(${type})`, itemRouter);

    mainRouter.use(applicationErrorMapper);
    mainRouter.use(httpErrorHandler);
    mainRouter.use(unknownErrorHandler);
    server.use('/', mainRouter);
    return server;
}
