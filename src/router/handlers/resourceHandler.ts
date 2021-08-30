/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

import {
    Search,
    SearchFilter,
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

export default class ResourceHandler implements CrudHandlerInterface {
    private validators: Validator[];

    private dataService: Persistence;

    private searchService: Search;

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
        this.searchService = searchService;
        this.historyService = historyService;
        this.authService = authService;
        this.serverUrl = serverUrl;
        this.tenantUrlPart = tenantUrlPart;
    }

    async create(resourceType: string, resource: any, tenantId?: string) {
        await validateResource(this.validators, resource);

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

    
    getTenantUrl(tenantId?: string)  {
        if (tenantId === undefined) {
            return undefined;
        }
        return this.tenantUrlPart !== undefined ? `${this.tenantUrlPart}/${tenantId}` : tenantId;
    }

    async typeSearch(
        resourceType: string,
        queryParams: any,
        userIdentity: KeyValueMap,
        requestContext: RequestContext,
        tenantId?: string,
    ) {
        const allowedResourceTypes = await this.authService.getAllowedResourceTypesForOperation({
            operation: 'search-type',
            userIdentity,
            requestContext,
        });

        const searchFilters = await this.authService.getSearchFilterBasedOnIdentity({
            userIdentity,
            requestContext,
            operation: 'search-type',
            resourceType,
        });

        if (tenantId !== undefined) {
            const tenantIdSearchFilter: SearchFilter = {
                key: 'tenantId',
                value: [tenantId],
                comparisonOperator: '==',
                logicalOperator: 'AND',
            };
            searchFilters.push(tenantIdSearchFilter);
        }
        const tenantUrl = this.getTenantUrl(tenantId);

        const searchResponse = await this.searchService.typeSearch({
            resourceType,
            queryParams,
            baseUrl: this.serverUrl,
            allowedResourceTypes,
            searchFilters,
            tenantUrl,
        });
        const bundle = BundleGenerator.generateBundle(
            this.serverUrl,
            queryParams,
            searchResponse.result,
            'searchset',
            resourceType,
            undefined,
            tenantUrl,
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
        const tenantUrl = this.getTenantUrl(tenantId);
        return BundleGenerator.generateBundle(
            this.serverUrl,
            queryParams,
            historyResponse.result,
            'history',
            resourceType,
            undefined,
            tenantUrl,
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
        const tenantUrl = this.getTenantUrl(tenantId);
        return BundleGenerator.generateBundle(
            this.serverUrl,
            queryParams,
            historyResponse.result,
            'history',
            resourceType,
            id,
            tenantUrl,
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
