/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 *
 */

import { createHash } from 'crypto';

export const hash = (o: any): string => createHash('sha256').update(JSON.stringify(o)).digest('hex');

export function isLambdaEnv() {
    return (process.env.AWS_EXECUTION_ENV || '').startsWith('AWS_Lambda_');
}

let AWSXRay: any;

if (isLambdaEnv()) {
    AWSXRay = require('aws-xray-sdk');
}

export const openNewXRaySubSegment = (name: string): any => {
    if (isLambdaEnv()) {
        return AWSXRay.getSegment().addNewSubsegment(name);
    }
    return undefined;
};

export const closeXRaySubSegment = (segment: any): any => {
    if (segment) {
        segment.close();
    }
};
