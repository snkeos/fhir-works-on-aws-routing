/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';

export default class RouteHelper {
    static mergeParams: boolean = false;

    static extractResourceUrlFn: any = (httpMethod: string, url: string): string => {
        return url;
    };

    // Sets mergeParams flag for router creation
    static setMergeParams(mergeParams: boolean) {
        RouteHelper.mergeParams = mergeParams;
    }

    // Returns the router options for router creation
    static getRouterOptions(): express.RouterOptions {
        return { mergeParams: RouteHelper.mergeParams };
    }

    // Assigns an url modificatiion function, in order to carve out the resource url.
    static setExtractResourceUrlFunction(fn: any) {
        RouteHelper.extractResourceUrlFn = fn;
    }

    static extractResourceUrl(httpMethod: string, url: string): string {
        return RouteHelper.extractResourceUrlFn(httpMethod, url);
    }

    // https://thecodebarbarian.com/80-20-guide-to-express-error-handling
    static wrapAsync = (fn: any) => {
        // eslint-disable-next-line func-names
        return function(req: express.Request, res: express.Response, next: express.NextFunction) {
            // Make sure to `.catch()` any errors and pass them along to the `next()`
            // middleware in the chain, in this case the error handler.
            fn(req, res, next).catch(next);
        };
    };
}
