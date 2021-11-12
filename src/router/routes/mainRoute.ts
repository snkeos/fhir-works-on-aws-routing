import express, { Router } from 'express';
import RouteHelper from './routeHelper';

export class MainRoute {
    mainRouter: express.Router;

    constructor(mainRouter: express.Router) {
        this.mainRouter = mainRouter;
    }

    use(forwardedUrl: string, childRouter: Router): MainRoute {
        this.mainRouter.use(forwardedUrl, childRouter);
        return this;
    }
}
