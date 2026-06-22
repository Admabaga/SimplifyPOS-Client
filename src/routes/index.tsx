import { Routes, Route, Navigate } from 'react-router-dom'
import { Suspense, lazy } from 'react'
import ProtectedRoute from './ProtectedRoute'
import Layout from '@/shared/components/Layout'
import SubscriptionGate from '@/features/subscription/SubscriptionGate'
import { Spinner } from '@/shared/components/ui'

// Lazy imports
const LoginPage = lazy(() => import('@/features/auth/LoginPage'))
const PlansPage = lazy(() => import('@/features/subscription/PlansPage'))
const SignupPage = lazy(() => import('@/features/subscription/SignupPage'))
const SubscriptionPage = lazy(() => import('@/features/subscription/SubscriptionPage'))
const DashboardPage = lazy(() => import('@/features/reports/DashboardPage'))
const ProductsPage = lazy(() => import('@/features/products/ProductsPage'))
const CategoriesPage = lazy(() => import('@/features/categories/CategoriesPage'))
const SuppliersPage = lazy(() => import('@/features/suppliers/SuppliersPage'))
const InvoicesPage = lazy(() => import('@/features/invoices/InvoicesPage'))
const AccountsPage = lazy(() => import('@/features/accounts/AccountsPage'))
const AccountDetailPage = lazy(() => import('@/features/accounts/AccountDetailPage'))
const ExpensesPage = lazy(() => import('@/features/expenses/ExpensesPage'))
const ReportsPage = lazy(() => import('@/features/reports/ReportsPage'))
const PaymentMethodsPage = lazy(() => import('@/features/payment-methods/PaymentMethodsPage'))
const SalesPage = lazy(() => import('@/features/sales/SalesPage'))
const UsersPage = lazy(() => import('@/features/admin/users/UsersPage'))
const ProfilePage = lazy(() => import('@/features/auth/ProfilePage'))
const RolesPage = lazy(() => import('@/features/admin/roles/RolesPage'))
const AuditPage = lazy(() => import('@/features/admin/audit/AuditPage'))
const BillingPage = lazy(() => import('@/features/billing/BillingPage'))
const CajaPage  = lazy(() => import('@/features/caja/CajaPage'))
const NotificationsPage = lazy(() => import('@/features/notifications/NotificationsPage'))
const ClientesPage = lazy(() => import('@/features/clients/ClientesPage'))
const MasterPage = lazy(() => import('@/features/master/MasterPage'))
const MasterTodayPage = lazy(() => import('@/features/master/MasterTodayPage'))
const MasterAnalyticsPage = lazy(() => import('@/features/master/MasterAnalyticsPage'))
const MasterInfraPage = lazy(() => import('@/features/master/MasterInfraPage'))
const MasterAIPage = lazy(() => import('@/features/master/MasterAIPage'))
const MasterSubscriptionsPage = lazy(() => import('@/features/master/MasterSubscriptionsPage'))

function Loading() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-green-50">
      <Spinner size={32} />
    </div>
  )
}

function Forbidden() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen text-center">
      <p className="text-6xl font-bold text-green-200 mb-4">403</p>
      <p className="text-lg font-semibold text-gray-600">Sin permiso</p>
      <p className="text-sm text-gray-400 mt-1">No tienes acceso a esta sección.</p>
      <a href="/dashboard" className="mt-6 text-green-600 hover:underline text-sm">Volver al inicio</a>
    </div>
  )
}

export default function AppRoutes() {
  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        {/* Públicas */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/planes" element={<PlansPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/403" element={<Forbidden />} />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />

        {/* Protegidas — con layout sidebar + guard de suscripción */}
        <Route element={<ProtectedRoute />}>
          <Route element={<SubscriptionGate><Layout /></SubscriptionGate>}>
            <Route path="/dashboard" element={<DashboardPage />} />

            {/* Notificaciones */}
            <Route element={<ProtectedRoute permission="productos:read" />}>
              <Route path="/notifications" element={<NotificationsPage />} />
            </Route>

            {/* Inventario */}
            <Route element={<ProtectedRoute permission="productos:read" />}>
              <Route path="/products" element={<ProductsPage />} />
            </Route>
            <Route element={<ProtectedRoute permission="categorias:read" />}>
              <Route path="/categories" element={<CategoriesPage />} />
            </Route>
            <Route element={<ProtectedRoute permission="proveedores:read" />}>
              <Route path="/suppliers" element={<SuppliersPage />} />
            </Route>

            {/* Operaciones */}
            <Route element={<ProtectedRoute permission="ventas:read" />}>
              <Route path="/sales" element={<SalesPage />} />
            </Route>
            <Route element={<ProtectedRoute permission="facturas:read" />}>
              <Route path="/invoices" element={<InvoicesPage />} />
            </Route>
            <Route element={<ProtectedRoute permission="cuentas:read" />}>
              <Route path="/accounts" element={<AccountsPage />} />
              <Route path="/accounts/:id" element={<AccountDetailPage />} />
              <Route path="/clients" element={<ClientesPage />} />
              <Route path="/caja" element={<CajaPage />} />
            </Route>

            {/* Finanzas */}
            <Route element={<ProtectedRoute permission="gastos:read" />}>
              <Route path="/expenses" element={<ExpensesPage />} />
            </Route>
            <Route element={<ProtectedRoute permission="medios_pago:read" />}>
              <Route path="/payment-methods" element={<PaymentMethodsPage />} />
            </Route>
            <Route element={<ProtectedRoute permission="reportes:read" />}>
              <Route path="/reports" element={<ReportsPage />} />
            </Route>

              {/* Perfil */}
            <Route path="/profile" element={<ProfilePage />} />

            {/* Suscripción (admin) */}
            <Route element={<ProtectedRoute permission="suscripcion:read" />}>
              <Route path="/cuenta/suscripcion" element={<SubscriptionPage />} />
            </Route>

            {/* Admin — usuarios (admin + master) */}
            <Route path="/admin/users" element={<UsersPage />} />

            {/* Admin — master only */}
            <Route element={<ProtectedRoute permission="roles:manage" />}>
              <Route path="/admin/roles" element={<RolesPage />} />
            </Route>
            <Route element={<ProtectedRoute permission="audit:read" />}>
              <Route path="/admin/audit" element={<AuditPage />} />
            </Route>
            <Route element={<ProtectedRoute permission="facturacion:read" />}>
              <Route path="/admin/billing" element={<BillingPage />} />
            </Route>
            <Route element={<ProtectedRoute permission="users:manage" />}>
              <Route path="/master" element={<MasterPage />} />
              <Route path="/master/today" element={<MasterTodayPage />} />
              <Route path="/master/analytics" element={<MasterAnalyticsPage />} />
              <Route path="/master/infra" element={<MasterInfraPage />} />
              <Route path="/master/ai" element={<MasterAIPage />} />
              <Route path="/master/suscripciones" element={<MasterSubscriptionsPage />} />
            </Route>
          </Route>
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Suspense>
  )
}
