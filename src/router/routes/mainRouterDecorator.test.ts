import request from 'supertest';
// eslint-disable-next-line import/no-unresolved
import { Express } from 'express-serve-static-core';
import {
    createServer,
    createResponseBody,
    createMetaData,
    setPerRequestAccessTokenScopes,
    getExpectedCreateResourceId,
    setExpectedCreateResourceId,
} from '../__mocks__/mainRouteTestServer';

let server: Express;
const resourceType: string = 'Patient';
const resourceId: string = '12345';
const defaultTenantId: string = 'DEFAULT';
const specificTenantId: string = '915b76f7-8744-4010-bd31-a1e4c0d9fc64';
const wrongTenantId: string = '1234567890';
const anyTenantId: string = '09876543';
const anyTenantId2: string = '32109887';
const anyTenantId3: string = '65432';
const postResource = async (
    done: jest.DoneCallback,
    statusCode: number,
    url: string,
    id: string,
    tenantId?: string,
) => {
    request(server)
        .post(url)
        .expect(statusCode)
        .end((err, res) => {
            if (err) return done(err);
            expect(res.body).toMatchObject(createResponseBody(resourceType, tenantId, id));
            return done();
        });
};

const putResource = async (done: jest.DoneCallback, statusCode: number, url: string, id: string, tenantId?: string) => {
    request(server)
        .put(url)
        .expect(statusCode)
        .end((err, res) => {
            if (err) return done(err);
            expect(res.body).toMatchObject(createResponseBody(resourceType, tenantId, id));
            return done();
        });
};

const patchResource = async (
    done: jest.DoneCallback,
    statusCode: number,
    url: string,
    id: string,
    tenantId?: string,
) => {
    request(server)
        .patch(url)
        .expect(statusCode)
        .end((err, res) => {
            if (err) return done(err);
            expect(res.body).toMatchObject(createResponseBody(resourceType, tenantId, id));
            return done();
        });
};
const deleteResource = async (
    done: jest.DoneCallback,
    statusCode: number,
    url: string,
    id: string,
    tenantId?: string,
) => {
    request(server)
        .delete(url)
        .expect(statusCode)
        .end((err, res) => {
            if (err) return done(err);
            expect(res.body).toMatchObject(createResponseBody(resourceType, tenantId, id));
            return done();
        });
};
const getResource = async (
    done: jest.DoneCallback,
    statusCode: number,
    url: string,
    id?: string,
    tenantId?: string,
    textMsg?: string,
) => {
    request(server)
        .get(url)
        .expect(statusCode)
        .end((err, res) => {
            if (err) return done(err);
            if (statusCode < 301) {
                expect(res.body).toMatchObject(createResponseBody(resourceType, tenantId, id));
            }
            if (statusCode === 400) {
                expect(res.body.issue[0].diagnostics).toContain(textMsg);
            }
            if (statusCode === 401) {
                expect(res.text).toContain(textMsg);
            }
            return done();
        });
};

const getMetaData = async (done: jest.DoneCallback, statusCode: number, tenantId: string) => {
    request(server)
        .get(`/${tenantId}/metadata`)
        .expect(statusCode)
        .end((err, res) => {
            if (err) return done(err);
            expect(res.body).toMatchObject(createMetaData());
            return done();
        });
};

// Test the non multi tenancy case in order to check that existing routing is not affected
describe('Regression: Routing without multi tenancy: POST, PUT, PATCH, DELETE, GET /Patient', () => {
    beforeAll(async () => {
        server = await createServer(
            {
                enabled: false,
            },
            resourceType,
        );
    });

    it(`Post: /${resourceType} should return 201.`, async done => {
        setExpectedCreateResourceId('34567');
        postResource(done, 201, `/${resourceType}`, getExpectedCreateResourceId());
    });

    it(`Put: /${resourceType} should return 200.`, async done => {
        putResource(done, 200, `/${resourceType}/${resourceId}`, resourceId);
    });

    it(`Patch: /${resourceType}  should return 200.`, async done => {
        patchResource(done, 200, `/${resourceType}/${resourceId}`, resourceId);
    });

    it(`Delete: /${resourceType}  should return 200.`, async done => {
        deleteResource(done, 200, `/${resourceType}/${resourceId}`, resourceId);
    });

    it(`Get: /${resourceType} it should return 200.`, async done => {
        getResource(done, 200, `/${resourceType}`);
    });

    it(`Get: specified /${resourceType} id should return 200.`, async done => {
        getResource(done, 200, `/${resourceType}/${resourceId}`, resourceId);
    });
});

// The basic multi tenancy with out specified features
describe('Routing with multi tenancy (basic): POST, PUT, PATCH, DELETE, GET /{tenantid}/Patient/{id}', () => {
    beforeAll(async () => {
        server = await createServer(
            {
                enabled: true,
            },
            resourceType,
        );
    });

    it(`Get: /${resourceType} for a specified tenant it should always return 200.`, async done => {
        getResource(done, 200, `/${specificTenantId}/${resourceType}/${resourceId}`, resourceId, specificTenantId);
    });

    it(`Get: /${resourceType} Regression for the Default tenant it should always return 200.`, async done => {
        getResource(done, 200, `/${defaultTenantId}/${resourceType}/${resourceId}`, resourceId, defaultTenantId);
    });
});

// Test multi tenancy with restricting users to certain tenants, via access token
describe('Routing with multi tenancy (including: token based tenant access control): POST, PUT, PATCH, DELETE,GET /{tenantid}/patient/', () => {
    beforeAll(async () => {
        server = await createServer(
            {
                enabled: true,
                tenantAccessTokenClaim: 'cognito:groups',
                tenantAccessTokenClaimValuePrefix: 'tenantprefix:',
            },
            resourceType,
        );
    });

    it(`Post: /${defaultTenantId}/${resourceType} should return 201.`, async done => {
        setExpectedCreateResourceId('6789');
        postResource(done, 201, `/${defaultTenantId}/${resourceType}`, getExpectedCreateResourceId(), defaultTenantId);
    });
    it(`Put: /${defaultTenantId}/${resourceType}/${resourceId} should return 200.`, async done => {
        putResource(done, 200, `/${defaultTenantId}/${resourceType}/${resourceId}`, resourceId, defaultTenantId);
    });

    it(`Patch: /${defaultTenantId}/${resourceType}/${resourceId} should return 200.`, async done => {
        patchResource(done, 200, `/${defaultTenantId}/${resourceType}/${resourceId}`, resourceId, defaultTenantId);
    });

    it(`Delete: /${defaultTenantId}/${resourceType}/${resourceId} should return 200.`, async done => {
        deleteResource(done, 200, `/${defaultTenantId}/${resourceType}/${resourceId}`, resourceId, defaultTenantId);
    });
    it(`Get: /${defaultTenantId}/${resourceType} should return 200.`, async done => {
        getResource(done, 200, `/${defaultTenantId}/${resourceType}`, undefined, defaultTenantId);
    });
    it(`Get: /${defaultTenantId}/${resourceType}/${resourceId} should return 200.`, async done => {
        getResource(done, 200, `/${defaultTenantId}/${resourceType}/${resourceId}`, resourceId, defaultTenantId);
    });

    it(`Get: /${specificTenantId}/${resourceType} should return 200.`, async done => {
        getResource(done, 200, `/${specificTenantId}/${resourceType}`, undefined, specificTenantId);
    });

    it(`Get: /${specificTenantId}/${resourceType}/${resourceId} should return 200.`, async done => {
        getResource(done, 200, `/${specificTenantId}/${resourceType}/${resourceId}`, resourceId, specificTenantId);
    });
    it(`Get: /${specificTenantId}/${resourceType}/_history should return 200.`, async done => {
        getResource(done, 200, `/${specificTenantId}/${resourceType}/_history`, undefined, specificTenantId);
    });

    it(`Get: /${specificTenantId}/${resourceType}/${resourceId}/_history should return 200.`, async done => {
        getResource(
            done,
            200,
            `/${specificTenantId}/${resourceType}/${resourceId}/_history`,
            resourceId,
            specificTenantId,
        );
    });

    it(`Get: /${specificTenantId}/${resourceType}/${resourceId}/_history/1 should return 200.(`, async done => {
        getResource(
            done,
            200,
            `/${specificTenantId}/${resourceType}/${resourceId}/_history/1`,
            resourceId,
            specificTenantId,
        );
    });

    it(`Get: /${wrongTenantId}/${resourceType}/${resourceId} for wrong tenant should return 401`, async done => {
        getResource(
            done,
            401,
            `/${wrongTenantId}/${resourceType}/${resourceId}`,
            resourceId,
            wrongTenantId,
            `Unauthorized`,
        );
    });
});

// Test multi tenancy with restricting users to certain tenants, via access token and a configurable tenanttype url part in front of the tenant id.
describe('Routing with multi tenancy (including: tenant type url, token based tenant access control): POST, PUT, PATCH, DELETE,GET /tenant/{tenantid}/patient/', () => {
    beforeAll(async () => {
        server = await createServer(
            {
                enabled: true,
                tenantUrlPart: 'tenant',
                tenantAccessTokenClaim: 'cognito:groups',
                tenantAccessTokenClaimValuePrefix: 'tenantprefix:',
            },
            resourceType,
        );
    });

    it(`Post: /tenant/${specificTenantId}/${resourceType} should return 201.`, async done => {
        setExpectedCreateResourceId('98765');
        postResource(
            done,
            201,
            `/tenant/${specificTenantId}/${resourceType}`,
            getExpectedCreateResourceId(),
            specificTenantId,
        );
    });
    it(`Put: /tenant/${specificTenantId}/${resourceType} should return 200.`, async done => {
        putResource(
            done,
            200,
            `/tenant/${specificTenantId}/${resourceType}/${resourceId}`,
            resourceId,
            specificTenantId,
        );
    });

    it(`Patch: /tenant/${specificTenantId}/${resourceType} should return 200.`, async done => {
        patchResource(
            done,
            200,
            `/tenant/${specificTenantId}/${resourceType}/${resourceId}`,
            resourceId,
            specificTenantId,
        );
    });

    it(`Delete: /tenant/${specificTenantId}/${resourceType} should return 200.`, async done => {
        deleteResource(
            done,
            200,
            `/tenant/${specificTenantId}/${resourceType}/${resourceId}`,
            resourceId,
            specificTenantId,
        );
    });

    it(`Get: /tenant/${defaultTenantId}/${resourceType}/${resourceId} should return 200.`, async done => {
        getResource(done, 200, `/tenant/${defaultTenantId}/${resourceType}/${resourceId}`, resourceId, defaultTenantId);
    });

    it(`Get: /tenant/${specificTenantId}/${resourceType} should return 200.`, async done => {
        getResource(done, 200, `/tenant/${specificTenantId}/${resourceType}`, undefined, specificTenantId);
    });

    it(`Get: /tenant/${specificTenantId}/${resourceType}/${resourceId} should return 200.`, async done => {
        getResource(
            done,
            200,
            `/tenant/${specificTenantId}/${resourceType}/${resourceId}`,
            resourceId,
            specificTenantId,
        );
    });
    it(`Get: /tenant/${specificTenantId}/${resourceType}/_history should return 200.`, async done => {
        getResource(done, 200, `/tenant/${specificTenantId}/${resourceType}/_history`, undefined, specificTenantId);
    });

    it(`Get: /tenant/${specificTenantId}/${resourceType}/${resourceId}/_history should return 200.`, async done => {
        getResource(
            done,
            200,
            `/tenant/${specificTenantId}/${resourceType}/${resourceId}/_history`,
            resourceId,
            specificTenantId,
        );
    });

    it(`Get: /tenant/${specificTenantId}/${resourceType}/${resourceId}/_history/1 should return 200.`, async done => {
        getResource(
            done,
            200,
            `/tenant/${specificTenantId}/${resourceType}/${resourceId}/_history/1`,
            resourceId,
            specificTenantId,
        );
    });
});

// Test multi tenancy with restricting users to certain tenants, via access token
describe('Routing with multi tenancy (including: token based tenant access control + all tenants scope): GET /{tenantid}/patient/', () => {
    beforeAll(async () => {
        server = await createServer(
            {
                enabled: true,
                tenantAccessTokenClaim: 'cognito:groups',
                tenantAccessTokenClaimValuePrefix: 'tenantprefix:',
                tenantAccessTokenAllTenantsScope: 'tenants/all',
            },
            resourceType,
        );
    });

    it(`Get: /${anyTenantId}/${resourceType} with all tenants scope it should always return 200.`, async done => {
        setPerRequestAccessTokenScopes(['tenants/all', 'openid', 'profile']);
        getResource(done, 200, `/${anyTenantId}/${resourceType}/${resourceId}`, resourceId, anyTenantId);
    });

    it(`Get: /${anyTenantId2}/${resourceType} with all tenants scope it should always return 200.`, async done => {
        setPerRequestAccessTokenScopes(['tenants/all', 'openid', 'profile']);
        getResource(done, 200, `/${anyTenantId2}/${resourceType}/${resourceId}`, resourceId, anyTenantId2);
    });

    it(`Get: /${anyTenantId3}/${resourceType} with all tenants scope it should always return 200.`, async done => {
        setPerRequestAccessTokenScopes(['tenants/all', 'openid', 'profile']);
        getResource(done, 200, `/${anyTenantId3}/${resourceType}/${resourceId}`, resourceId, anyTenantId3);
    });

    it(`Get: /${anyTenantId}/${resourceType} WITHOUT all tenants scope it should always return 401.`, async done => {
        getResource(
            done,
            401,
            `/${anyTenantId}/${resourceType}/${resourceId}`,
            resourceId,
            anyTenantId,
            `Unauthorized`,
        );
    });
});

// Test multi tenancy config error Wrong token claim was specified
describe('Routing with multi tenancy access token error case: Wrong token claim', () => {
    beforeAll(async () => {
        server = await createServer(
            {
                enabled: true,
                tenantUrlPart: 'tenant',
                tenantAccessTokenClaim: 'foobar',
                tenantAccessTokenClaimValuePrefix: 'tenantprefix:',
            },
            resourceType,
        );
    });

    it('For a specified tenant should return 401 if the wrong claim was specified', async done => {
        getResource(
            done,
            401,
            `/tenant/${specificTenantId}/${resourceType}/${resourceId}`,
            resourceId,
            specificTenantId,
            `Unauthorized wrong token claim`,
        );
    });
});

// Test multi tenancy config error. Wrong claim value prefix
describe('Routing with multi tenancy access token error case: Wrong claim value prefix', () => {
    beforeAll(async () => {
        server = await createServer(
            {
                enabled: true,
                tenantUrlPart: 'tenant',
                tenantAccessTokenClaim: 'cognito:groups',
                tenantAccessTokenClaimValuePrefix: 'wrongprefix:',
            },
            resourceType,
        );
    });

    it('For a specified tenant should return 401 if the wrong claim value prefix was specified', async done => {
        getResource(
            done,
            401,
            `/tenant/${specificTenantId}/${resourceType}/${resourceId}`,
            resourceId,
            specificTenantId,
            `Unauthorized`,
        );
    });
});

// Test multi tenancy config error. Wrong claim value prefix
describe('Routing with multi tenancy access token error case: Malformed base url', () => {
    beforeAll(async () => {
        server = await createServer(
            {
                enabled: true,
                tenantUrlPart: 'tenant',
                tenantAccessTokenClaim: 'cognito:groups',
                tenantAccessTokenClaimValuePrefix: 'tenantprefix:',
            },
            resourceType,
        );
    });
    it('Missing tenant type url', async done => {
        getResource(
            done,
            400,
            `/${specificTenantId}/${resourceType}/${resourceId}`,
            resourceId,
            specificTenantId,
            `Malformed based url: /${specificTenantId}/${resourceType}/${resourceId} for HTTP method: GET. Expecting /tenant/{tenantId}/resourceType/...`,
        );
    });
    it('Missing tenant type url missing tenant id', async done => {
        getResource(
            done,
            400,
            `/${resourceType}/${resourceId}`,
            resourceId,
            specificTenantId,
            `Malformed based url: /${resourceType}/${resourceId} for HTTP method: GET. Expecting /tenant/{tenantId}/resourceType/...`,
        );
    });
});

// Test multi tenancy config error. Wrong claim value prefix
describe('Routing with multi tenancy access token error case: Malformed base url', () => {
    beforeAll(async () => {
        server = await createServer(
            {
                enabled: true,
                tenantAccessTokenClaim: 'cognito:groups',
                tenantAccessTokenClaimValuePrefix: 'tenantprefix:',
            },
            resourceType,
        );
    });
    it('Missing tenant type url', async done => {
        getResource(
            done,
            400,
            `/tenant/${specificTenantId}/${resourceType}/${resourceId}`,
            resourceId,
            specificTenantId,
            `Malformed based url: /tenant/${specificTenantId}/${resourceType}/${resourceId} for HTTP method: GET. Expecting /{tenantId}/resourceType/...`,
        );
    });
    it('Missing tenant type url missing tenant id', async done => {
        getResource(
            done,
            400,
            `/${resourceType}/${resourceId}`,
            resourceId,
            specificTenantId,
            `Malformed based url: /${resourceType}/${resourceId} for HTTP method: GET. Expecting /{tenantId}/resourceType/...`,
        );
    });
});

// Test multi tenancy with restricting users to certain tenants, via access token
describe('Routing with multi tenancy (including: token based tenant access control): GET /{tenantid}/metadata', () => {
    beforeAll(async () => {
        server = await createServer(
            {
                enabled: true,
                tenantAccessTokenClaim: 'cognito:groups',
                tenantAccessTokenClaimValuePrefix: 'tenantprefix:',
            },
            resourceType,
        );
    });

    it(`Get: /metadata for Default tenant should return 200.`, async done => {
        getMetaData(done, 200, defaultTenantId);
    });

    it(`Get: /metadata for many tenant should return 200.`, async done => {
        getMetaData(done, 200, 'test12434');
    });
});
