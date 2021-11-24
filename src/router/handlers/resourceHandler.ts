/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

import {
    Search,
    History,
    Persistence,
    Authorization,
    KeyValueMap,
    Validator,
    RequestContext,
} from 'fhir-works-on-aws-interface';
import BundleGenerator from '../bundle/bundleGenerator';
import CrudHandlerInterface from './CrudHandlerInterface';
import OperationsGenerator from '../operationsGenerator';
import { validateResource } from '../validation/validationUtilities';
import { buildTenantUrl } from '../routes/tenantBasedMainRouterDecorator';
import ResourceTypeSearch from '../../utils/ResourceTypeSearch';

export default class ResourceHandler implements CrudHandlerInterface {
    private validators: Validator[];

    private dataService: Persistence;

    private searchService: ResourceTypeSearch;

    private historyService: History;

    private authService: Authorization;

    private serverUrl: string;

    private tenantUrlPart?: string;

    constructor(
        dataService: Persistence,
        searchService: Search,
        historyService: History,
        authService: Authorization,
        serverUrl: string,
        validators: Validator[],
        tenantUrlPart?: string,
    ) {
        this.validators = validators;
        this.dataService = dataService;
        this.searchService = new ResourceTypeSearch(authService, searchService, serverUrl);
        this.historyService = historyService;
        this.authService = authService;
        this.serverUrl = serverUrl;
        this.tenantUrlPart = tenantUrlPart;
    }

    async create(resourceType: string, resource: any, tenantId?: string) {
        //await validateResource(this.validators, resource);

        const createResponse = await this.dataService.createResource({ resourceType, resource, tenantId });
        return createResponse.resource;
    }

    async update(resourceType: string, id: string, resource: any, tenantId?: string) {
        await validateResource(this.validators, resource);

        const updateResponse = await this.dataService.updateResource({ resourceType, id, resource, tenantId });
        return updateResponse.resource;
    }

    async patch(resourceType: string, id: string, resource: any, tenantId?: string) {
        // TODO Add request validation around patching
        const patchResponse = await this.dataService.patchResource({ resourceType, id, resource, tenantId });

        return patchResponse.resource;
    }

    async typeSearch(
        resourceType: string,
        queryParams: any,
        userIdentity: KeyValueMap,
        requestContext: RequestContext,
        tenantId?: string,
    ) {
        const searchResponse = await this.searchService.searchResources(
            resourceType,
            queryParams,
            userIdentity,
            requestContext,
            tenantId,
        );
        const bundle = BundleGenerator.generateBundle(
            this.serverUrl,
            queryParams,
            searchResponse,
            'searchset',
            resourceType,
            undefined,
            buildTenantUrl(tenantId, this.tenantUrlPart),
        );

        return this.authService.authorizeAndFilterReadResponse({
            operation: 'search-type',
            userIdentity,
            requestContext,
            readResponse: bundle,
        });
    }

    async typeHistory(
        resourceType: string,
        queryParams: any,
        userIdentity: KeyValueMap,
        requestContext: RequestContext,
        tenantId?: string,
    ) {
        const searchFilters = await this.authService.getSearchFilterBasedOnIdentity({
            userIdentity,
            requestContext,
            operation: 'history-type',
            resourceType,
        });

        const historyResponse = await this.historyService.typeHistory({
            resourceType,
            queryParams,
            baseUrl: this.serverUrl,
            searchFilters,
            tenantId,
        });
        return BundleGenerator.generateBundle(
            this.serverUrl,
            queryParams,
            historyResponse.result,
            'history',
            resourceType,
            undefined,
            buildTenantUrl(tenantId, this.tenantUrlPart),
        );
    }

    async instanceHistory(
        resourceType: string,
        id: string,
        queryParams: any,
        userIdentity: KeyValueMap,
        requestContext: RequestContext,
        tenantId?: string,
    ) {
        const searchFilters = await this.authService.getSearchFilterBasedOnIdentity({
            userIdentity,
            requestContext,
            operation: 'history-instance',
            resourceType,
            id,
        });

        const historyResponse = await this.historyService.instanceHistory({
            id,
            resourceType,
            queryParams,
            baseUrl: this.serverUrl,
            searchFilters,
            tenantId,
        });
        return BundleGenerator.generateBundle(
            this.serverUrl,
            queryParams,
            historyResponse.result,
            'history',
            resourceType,
            id,
            buildTenantUrl(tenantId, this.tenantUrlPart),
        );
    }

    async read(resourceType: string, id: string, tenantId?: string) {
        const getResponse = await this.dataService.readResource({ resourceType, id, tenantId });
        return getResponse.resource;
    }

    async vRead(resourceType: string, id: string, vid: string, tenantId?: string) {
        const getResponse = await this.dataService.vReadResource({ resourceType, id, vid, tenantId });
        return getResponse.resource;
    }

    async delete(resourceType: string, id: string, tenantId?: string) {
        await this.dataService.deleteResource({ resourceType, id, tenantId });
        return OperationsGenerator.generateSuccessfulDeleteOperation();
    }
}
