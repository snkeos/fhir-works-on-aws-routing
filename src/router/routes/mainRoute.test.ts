import request from 'supertest';
// eslint-disable-next-line import/no-unresolved
import { Express } from 'express-serve-static-core';
import { createServer, createJSON } from '../__mocks__/mainRouteTestServer';

let server: Express;
const resourceType: string = 'Patient';
const resourceId: string = '12345';

// Test the non multi tenancy case in order to check that existing routing is not affected
describe('Regression: Routing with out multi tenancy: POST, PUT, PATCH, DELETE,GET /Patient', () => {
    beforeAll(async () => {
        server = await createServer(
            {
                enabled: false,
            },
            'Patient',
        );
    });

    it(`Post: /${resourceType} should return 201.`, async done => {
        request(server)
            .post(`/${resourceType}`)
            .expect(201)
            .end((err, res) => {
                if (err) return done(err);
                expect(res.body).toMatchObject(createJSON(resourceType, undefined, '9876'));
                return done();
            });
    });
    it(`Put: /${resourceType}  should return 200.`, async done => {
        request(server)
            .put(`/${resourceType}/${resourceId}`)
            .expect(200)
            .end((err, res) => {
                if (err) return done(err);
                expect(res.body).toMatchObject(createJSON(resourceType, undefined, resourceId));
                return done();
            });
    });

    it(`Patch: /${resourceType}  should return 200.`, async done => {
        request(server)
            .patch(`/${resourceType}/${resourceId}`)
            .expect(200)
            .end((err, res) => {
                if (err) return done(err);
                expect(res.body).toMatchObject(createJSON(resourceType, undefined, resourceId));
                return done();
            });
    });

    it(`Delete: /${resourceType}  should return 200.`, async done => {
        request(server)
            .delete(`/${resourceType}/${resourceId}`)
            .expect(200)
            .end((err, res) => {
                if (err) return done(err);
                expect(res.body).toMatchObject(createJSON(resourceType, undefined, resourceId));
                return done();
            });
    });

    it(`Get: /${resourceType} it should return 200.`, async done => {
        request(server)
            .get(`/${resourceType}`)
            .expect(200)
            .end((err, res) => {
                if (err) return done(err);
                expect(res.body).toMatchObject(createJSON(resourceType, undefined, undefined));
                return done();
            });
    });

    it(`Get: specified /${resourceType} id should return 200.`, async done => {
        request(server)
            .get(`/${resourceType}/${resourceId}`)
            .expect(200)
            .end((err, res) => {
                if (err) return done(err);
                expect(res.body).toMatchObject(createJSON(resourceType, undefined, resourceId));
                return done();
            });
    });
});

// The basic multi tenancy with out specified features
describe('Routing with multi tenancy (basic): POST, PUT, PATCH, DELETE, GET /{tenantid}/Patient/{id}', () => {
    beforeAll(async () => {
        server = await createServer(
            {
                enabled: true,
            },
            'Patient',
        );
    });

    it(`Get: /${resourceType} for a specified tenant it should always return 200.`, async done => {
        const tenantId: string = '1234567890';
        request(server)
            .get(`/${tenantId}/${resourceType}/${resourceId}`)
            .expect(200)
            .end((err, res) => {
                if (err) return done(err);
                expect(res.body).toMatchObject(createJSON(resourceType, tenantId, resourceId));
                return done();
            });
    });

    it(`Get: /${resourceType} Regression for the Default tenant it should always return 200.`, async done => {
        const tenantId: string = 'DEFAULT';
        request(server)
            .get(`/${tenantId}/${resourceType}/${resourceId}`)
            .expect(200)
            .end((err, res) => {
                if (err) return done(err);
                expect(res.body).toMatchObject(createJSON(resourceType, tenantId, resourceId));
                return done();
            });
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
            'Patient',
        );
    });

    it(`Post: /${resourceType} for Default tenant should return 201.`, async done => {
        const tenantId: string = 'DEFAULT';
        request(server)
            .post(`/${tenantId}/${resourceType}`)
            .expect(201)
            .end((err, res) => {
                if (err) return done(err);
                expect(res.body).toMatchObject(createJSON(resourceType, tenantId, '9876'));
                return done();
            });
    });
    it(`Put: /${resourceType} for Default tenant should return 200.`, async done => {
        const tenantId: string = 'DEFAULT';
        request(server)
            .put(`/${tenantId}/${resourceType}/${resourceId}`)
            .expect(200)
            .end((err, res) => {
                if (err) return done(err);
                expect(res.body).toMatchObject(createJSON(resourceType, tenantId, resourceId));
                return done();
            });
    });

    it(`Patch: /${resourceType} for Default tenant should return 200.`, async done => {
        const tenantId: string = 'DEFAULT';
        request(server)
            .patch(`/${tenantId}/${resourceType}/${resourceId}`)
            .expect(200)
            .end((err, res) => {
                if (err) return done(err);
                expect(res.body).toMatchObject(createJSON(resourceType, tenantId, resourceId));
                return done();
            });
    });

    it(`Delete: /${resourceType} for Default tenant should return 200.`, async done => {
        const tenantId: string = 'DEFAULT';
        request(server)
            .delete(`/${tenantId}/${resourceType}/${resourceId}`)
            .expect(200)
            .end((err, res) => {
                if (err) return done(err);
                expect(res.body).toMatchObject(createJSON(resourceType, tenantId, resourceId));
                return done();
            });
    });

    it(`Get: /${resourceType} for Default tenant should return 20.`, async done => {
        const tenantId: string = 'DEFAULT';
        request(server)
            .get(`/${tenantId}/${resourceType}/${resourceId}`)
            .expect(200)
            .end((err, res) => {
                if (err) return done(err);
                expect(res.body).toMatchObject(createJSON(resourceType, tenantId, resourceId));
                return done();
            });
    });

    it(`Get: /${resourceType} for a specified tenant should return 200.`, async done => {
        const tenantId: string = '915b76f7-8744-4010-bd31-a1e4c0d9fc64';
        request(server)
            .get(`/${tenantId}/${resourceType}/${resourceId}`)
            .expect(200)
            .end((err, res) => {
                if (err) return done(err);
                expect(res.body).toMatchObject(createJSON(resourceType, tenantId, resourceId));
                return done();
            });
    });
    it('type _history: For a specified tenant should return 200.', async done => {
        const tenantId: string = '915b76f7-8744-4010-bd31-a1e4c0d9fc64';
        request(server)
            .get(`/${tenantId}/${resourceType}/_history`)
            .expect(200)
            .end((err, res) => {
                if (err) return done(err);
                expect(res.body).toMatchObject(createJSON(resourceType, tenantId, undefined));
                return done();
            });
    });

    it('instance_history: For a specified tenant should return 200.', async done => {
        const tenantId: string = '915b76f7-8744-4010-bd31-a1e4c0d9fc64';
        request(server)
            .get(`/${tenantId}/${resourceType}/${resourceId}/_history`)
            .expect(200)
            .end((err, res) => {
                if (err) return done(err);
                expect(res.body).toMatchObject(createJSON(resourceType, tenantId, resourceId));
                return done();
            });
    });

    it('version_instance_history: For a specified tenant should return 200.', async done => {
        const tenantId: string = '915b76f7-8744-4010-bd31-a1e4c0d9fc64';
        request(server)
            .get(`/${tenantId}/${resourceType}/${resourceId}/_history/1`)
            .expect(200)
            .end((err, res) => {
                if (err) return done(err);
                expect(res.body).toMatchObject(createJSON(resourceType, tenantId, resourceId));
                return done();
            });
    });

    it(`Get: /${resourceType}/{id} for wrong tenant should return 401`, async done => {
        const tenantId: string = '1234567890';
        request(server)
            .get(`/${tenantId}/${resourceType}/${resourceId}`)
            .expect(401)
            .end((err, res) => {
                if (err) return done(err);
                expect(res.text).toContain(`Unauthorized`);
                return done();
            });
    });
});

// Test multi tenancy with restricting users to certain tenants, via access token and a configurable tenanttype url part in front of the tenant id.
describe('Routing with multi tenancy (including: tenant type url, token based tenant access control): POST, PUT, PATCH, DELETE,GET /tenant/{tenantid}/patient/', () => {
    beforeAll(async () => {
        server = await createServer(
            {
                enabled: true,
                tenantTypeUrlPart: 'tenant',
                tenantAccessTokenClaim: 'cognito:groups',
                tenantAccessTokenClaimValuePrefix: 'tenantprefix:',
            },
            'Patient',
        );
    });

    it(`Post: /${resourceType} for specified tenant should return 201.`, async done => {
        const tenantId: string = '915b76f7-8744-4010-bd31-a1e4c0d9fc64';
        request(server)
            .post(`/tenant/${tenantId}/${resourceType}`)
            .expect(201)
            .end((err, res) => {
                if (err) return done(err);
                expect(res.body).toMatchObject(createJSON(resourceType, tenantId, '9876'));
                return done();
            });
    });
    it(`Put: /${resourceType} for specified tenant should return 200.`, async done => {
        const tenantId: string = '915b76f7-8744-4010-bd31-a1e4c0d9fc64';
        request(server)
            .put(`/tenant/${tenantId}/${resourceType}/${resourceId}`)
            .expect(200)
            .end((err, res) => {
                if (err) return done(err);
                expect(res.body).toMatchObject(createJSON(resourceType, tenantId, resourceId));
                return done();
            });
    });

    it(`Patch: /${resourceType} for specified tenant should return 200.`, async done => {
        const tenantId: string = '915b76f7-8744-4010-bd31-a1e4c0d9fc64';
        request(server)
            .patch(`/tenant/${tenantId}/${resourceType}/${resourceId}`)
            .expect(200)
            .end((err, res) => {
                if (err) return done(err);
                expect(res.body).toMatchObject(createJSON(resourceType, tenantId, resourceId));
                return done();
            });
    });

    it(`Delete: /${resourceType} for specified tenant should return 200.`, async done => {
        const tenantId: string = 'DEFAULT';
        request(server)
            .delete(`/tenant/${tenantId}/${resourceType}/${resourceId}`)
            .expect(200)
            .end((err, res) => {
                if (err) return done(err);
                expect(res.body).toMatchObject(createJSON(resourceType, tenantId, resourceId));
                return done();
            });
    });

    it(`Get: /${resourceType} for DEFAULT tenant should return 200.`, async done => {
        const tenantId: string = 'DEFAULT';
        request(server)
            .get(`/tenant/${tenantId}/${resourceType}/${resourceId}`)
            .expect(200)
            .end((err, res) => {
                if (err) return done(err);
                expect(res.body).toMatchObject(createJSON(resourceType, tenantId, resourceId));
                return done();
            });
    });

    it(`Get: /${resourceType} for specified tenant should return 200.`, async done => {
        const tenantId: string = '915b76f7-8744-4010-bd31-a1e4c0d9fc64';
        request(server)
            .get(`/tenant/${tenantId}/${resourceType}/${resourceId}`)
            .expect(200)
            .end((err, res) => {
                if (err) return done(err);
                expect(res.body).toMatchObject(createJSON(resourceType, tenantId, resourceId));
                return done();
            });
    });

    it(`Get: /${resourceType}/_history for specified tenant  should return 200.`, async done => {
        const tenantId: string = '915b76f7-8744-4010-bd31-a1e4c0d9fc64';
        request(server)
            .get(`/tenant/${tenantId}/${resourceType}/_history`)
            .expect(200)
            .end((err, res) => {
                if (err) return done(err);
                expect(res.body).toMatchObject(createJSON(resourceType, tenantId, undefined));
                return done();
            });
    });

    it(`Get: /${resourceType}/{id}/_history for specified tenant  should return 200.`, async done => {
        const tenantId: string = '915b76f7-8744-4010-bd31-a1e4c0d9fc64';
        request(server)
            .get(`/tenant/${tenantId}/${resourceType}/${resourceId}/_history`)
            .expect(200)
            .end((err, res) => {
                if (err) return done(err);
                expect(res.body).toMatchObject(createJSON(resourceType, tenantId, resourceId));
                return done();
            });
    });

    it(`Get: /${resourceType}/{id}/_history/{vid} for specified tenant  should return 200.`, async done => {
        const tenantId: string = '915b76f7-8744-4010-bd31-a1e4c0d9fc64';
        request(server)
            .get(`/tenant/${tenantId}/${resourceType}/${resourceId}/_history/1`)
            .expect(200)
            .end((err, res) => {
                if (err) return done(err);
                expect(res.body).toMatchObject(createJSON(resourceType, tenantId, resourceId));
                return done();
            });
    });

    it(`Get: /${resourceType}/{id} for wrong tenant should return 401`, async done => {
        const tenantId: string = '1234567890';
        request(server)
            .get(`/tenant/${tenantId}/${resourceType}/${resourceId}`)
            .expect(401)
            .end((err, res) => {
                if (err) return done(err);
                expect(res.text).toContain(`Unauthorized`);
                return done();
            });
    });
});

// Test multi tenancy config error Wrong token claim was specified
describe('Routing with multi tenancy access token error case: Wrong token claim', () => {
    beforeAll(async () => {
        server = await createServer(
            {
                enabled: true,
                tenantTypeUrlPart: 'tenant',
                tenantAccessTokenClaim: 'foobar',
                tenantAccessTokenClaimValuePrefix: 'tenantprefix:',
            },
            'Patient',
        );
    });

    it('For a specified tenant should return 401 if the wrong claim was specified', async done => {
        const tenantId: string = '915b76f7-8744-4010-bd31-a1e4c0d9fc64';
        request(server)
            .get(`/tenant/${tenantId}/${resourceType}/${resourceId}`)
            .expect(401)
            .end((err, res) => {
                if (err) return done(err);
                expect(res.text).toContain(`Unauthorized wrong token claim`);
                return done();
            });
    });
});

// Test multi tenancy config error. Wrong claim value prefix
describe('Routing with multi tenancy access token error case: Wrong claim value prefix', () => {
    beforeAll(async () => {
        server = await createServer(
            {
                enabled: true,
                tenantTypeUrlPart: 'tenant',
                tenantAccessTokenClaim: 'cognito:groups',
                tenantAccessTokenClaimValuePrefix: 'wrongprefix:',
            },
            'Patient',
        );
    });

    it('For a specified tenant should return 401 if the wrong claim value prefix was specified', async done => {
        const tenantId: string = '915b76f7-8744-4010-bd31-a1e4c0d9fc64';
        request(server)
            .get(`/tenant/${tenantId}/${resourceType}/${resourceId}`)
            .expect(401)
            .end((err, res) => {
                if (err) return done(err);
                expect(res.text).toContain(`Unauthorized`);
                return done();
            });
    });
});

// Test multi tenancy config error. Wrong claim value prefix
describe('Routing with multi tenancy access token error case: Malformed base url', () => {
    beforeAll(async () => {
        server = await createServer(
            {
                enabled: true,
                tenantTypeUrlPart: 'tenant',
                tenantAccessTokenClaim: 'cognito:groups',
                tenantAccessTokenClaimValuePrefix: 'tenantprefix:',
            },
            'Patient',
        );
    });
    it('Missing tenant type url', async done => {
        const tenantId: string = '915b76f7-8744-4010-bd31-a1e4c0d9fc64';
        request(server)
            .get(`/${tenantId}/${resourceType}/${resourceId}`)
            .expect(400)
            .end((err, res) => {
                if (err) return done(err);
                expect(res.body.issue[0].diagnostics).toContain(
                    `Malformed based url: Expecting /tenant/{tenantId}/resourceType/...`,
                );
                return done();
            });
    });
    it('Missing tenant type url missing tenant id', async done => {
        request(server)
            .get(`/${resourceType}/${resourceId}`)
            .expect(400)
            .end((err, res) => {
                if (err) return done(err);
                expect(res.body.issue[0].diagnostics).toContain(
                    `Malformed based url: Expecting /tenant/{tenantId}/resourceType/...`,
                );
                return done();
            });
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
            'Patient',
        );
    });
    it('Missing tenant type url', async done => {
        const tenantId: string = '915b76f7-8744-4010-bd31-a1e4c0d9fc64';
        request(server)
            .get(`/tenant/${tenantId}/${resourceType}/${resourceId}`)
            .expect(400)
            .end((err, res) => {
                if (err) return done(err);
                expect(res.body.issue[0].diagnostics).toContain(
                    `Malformed based url: Expecting /{tenantId}/resourceType/...`,
                );
                return done();
            });
    });
    it('Missing tenant type url missing tenant id', async done => {
        request(server)
            .get(`/${resourceType}/${resourceId}`)
            .expect(400)
            .end((err, res) => {
                if (err) return done(err);
                expect(res.body.issue[0].diagnostics).toContain(
                    `Malformed based url: Expecting /{tenantId}/resourceType/...`,
                );
                return done();
            });
    });
});
