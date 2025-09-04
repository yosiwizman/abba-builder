import { createRoute } from '@tanstack/react-router';
import { rootRoute } from './root';
import MetricsPage from './metrics';

export const metricsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/metrics',
  component: MetricsPage,
});
