/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */
import { Validator } from 'fhir-works-on-aws-interface';
const AWSXRay = require('aws-xray-sdk');

export async function validateResource(validators: Validator[], resource: any): Promise<void> {
    const newSubseg = AWSXRay.getSegment().addNewSubsegment(`validateResource`);
    for (let i = 0; i < validators.length; i += 1) {
        // eslint-disable-next-line no-await-in-loop
        await validators[i].validate(resource);
    }
    newSubseg.close();
}
