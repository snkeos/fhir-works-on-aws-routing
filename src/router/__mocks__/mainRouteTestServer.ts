import express from 'express';
// eslint-disable-next-line import/no-unresolved
import { Express } from 'express-serve-static-core';
import { MultiTenancyOptions, getRequestInformation, InvalidResourceError } from 'fhir-works-on-aws-interface';

import { createMainRoute } from '../routes/createMainRoute';
import RouteHelper from '../routes/routeHelper';
import { applicationErrorMapper, httpErrorHandler, unknownErrorHandler } from '../routes/errorHandling';

function provideDecodedToken(mainRouter: express.Router, resourceType: string) {
    const practitionerTenantsDecoded = {
        sub: 'fake',
        name: 'not real',
        iat: 1516239022,
        'cognito:groups': [
            'tenantprefix:915b76f7-8744-4010-bd31-a1e4c0d9fc64',
            'tenantprefix:125545f5-e7e3-4868-898d-092f1023344b',
            'tenantprefix:fe470d0a-c7e9-4857-a39c-9a06f68b517b',
            'practitioner',
        ],
    };

    // AuthZ
    mainRouter.use(async (req: express.Request, res: express.Response, next: express.NextFunction) => {
        try {
            const path = RouteHelper.extractResourceUrl(req.method, req.path);
            const requestInformation = getRequestInformation(req.method, path);

            if (requestInformation.resourceType !== resourceType) {
                throw new InvalidResourceError('The request info must contain a resource type');
            }

            res.locals.userIdentity = practitionerTenantsDecoded;
            next();
        } catch (e) {
            next(e);
        }
    });
}

export function createJSON(resourceType: string, tenantId?: string, resourceId?: string) {
    return {
        tenantId: tenantId === undefined ? 'NONE' : tenantId,
        resourceType,
        resourceId: resourceId === undefined ? 'NONE' : resourceId,
    };
}

export function createMetaData(){
    return {
        message: 'success',
        resource: {
            FHIRVersion: "R4",
            resources: ["Patient", "Questionnaire"],
        },
    }
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

    const mainRoute = createMainRoute(mainRouter, multiTenancyOptions);

    const metaDataRouter = express.Router(RouteHelper.getRouterOptions());

    // READ
    metaDataRouter.get('/', async (req: express.Request, res: express.Response) => {
        res.send(createMetaData());
    });

    mainRoute.use('/metadata', metaDataRouter);

    provideDecodedToken(mainRouter, type);
 
    const itemRouter = express.Router(RouteHelper.getRouterOptions());

    itemRouter.post(
        '/',
        RouteHelper.wrapAsync(async (req: express.Request, res: express.Response) => {
            const { resourceType, tenantId } = req.params;
            res.status(201)
                .json(createJSON(resourceType, tenantId, '9876'))
                .send(`Ok`);
        }),
    );

    itemRouter.put(
        '/:id',
        RouteHelper.wrapAsync(async (req: express.Request, res: express.Response) => {
            const { resourceType, tenantId, id } = req.params;
            res.status(200)
                .json(createJSON(resourceType, tenantId, id))
                .send(`Ok`);
        }),
    );

    itemRouter.patch(
        '/:id',
        RouteHelper.wrapAsync(async (req: express.Request, res: express.Response) => {
            const { resourceType, tenantId, id } = req.params;
            res.status(200)
                .json(createJSON(resourceType, tenantId, id))
                .send(`Ok`);
        }),
    );
    itemRouter.delete(
        '/:id',
        RouteHelper.wrapAsync(async (req: express.Request, res: express.Response) => {
            const { resourceType, tenantId, id } = req.params;
            res.status(200)
                .json(createJSON(resourceType, tenantId, id))
                .send(`Ok`);
        }),
    );

    itemRouter.get(
        '/',
        RouteHelper.wrapAsync(async (req: express.Request, res: express.Response) => {
            const { resourceType, tenantId } = req.params;
            res.status(200)
                .json(createJSON(resourceType, tenantId, undefined))
                .send(`Ok`);
        }),
    );
    itemRouter.get(
        '/_history',
        RouteHelper.wrapAsync(async (req: express.Request, res: express.Response) => {
            const { resourceType, tenantId } = req.params;
            res.status(200)
                .json(createJSON(resourceType, tenantId, undefined))
                .send(`Ok`);
        }),
    );

    itemRouter.get(
        '/:id',
        RouteHelper.wrapAsync(async (req: express.Request, res: express.Response) => {
            const { resourceType, tenantId, id } = req.params;
            res.status(200)
                .json(createJSON(resourceType, tenantId, id))
                .send(`Ok`);
        }),
    );
    itemRouter.get(
        '/:id/_history/:vid',
        RouteHelper.wrapAsync(async (req: express.Request, res: express.Response) => {
            const { resourceType, tenantId, id } = req.params;
            res.status(200)
                .json(createJSON(resourceType, tenantId, id))
                .send(`Ok`);
        }),
    );

    itemRouter.get(
        '/:id/_history',
        RouteHelper.wrapAsync(async (req: express.Request, res: express.Response) => {
            const { resourceType, tenantId, id } = req.params;
            res.status(200)
                .json(createJSON(resourceType, tenantId, id))
                .send(`Ok`);
        }),
    );

    mainRoute.use(`/:resourceType(${type})`, itemRouter);

    mainRouter.use(applicationErrorMapper);
    mainRouter.use(httpErrorHandler);
    mainRouter.use(unknownErrorHandler);
    server.use('/', mainRouter);
    return server;
}
