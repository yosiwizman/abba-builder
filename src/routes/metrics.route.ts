import { createRoute } from '@tanstack/react-router';
import { rootRoute } from './root';

export const metricsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/metrics',
  component: () => import('./metrics').then(m => m.default),
});
