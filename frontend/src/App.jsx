import { Routes, Route, Navigate } from 'react-router-dom';
import useAuth from './hooks/useAuth';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import POS from './pages/POS';
import Historial from './pages/Historial';
import Domicilios from './pages/Domicilios';
import Inventario from './pages/Inventario';
import Clientes from './pages/Clientes';
import CierreCaja from './pages/CierreCaja';
import Reportes from './pages/Reportes';
import Usuarios from './pages/Usuarios';
import Auditoria from './pages/Auditoria';
import Gastos from './pages/Gastos';
import Creditos from './pages/Creditos';
import Temporales from './pages/Temporales';
import NotasCreditoLista from './pages/NotasCreditoLista';

function RutaProtegida({ children, permiso }) {
  const { usuario, cargando, tienePermiso } = useAuth();

  if (cargando) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg">
        <div className="text-center">
          <div className="text-4xl mb-2">◆</div>
          <p className="text-gray-500">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!usuario) return <Navigate to="/login" replace />;

  if (permiso && !tienePermiso(permiso)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

function Layout({ children, titulo }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Topbar titulo={titulo} />
        <main className="flex-1 overflow-auto bg-bg animate-fade-in">
          {children}
        </main>
      </div>
    </div>
  );
}

const TITULOS = {
  '/dashboard': 'Dashboard',
  '/pos': 'Punto de venta (POS)',
  '/historial': 'Historial de facturas',
  '/domicilios': 'Domicilios',
  '/inventario': 'Inventario',
  '/clientes': 'Clientes',
  '/caja': 'Cierre de caja',
  '/reportes': 'Reportes',
  '/gastos': 'Gastos',
  '/creditos': 'Créditos y cartera',
  '/usuarios': 'Usuarios',
  '/auditoria': 'Auditoría',
  '/temporales': 'Facturas temporales',
  '/notas-credito': 'Notas Crédito',
};

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route path="/dashboard" element={
        <RutaProtegida permiso="ver_dashboard">
          <Layout titulo="Dashboard"><Dashboard /></Layout>
        </RutaProtegida>
      } />

      <Route path="/pos" element={
        <RutaProtegida permiso="crear_factura">
          <Layout titulo="Punto de venta (POS)"><POS /></Layout>
        </RutaProtegida>
      } />

      <Route path="/historial" element={
        <RutaProtegida permiso="ver_historial_todos">
          <Layout titulo="Historial"><Historial /></Layout>
        </RutaProtegida>
      } />

      <Route path="/domicilios" element={
        <RutaProtegida permiso="ver_domicilios">
          <Layout titulo="Domicilios"><Domicilios /></Layout>
        </RutaProtegida>
      } />

      <Route path="/inventario" element={
        <RutaProtegida permiso="ver_inventario">
          <Layout titulo="Inventario"><Inventario /></Layout>
        </RutaProtegida>
      } />

      <Route path="/clientes" element={
        <RutaProtegida permiso="ver_clientes">
          <Layout titulo="Clientes"><Clientes /></Layout>
        </RutaProtegida>
      } />

      <Route path="/caja" element={
        <RutaProtegida permiso="ver_caja">
          <Layout titulo="Cierre de caja"><CierreCaja /></Layout>
        </RutaProtegida>
      } />

      <Route path="/reportes" element={
        <RutaProtegida permiso="ver_reportes">
          <Layout titulo="Reportes"><Reportes /></Layout>
        </RutaProtegida>
      } />

      <Route path="/gastos" element={
        <RutaProtegida permiso="ver_gastos">
          <Layout titulo="Gastos"><Gastos /></Layout>
        </RutaProtegida>
      } />

      <Route path="/creditos" element={
        <RutaProtegida permiso="ver_creditos">
          <Layout titulo="Créditos"><Creditos /></Layout>
        </RutaProtegida>
      } />

      <Route path="/temporales" element={
        <RutaProtegida>
          <Layout titulo="Facturas temporales"><Temporales /></Layout>
        </RutaProtegida>
      } />

      <Route path="/notas-credito" element={
        <RutaProtegida>
          <Layout titulo="Notas Crédito"><NotasCreditoLista /></Layout>
        </RutaProtegida>
      } />

      <Route path="/usuarios" element={
        <RutaProtegida permiso="ver_usuarios">
          <Layout titulo="Usuarios"><Usuarios /></Layout>
        </RutaProtegida>
      } />

      <Route path="/auditoria" element={
        <RutaProtegida permiso="ver_auditoria">
          <Layout titulo="Auditoría"><Auditoria /></Layout>
        </RutaProtegida>
      } />

      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
