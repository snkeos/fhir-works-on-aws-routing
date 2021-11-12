import express, { Router } from 'express';
import RouteHelper from './routeHelper';

export class MainRouterDecorator {
    mainRouter: express.Router;

    constructor(mainRouter: express.Router) {
        this.mainRouter = mainRouter;
    }

    use(forwardedUrl: string, childRouter: Router): MainRouterDecorator {
        this.mainRouter.use(forwardedUrl, childRouter);
        return this;
    }
}
