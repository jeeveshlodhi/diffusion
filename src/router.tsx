// src/router.tsx
import { createRootRoute,  createRouter } from '@tanstack/react-router';
import Dashboard from './components/screens/Dashboard';


// const withSuspense = (Component: React.ComponentType) => () =>
//   (
//     <Suspense fallback={<div>Loading...</div>}>
//       <Component />
//     </Suspense>
//   );

const rootRoute = createRootRoute({
    component: () => <Dashboard />,
});

// const homeRoute = createRoute({
//   getParentRoute: () => rootRoute,
//   path: '/',
//   component: withSuspense(Home),
// });

// const aboutRoute = createRoute({
//   getParentRoute: () => rootRoute,
//   path: '/about',
//   component: withSuspense(About),
// });

// const contactRoute = createRoute({
//   getParentRoute: () => rootRoute,
//   path: '/contact',
//   component: withSuspense(Contact),
// });

const routeTree = rootRoute.addChildren([
    // homeRoute,
    // aboutRoute,
    // contactRoute,
]);

export const router = createRouter({ routeTree });
