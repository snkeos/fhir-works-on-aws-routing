/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

import { Search, SearchFilter, History, KeyValueMap, Authorization, RequestContext } from 'fhir-works-on-aws-interface';
import BundleGenerator from '../bundle/bundleGenerator';
import { buildTenantUrl } from '../routes/tenantBasedMainRouterDecorator';

export default class RootHandler {
    private searchService: Search;

    private historyService: History;

    private authService: Authorization;

    private serverUrl: string;

    private tenantUrlPart?: string;

    constructor(
        searchService: Search,
        historyService: History,
        authService: Authorization,
        serverUrl: string,
        tenantUrlPart?: string,
    ) {
        this.searchService = searchService;
        this.historyService = historyService;
        this.authService = authService;
        this.serverUrl = serverUrl;
        this.tenantUrlPart = tenantUrlPart;
    }

    async globalSearch(queryParams: any, userIdentity: KeyValueMap, requestContext: RequestContext, tenantId?: string) {
        const searchFilters = await this.authService.getSearchFilterBasedOnIdentity({
            userIdentity,
            requestContext,
            operation: 'search-system',
        });

        const searchResponse = await this.searchService.globalSearch({
            queryParams,
            baseUrl: this.serverUrl,
            searchFilters,
            tenantId,
        });
        return BundleGenerator.generateBundle(
            this.serverUrl,
            queryParams,
            searchResponse.result,
            'searchset',
            undefined,
            undefined,
            buildTenantUrl(tenantId, this.tenantUrlPart),
        );
    }

    async globalHistory(
        queryParams: any,
        userIdentity: KeyValueMap,
        requestContext: RequestContext,
        tenantId?: string,
    ) {
        const searchFilters = await this.authService.getSearchFilterBasedOnIdentity({
            userIdentity,
            requestContext,
            operation: 'history-system',
        });
        const historyResponse = await this.historyService.globalHistory({
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
            undefined,
            undefined,
            buildTenantUrl(tenantId, this.tenantUrlPart),
        );
    }
}
