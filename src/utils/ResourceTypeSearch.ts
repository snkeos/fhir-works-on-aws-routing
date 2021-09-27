import { Authorization, KeyValueMap, RequestContext, Search, SearchResult } from 'fhir-works-on-aws-interface';

/**
 * Helper encapsulates the typeSearch request
 */
export default class ResourceTypeSearch {
    private authService: Authorization;

    private searchService: Search;

    readonly serverUrl: string;

    constructor(authService: Authorization, searchService: Search, serverUrl: string) {
        this.authService = authService;
        this.searchService = searchService;
        this.serverUrl = serverUrl;
    }

    async searchResources(
        resourceType: string,
        queryParams: any,
        userIdentity: KeyValueMap,
        requestContext: RequestContext,
        tenantId?: string,
    ): Promise<SearchResult> {
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

        const searchResponse = await this.searchService.typeSearch({
            resourceType,
            queryParams,
            baseUrl: this.serverUrl,
            allowedResourceTypes,
            searchFilters,
            tenantId,
        });

        return searchResponse.result;
    }
}
