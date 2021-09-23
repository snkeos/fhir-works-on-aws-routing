import {
    Search,
    SearchResponse,
    GlobalSearchRequest,
    TypeSearchRequest,
    SearchCapabilityStatement,
} from 'fhir-works-on-aws-interface';

class ElasticSearchTestService implements Search {
    expectedSearchSet: any[] = [];

    setExpectedSearchSet(entries: any[]) {
        this.expectedSearchSet = entries;
    }

    /*
    searchParams => {field: value}
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async typeSearch(request: TypeSearchRequest) {
        return {
            success: true,
            result: {
                numberOfResults: this.expectedSearchSet.length,
                message: '',
                entries: this.expectedSearchSet,
            },
        };
    }

    // eslint-disable-next-line class-methods-use-this, @typescript-eslint/no-unused-vars
    globalSearch(request: GlobalSearchRequest): Promise<SearchResponse> {
        throw new Error('Method not implemented.');
    }

    // eslint-disable-next-line class-methods-use-this, @typescript-eslint/no-unused-vars, @typescript-eslint/no-empty-function
    async getCapabilities(): Promise<SearchCapabilityStatement> {
        throw new Error('Method not implemented.');
    }
}

const ElasticSearchService: ElasticSearchTestService = new ElasticSearchTestService();

export default ElasticSearchService;
