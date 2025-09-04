import { createRoute } from '@tanstack/react-router';
import { rootRoute } from './root';
import { lazy } from 'react';

const MetricsComponent = lazy(() => import('./metrics'));

export const metricsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/metrics',
  component: MetricsComponent,
});
