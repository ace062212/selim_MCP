import { Suspense, lazy } from 'react'
import App from './App.tsx'

// /admin 으로 들어오면 관리자 페이지 (사용자 페이지에서는 불러오지 않음)
const AdminApp = lazy(() => import('./admin/AdminApp.tsx'))
const isAdmin = window.location.pathname.replace(/\/+$/, '') === '/admin'

export default function Root() {
  return isAdmin ? (
    <Suspense fallback={null}>
      <AdminApp />
    </Suspense>
  ) : (
    <App />
  )
}
