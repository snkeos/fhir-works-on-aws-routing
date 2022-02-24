import {
    Authorization,
    AuthorizationBundleRequest,
    AllowedResourceTypesForOperationRequest,
    ReadResponseAuthorizedRequest,
    VerifyAccessTokenRequest,
    WriteRequestAuthorizedRequest,
    AccessBulkDataJobRequest,
    KeyValueMap,
    GetSearchFilterBasedOnIdentityRequest,
    SearchFilter,
} from 'fhir-works-on-aws-interface';

class AuthorizationTestService implements Authorization {
    private tokenDecoded: any;

    // eslint-disable-next-line class-methods-use-this, @typescript-eslint/no-unused-vars, @typescript-eslint/no-empty-function
    async verifyAccessToken(request: VerifyAccessTokenRequest): Promise<KeyValueMap> {
        if (!this.tokenDecoded) {
            const practitionerDecoded = {
                sub: 'fake',
                'cognito:groups': ['practitioner'],
                name: 'not real',
                iat: 1516239022,
            };
            return practitionerDecoded;
        }
        return this.tokenDecoded;
    }

    // eslint-disable-next-line class-methods-use-this, @typescript-eslint/no-unused-vars, @typescript-eslint/no-empty-function
    async isAccessBulkDataJobAllowed(request: AccessBulkDataJobRequest): Promise<void> {}

    // eslint-disable-next-line class-methods-use-this, @typescript-eslint/no-unused-vars, @typescript-eslint/no-empty-function
    async isBundleRequestAuthorized(request: AuthorizationBundleRequest): Promise<void> {}

    // eslint-disable-next-line class-methods-use-this
    async authorizeAndFilterReadResponse(request: ReadResponseAuthorizedRequest): Promise<any> {
        // Currently no additional filtering/checking is needed for RBAC
        return request.readResponse;
    }

    // eslint-disable-next-line class-methods-use-this, @typescript-eslint/no-unused-vars, @typescript-eslint/no-empty-function
    async isWriteRequestAuthorized(_request: WriteRequestAuthorizedRequest): Promise<void> {}

    // eslint-disable-next-line class-methods-use-this, @typescript-eslint/no-unused-vars, @typescript-eslint/no-empty-function
    async getAllowedResourceTypesForOperation(request: AllowedResourceTypesForOperationRequest): Promise<string[]> {
        return ['Patient', 'Observation', 'Questionnaire', 'QuestionnaireResponse', 'Practitioner'];
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars,class-methods-use-this
    async getSearchFilterBasedOnIdentity(request: GetSearchFilterBasedOnIdentityRequest): Promise<SearchFilter[]> {
        return [];
    }

    assignTokenDecoded(newTokenDecoded: any): void {
        this.tokenDecoded = newTokenDecoded;
    }
}
const AuthorizationService: AuthorizationTestService = new AuthorizationTestService();
export default AuthorizationService;
