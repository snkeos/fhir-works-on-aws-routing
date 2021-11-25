/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */
const AWSXRay = require('aws-xray-sdk');

import { Validator } from 'fhir-works-on-aws-interface';
export async function validateResource(validators: Validator[], resource: any): Promise<void> {
    const subsegment = AWSXRay.getSegment();
    const newSubseg = subsegment.addNewSubsegment("validateResource");
    for (let i = 0; i < validators.length; i += 1) {
        // eslint-disable-next-line no-await-in-loop
        await validators[i].validate(resource);
    }
    newSubseg.close()
}
