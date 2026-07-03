import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';

import { AppLayout } from '@/layouts/AppLayout';
import { ProtectedRoute } from '@/layouts/ProtectedRoute';

const Alerts = lazy(() => import('@/pages/Alerts').then((module) => ({ default: module.Alerts })));
const Audit = lazy(() => import('@/pages/Audit').then((module) => ({ default: module.Audit })));
const Dashboard = lazy(() => import('@/pages/Dashboard').then((module) => ({ default: module.Dashboard })));
const Logistics = lazy(() => import('@/pages/Logistics').then((module) => ({ default: module.Logistics })));
const Login = lazy(() => import('@/pages/Login').then((module) => ({ default: module.Login })));
const NotFound = lazy(() => import('@/pages/NotFound').then((module) => ({ default: module.NotFound })));
const OrderDetails = lazy(() =>
  import('@/pages/OrderDetails').then((module) => ({ default: module.OrderDetails })),
);
const Orders = lazy(() => import('@/pages/Orders').then((module) => ({ default: module.Orders })));
const ProductDetails = lazy(() =>
  import('@/pages/ProductDetails').then((module) => ({ default: module.ProductDetails })),
);
const Products = lazy(() => import('@/pages/Products').then((module) => ({ default: module.Products })));
const Profile = lazy(() => import('@/pages/Profile').then((module) => ({ default: module.Profile })));
const Settings = lazy(() => import('@/pages/Settings').then((module) => ({ default: module.Settings })));
const Users = lazy(() => import('@/pages/Users').then((module) => ({ default: module.Users })));

const RouteLoader = () => (
  <div className="flex min-h-screen items-center justify-center bg-zinc-50 text-sm text-zinc-500 dark:bg-zinc-950 dark:text-zinc-400">
    Carregando tela
  </div>
);

export const App = () => (
  <Suspense fallback={<RouteLoader />}>
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/products" element={<Products />} />
          <Route path="/products/:id" element={<ProductDetails />} />
          <Route path="/alerts" element={<Alerts />} />
          <Route path="/orders" element={<Orders />} />
          <Route path="/orders/:id" element={<OrderDetails />} />
          <Route path="/logistics" element={<Logistics />} />
          <Route path="/audit" element={<Audit />} />
          <Route path="/users" element={<Users />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  </Suspense>
);
