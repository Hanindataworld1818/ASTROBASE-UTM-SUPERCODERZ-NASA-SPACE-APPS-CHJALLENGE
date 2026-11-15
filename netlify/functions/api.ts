import serverless from 'serverless-http';
import { createApiApp } from '../../server';

const app = createApiApp();
export const handler = serverless(app);

export const config = {
  path: '/api/*',
  rateLimit: {
    windowLimit: 40,
    windowSize: 60,
    aggregateBy: ['ip', 'domain'],
  },
};
