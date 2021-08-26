import { int } from 'aws-sdk/clients/datapipeline';
import express, { Router } from 'express';
import {
    MultiTenancyOptions,
    UnauthorizedError,
    InvalidResourceError,
    cleanUrlPath,
} from 'fhir-works-on-aws-interface';
import { MainRoute } from './mainRoute';
import RouteHelper from './routeHelper';

const tenantIdRegex = /^[a-zA-Z0-9\-_]{1,64}$/;
const resourceTypeRegex = /^[A-Z][a-zA-Z]+$/;

// This function inspects the format of the base url path whether the tenant information is correctly placed.
// @param tenantIdIndex The expected sub url index where the tenant id should be placed
// @param resourceTypeIndex The expected sub url index where the resource type should be placed
// @param verb The http method (Get, Post, Put....)
// @param urlPath The given url path to validata
function validateTenantBaseUrl(tenantIdIndex: int, resourceTypeIndex: int, verb: string, urlPath: string): boolean {
    const path = cleanUrlPath(urlPath);
    const urlSplit = path.split('/');

    if (urlSplit.length <= resourceTypeIndex) {
        console.error(`Expected url length: ${urlSplit.length} is too short`);
        return false;
    }

    if (!tenantIdRegex.test(urlSplit[tenantIdIndex])) {
        console.error(`Malformed tenant id: ${urlSplit[tenantIdIndex]}`);
        return false;
    }

    if (!resourceTypeRegex.test(urlSplit[resourceTypeIndex]) && urlSplit[resourceTypeIndex] !== 'metadata') {
        console.error(`Malformed resource name: ${urlSplit[resourceTypeIndex]}`);
        return false;
    }

    switch (verb) {
        case 'PUT':
        case 'PATCH': {
            if (urlSplit.length === 2 + resourceTypeIndex) return true;
            break;
        }

        case 'DELETE': {
            const exportJobUrlRegExp = /\$export\/[\w|-]+/;
            if (exportJobUrlRegExp.test(urlPath) && urlSplit.length === 1 + resourceTypeIndex) {
                return true;
            }
            if (urlSplit.length === 2 + resourceTypeIndex) return true;
            break;
        }

        case 'GET': {
            if (urlPath.includes('$export') && urlSplit.length === 1 + resourceTypeIndex) {
                return true;
            }
            if (urlSplit[urlSplit.length - 1].startsWith('_history')) {
                // if the last section of the url string starts with history
                if (urlSplit[resourceTypeIndex].startsWith('_history') && urlSplit.length === 1 + resourceTypeIndex) {
                    // '_history' is at root or url
                    return true;
                }
                if (
                    urlSplit[resourceTypeIndex + 1].startsWith('_history') &&
                    urlSplit.length === 2 + resourceTypeIndex
                ) {
                    return true;
                }
                // .../resourcetype/id/history
                if (urlSplit.length === 3 + resourceTypeIndex) return true;
            }
            if (path.includes('_history/') && urlSplit.length === 4 + resourceTypeIndex) return true;

            // For a generic read of a specific resource it has to be /[type]/[id]
            if (urlSplit.length === 2 + resourceTypeIndex) return true;

            // For a generic read of all resources it has to be /[type]
            if (urlSplit.length === 1 + resourceTypeIndex) return true;

            break;
        }

        case 'POST': {
            if (urlSplit.length === 1 + resourceTypeIndex) return true;
            break;
        }
        case 'OPTIONS': {
            if (urlSplit.length >= 1 + resourceTypeIndex) return true;
            break;
        }
        default: {
            break;
        }
    }
    console.log(`Malformed based url: ${urlPath} for HTTP method: ${verb}`);
    return false;
}

// The class provides a middle ware, which supports url based multi tenancy
export class TenantBasedMainRoute extends MainRoute {
    options: MultiTenancyOptions;

    constructor(mainRouter: express.Router, options: MultiTenancyOptions) {
        super(mainRouter);
        this.options = options;

        RouteHelper.setExtractResourceUrlFunction((httpMethod: string, baseUrl: string) => {
            // This function object cuts the tenant information from the base url
            // in order to provide the sub urls starting at resource type
            let path = baseUrl;
            if (path[0] === '/') {
                path = path.substr(1);
            }
            const urlParts = path.split('/');

            // /{tenantId}/resourceType
            if (this.options.tenantUrlPart === undefined) {
                if (validateTenantBaseUrl(0, 1, httpMethod, path)) {
                    return `/${urlParts.splice(1).join('/')}`;
                }
                throw new InvalidResourceError(
                    `Malformed based url: ${baseUrl} for HTTP method: ${httpMethod}. Expecting /{tenantId}/resourceType/...`,
                );
            } // /<tenantUrlPart>/{tenantId}/resourceType
            else {
                if (urlParts[0] === this.options.tenantUrlPart) {
                    if (validateTenantBaseUrl(1, 2, httpMethod, path)) {
                        return `/${urlParts.splice(2).join('/')}`;
                    }
                }
                throw new InvalidResourceError(
                    `Malformed based url: ${baseUrl} for HTTP method: ${httpMethod}. Expecting /${this.options.tenantUrlPart}/{tenantId}/resourceType/...`,
                );
            }
        });
    }

    // Registers a resource url as part of a tenant url
    use(resourceUrl: string, childRouter: Router): MainRoute {
        let route;
        if (this.options.tenantUrlPart !== undefined) {
            route = `/:tenantType(${this.options.tenantUrlPart})/:tenantId${resourceUrl}`;
        } else {
            route = `/:tenantId${resourceUrl}`;
        }

        if (this.options.tenantAccessTokenClaim !== undefined && !resourceUrl.includes('/metadata')) {
            this.mainRouter.use(
                route,
                (req: express.Request, res: express.Response, next: express.NextFunction) => {
                    // Check in the authorized tenants of this user with tenant the user requests
                    if (req.params.tenantId === 'DEFAULT') {
                        next();
                    } else if (
                        this.options.tenantAccessTokenClaim !== undefined &&
                        res.locals.userIdentity[this.options.tenantAccessTokenClaim] !== undefined
                    ) {
                        const tenants: string[] = res.locals.userIdentity[this.options.tenantAccessTokenClaim] ?? [];
                        const tenant: string =
                            this.options.tenantAccessTokenClaimValuePrefix !== undefined
                                ? this.options.tenantAccessTokenClaimValuePrefix + req.params.tenantId
                                : req.params.tenantId;
                        if (tenants.includes(tenant) || req.params.tenantId === 'DEFAULT') {
                            next();
                        } else {
                            throw new UnauthorizedError('Unauthorized');
                        }
                    } else {
                        throw new UnauthorizedError('Unauthorized wrong token claim');
                    }
                },
                childRouter,
            );
        } else {
            this.mainRouter.use(route, childRouter);
        }
        return this;
    }
}
