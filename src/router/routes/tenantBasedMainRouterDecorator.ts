import { int } from 'aws-sdk/clients/datapipeline';
import express, { Router } from 'express';
import {
    MultiTenancyOptions,
    UnauthorizedError,
    InvalidResourceError,
    cleanUrlPath,
} from 'fhir-works-on-aws-interface';
import { MainRouterDecorator } from './mainRouterDecorator';
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
        if (verb === 'POST') {
            // For Transaction Bundles
            return true;
        }

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
        default: {
            break;
        }
    }
    console.log(`Malformed based url: ${urlPath} for HTTP method: ${verb}`);
    return false;
}
export function buildTenantUrl(tenantId?: string, tenantUrlPart?: string) {
    if (tenantId === undefined) return undefined;
    return tenantUrlPart !== undefined ? `${tenantUrlPart}/${tenantId}` : tenantId;
}

// The class provides a middle ware, which supports url based multi tenancy
export class TenantBasedMainRouterDecorator extends MainRouterDecorator {
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
    use(resourceUrl: string, childRouter: Router): MainRouterDecorator {
        let route;
        if (this.options.tenantUrlPart !== undefined) {
            route = `/${this.options.tenantUrlPart}/:tenantId${resourceUrl}`;
        } else {
            route = `/:tenantId${resourceUrl}`;
        }

        if (this.shallIntrospectAccessToken(resourceUrl)) {
            this.mainRouter.use(
                route,
                (req: express.Request, res: express.Response, next: express.NextFunction) => {
                    // Check in the authorized tenants of this user with tenant the user requests

                    // The default tenant is always allowed to be accesed
                    if (req.params.tenantId === 'DEFAULT') {
                        next();
                        return;
                    }
                    // Check for an all tenants scope
                    if (this.grantAccessForAllTenants(res)) {
                        next();
                        return;
                    }
                    // Check for a specific tenants scope
                    if (this.grantAccessForSpecificTenant(res, req.params.tenantId)) {
                        next();
                        return;
                    }
                    throw new UnauthorizedError(
                        `Unauthorized: No permission included in access token in order to access ${req.params.tenantId}`,
                    );
                },
                childRouter,
            );
        } else {
            this.mainRouter.use(route, childRouter);
        }
        return this;
    }

    // Evaluates whether the token shall be checked to grant/deny access based on tenant data.
    private shallIntrospectAccessToken(resourceUrl: string) {
        if (resourceUrl.includes('/metadata')) return false;

        return this.options.tenantAccessTokenClaim !== undefined || this.options.tenantAccessTokenAllTenantsScope;
    }

    // Evaluates if an all tenants scope matches with the configured one.
    private grantAccessForAllTenants(res: express.Response) {
        if (this.options.tenantAccessTokenAllTenantsScope !== undefined) {
            const scopes: string[] = res.locals.userIdentity.scope ?? [];
            if (scopes.includes(this.options.tenantAccessTokenAllTenantsScope)) {
                return true;
            }
        }
        return false;
    }

    // Evaluates if tenant id url param value is included in the token, or not.
    private grantAccessForSpecificTenant(res: express.Response, tenantId: string) {
        if (
            this.options.tenantAccessTokenClaim !== undefined &&
            res.locals.userIdentity[this.options.tenantAccessTokenClaim] !== undefined
        ) {
            const tenantAccessTokenClaimValues: string[] =
                res.locals.userIdentity[this.options.tenantAccessTokenClaim] ?? [];
            const tenantAccessTokenClaimValueToTest: string =
                this.options.tenantAccessTokenClaimValuePrefix !== undefined
                    ? this.options.tenantAccessTokenClaimValuePrefix + tenantId
                    : tenantId;
            if (tenantAccessTokenClaimValues.includes(tenantAccessTokenClaimValueToTest)) {
                return true;
            }
            return false;
        }
        throw new UnauthorizedError(`Unauthorized wrong token claim ${this.options.tenantAccessTokenClaim}`);
    }
}
export function buildMainRouterDecorator(
    mainRouter: express.Router,
    options: MultiTenancyOptions,
): MainRouterDecorator {
    if (options.enabled) {
        return new TenantBasedMainRouterDecorator(mainRouter, options);
    }

    return new MainRouterDecorator(mainRouter);
}
