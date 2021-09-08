import express from 'express';

import { MultiTenancyOptions } from 'fhir-works-on-aws-interface';
import { MainRoute } from './mainRoute';
import { TenantBasedMainRoute } from './tenantBaseMainRoute';

export function createMainRoute(mainRouter: express.Router, options: MultiTenancyOptions): MainRoute {
    if (options.enabled) {
        return new TenantBasedMainRoute(mainRouter, options);
    }

    return new MainRoute(mainRouter);
}
