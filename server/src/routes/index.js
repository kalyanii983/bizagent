import { Router } from 'express';
import authRoutes from './auth.routes.js';
import customersRoutes from './customers.routes.js';
import emailsRoutes from './emails.routes.js';
import notificationsRoutes from './notifications.routes.js';
import dashboardRoutes from './dashboard.routes.js';
import crmRoutes from './crm.routes.js';
import meetingsRoutes from './meetings.routes.js';
import invoicesRoutes from './invoices.routes.js';
import reportsRoutes from './reports.routes.js';
import ticketsRoutes from './tickets.routes.js';
import workflowsRoutes from './workflows.routes.js';
import agentsRoutes from './agents.routes.js';
import usersRoutes from './users.routes.js';
import memoryRoutes from './memory.routes.js';
import staticRoutes from './static.routes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/customers', customersRoutes);
router.use('/emails', emailsRoutes);
router.use('/notifications', notificationsRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/crm', crmRoutes);
router.use('/meetings', meetingsRoutes);
router.use('/invoices', invoicesRoutes);
router.use('/reports', reportsRoutes);
router.use('/tickets', ticketsRoutes);
router.use('/workflows', workflowsRoutes);
router.use('/agents', agentsRoutes);
router.use('/users', usersRoutes);
router.use('/memory', memoryRoutes);
router.use('/', staticRoutes);

export default router;
