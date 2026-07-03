import { Router } from 'express';

import { alertsController } from '../controllers/alerts.controller.js';
import { auditController } from '../controllers/audit.controller.js';
import { dashboardController } from '../controllers/dashboard.controller.js';
import { healthController } from '../controllers/health.controller.js';
import { logisticsController } from '../controllers/logistics.controller.js';
import { ordersController } from '../controllers/orders.controller.js';
import { preferencesController } from '../controllers/preferences.controller.js';
import { productsController } from '../controllers/products.controller.js';
import { syncController } from '../controllers/sync.controller.js';
import { usersController } from '../controllers/users.controller.js';
import { authenticate } from '../middlewares/auth.js';
import { authorize } from '../middlewares/authorize.js';

export const apiRouter = Router();

apiRouter.get('/health', healthController.show);

const protectedRouter = Router();
protectedRouter.use(authenticate);

protectedRouter.get('/dashboard', dashboardController.overview);
protectedRouter.get('/products', productsController.index);
protectedRouter.get('/products/:id', productsController.show);
protectedRouter.patch('/products/:id/internal', authorize('admin', 'manager'), productsController.updateInternal);
protectedRouter.get('/orders', ordersController.index);
protectedRouter.get('/orders/:id', ordersController.show);
protectedRouter.get('/alerts', alertsController.index);
protectedRouter.patch('/alerts/:id', alertsController.update);
protectedRouter.get('/logistics', logisticsController.index);
protectedRouter.get('/audits', authorize('admin', 'manager'), auditController.index);
protectedRouter.post('/sync/products', authorize('owner', 'admin', 'manager'), syncController.products);
protectedRouter.get('/users', authorize('owner'), usersController.index);
protectedRouter.post('/users', authorize('owner'), usersController.create);
protectedRouter.patch('/users/:id', authorize('owner'), usersController.update);
protectedRouter.get('/preferences', preferencesController.show);
protectedRouter.patch('/preferences', preferencesController.update);

apiRouter.use(protectedRouter);
