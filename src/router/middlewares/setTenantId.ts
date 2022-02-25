/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 *
 */

import { FhirConfig, UnauthorizedError } from 'fhir-works-on-aws-interface';
import express from 'express';
import { get, uniq } from 'lodash';
import RouteHelper from '../routes/routeHelper';

const tenantIdRegex = /^[a-zA-Z0-9\-_]{1,64}$/;

const getTenantIdFromAudString = (audClaim: string, baseUrl: string): string | undefined => {
    if (audClaim.startsWith(`${baseUrl}/tenant/`)) {
        return audClaim.substring(`${baseUrl}/tenant/`.length);
    }
    return undefined;
};

const getTenantIdFromAudClaim = (audClaim: any, baseUrl: string): string | undefined => {
    if (!audClaim) {
        return undefined;
    }
    let audClaimAsArray: string[] = [];

    if (typeof audClaim === 'string') {
        audClaimAsArray = [audClaim];
    }

    if (Array.isArray(audClaim)) {
        audClaimAsArray = audClaim;
    }

    const tenantIds = audClaimAsArray
        .map((aud: string) => getTenantIdFromAudString(aud, baseUrl))
        .filter((aud: any) => aud !== undefined);

    const uniqTenantIds = uniq(tenantIds);

    if (uniqTenantIds.length > 1) {
        // tokens with multiple aud URLs with different tenantIds are not supported
        return undefined;
    }
    if (uniqTenantIds.length === 0) {
        return undefined;
    }
    return uniqTenantIds[0];
};


// Evaluates if an all tenants scope matches with the configured one.
function grantAccessForAllTenants(res: express.Response, fhirConfig: FhirConfig) {
    if (fhirConfig.multiTenancyConfig?.grantAccessAllTenantsScope) {
        const scopes: string[] = res.locals.userIdentity.scope ?? [];
        if (scopes.includes(fhirConfig.multiTenancyConfig?.grantAccessAllTenantsScope)) {
            return true;
        }
    }
    return false;
}

// Evaluates if tenant id url param value is included in the token, or not.
function grantAccessForSpecificTenant(tenantIdFromCustomClaim: any, fhirConfig: FhirConfig, tenantId: string) {
    if (tenantIdFromCustomClaim && Array.isArray(tenantIdFromCustomClaim)) {
        const tenantIdFromCustomClaimAsArray: string[] = tenantIdFromCustomClaim;
        const tenantAccessTokenClaimValueToTest: string = fhirConfig.multiTenancyConfig?.tenantIdClaimValuePrefix
            ? fhirConfig.multiTenancyConfig?.tenantIdClaimValuePrefix + tenantId
            : tenantId;
        if (tenantIdFromCustomClaimAsArray.includes(tenantAccessTokenClaimValueToTest)) {
            return true;
        }
        return false;
    }
}

/**
 * Sets the value of `res.locals.tenantId`
 * tenantId is used to identify tenants in a multi-tenant setup
 */
export const setTenantIdMiddleware: (
    fhirConfig: FhirConfig,
) => (req: express.Request, res: express.Response, next: express.NextFunction) => void = (fhirConfig: FhirConfig) => {
    return RouteHelper.wrapAsync(async (req: express.Request, res: express.Response, next: express.NextFunction) => {
        // The default tenant is always allowed to be accesed
        if (req.params.tenantIdFromPath === 'DEFAULT') {
            res.locals.tenantId = req.params.tenantIdFromPath;
            next();
            return;
        }

        // Check for an all tenants scope
        if (grantAccessForAllTenants(res, fhirConfig)) {
            res.locals.tenantId = req.params.tenantIdFromPath;
            next();
            return;
        }

        // Find tenantId from custom claim
        const tenantIdFromCustomClaim = get(res.locals.userIdentity, fhirConfig.multiTenancyConfig?.tenantIdClaimPath!);
        // Check for a specific tenants scope
        if (grantAccessForSpecificTenant(tenantIdFromCustomClaim, fhirConfig, req.params.tenantIdFromPath)) {
            res.locals.tenantId = req.params.tenantIdFromPath;
            next();
            return;
        }

        // Find tenantId from custom claim and aud claim
        const tenantIdFromAudClaim = getTenantIdFromAudClaim(res.locals.userIdentity.aud, fhirConfig.server.url);

        // TenantId should exist in at least one claim, if exist in both claims, they should be equal
        if (
            (tenantIdFromCustomClaim === undefined && tenantIdFromAudClaim === undefined) ||
            (tenantIdFromCustomClaim && tenantIdFromAudClaim && tenantIdFromCustomClaim !== tenantIdFromAudClaim)
        ) {
            throw new UnauthorizedError('Unauthorized');
        }
        const tenantId = tenantIdFromCustomClaim || tenantIdFromAudClaim;

        if (
            !tenantIdRegex.test(tenantId) ||
            (req.params.tenantIdFromPath !== undefined && req.params.tenantIdFromPath !== tenantId)
        ) {
            throw new UnauthorizedError('Unauthorized');
        }
        res.locals.tenantId = tenantId;
        next();
    });
};
