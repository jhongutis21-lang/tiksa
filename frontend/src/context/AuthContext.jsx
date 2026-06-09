import { createContext, useState, useEffect, useCallback } from 'react';
import { LayoutDashboard, ShoppingCart, ClipboardList, Truck, Package, Users, DollarSign, BarChart3, Shield, ScrollText, Receipt, CreditCard, FileText, RotateCcw } from 'lucide-react';
import api from '../services/api';

const SI = 18;
const S = { Dashboard: <LayoutDashboard size={SI} />, POS: <ShoppingCart size={SI} />, Historial: <ClipboardList size={SI} />, Domicilios: <Truck size={SI} />, Inventario: <Package size={SI} />, Clientes: <Users size={SI} />, 'Cierre Caja': <DollarSign size={SI} />, Reportes: <BarChart3 size={SI} />, Usuarios: <Shield size={SI} />, Auditoria: <ScrollText size={SI} />, Gastos: <Receipt size={SI} />, Creditos: <CreditCard size={SI} />, Temporales: <FileText size={SI} />, 'Notas Credito': <RotateCcw size={SI} /> };

export const AuthContext = createContext(null);

const MENUS = {
  admin: [
    { label: 'Dashboard', path: '/dashboard', icon: S.Dashboard, permiso: 'ver_dashboard' },
    { label: 'POS', path: '/pos', icon: S.POS, permiso: 'crear_factura' },
    { label: 'Temporales', path: '/temporales', icon: S.Temporales },
    { label: 'Notas Crédito', path: '/notas-credito', icon: S['Notas Credito'] },
    { label: 'Historial', path: '/historial', icon: S.Historial, permiso: 'ver_historial_todos' },
    { label: 'Domicilios', path: '/domicilios', icon: S.Domicilios, permiso: 'ver_domicilios' },
    { label: 'Inventario', path: '/inventario', icon: S.Inventario, permiso: 'ver_inventario' },
    { label: 'Clientes', path: '/clientes', icon: S.Clientes, permiso: 'ver_clientes' },
    { label: 'Cierre Caja', path: '/caja', icon: S['Cierre Caja'], permiso: 'ver_caja' },
    { label: 'Reportes', path: '/reportes', icon: S.Reportes, permiso: 'ver_reportes' },
    { label: 'Gastos', path: '/gastos', icon: S.Gastos, permiso: 'ver_gastos' },
    { label: 'Créditos', path: '/creditos', icon: S.Creditos, permiso: 'ver_creditos' },
    { label: 'Usuarios', path: '/usuarios', icon: S.Usuarios, permiso: 'ver_usuarios' },
    { label: 'Auditoría', path: '/auditoria', icon: S.Auditoria, permiso: 'ver_auditoria' },
  ],
  encargado: [
    { label: 'Dashboard', path: '/dashboard', icon: S.Dashboard, permiso: 'ver_dashboard' },
    { label: 'POS', path: '/pos', icon: S.POS, permiso: 'crear_factura' },
    { label: 'Temporales', path: '/temporales', icon: S.Temporales },
    { label: 'Notas Crédito', path: '/notas-credito', icon: S['Notas Credito'] },
    { label: 'Historial', path: '/historial', icon: S.Historial, permiso: 'ver_historial_todos' },
    { label: 'Domicilios', path: '/domicilios', icon: S.Domicilios, permiso: 'ver_domicilios' },
    { label: 'Inventario', path: '/inventario', icon: S.Inventario, permiso: 'ver_inventario' },
    { label: 'Clientes', path: '/clientes', icon: S.Clientes, permiso: 'ver_clientes' },
    { label: 'Reportes', path: '/reportes', icon: S.Reportes, permiso: 'ver_reportes' },
    { label: 'Gastos', path: '/gastos', icon: S.Gastos, permiso: 'ver_gastos' },
    { label: 'Créditos', path: '/creditos', icon: S.Creditos, permiso: 'ver_creditos' },
  ],
  cajero: [
    { label: 'POS', path: '/pos', icon: S.POS, permiso: 'crear_factura' },
    { label: 'Temporales', path: '/temporales', icon: S.Temporales },
    { label: 'Notas Crédito', path: '/notas-credito', icon: S['Notas Credito'] },
    { label: 'Historial', path: '/historial', icon: S.Historial, permiso: 'ver_historial_propio' },
  ],
  domicilios: [
    { label: 'POS', path: '/pos', icon: S.POS, permiso: 'crear_factura' },
    { label: 'Temporales', path: '/temporales', icon: S.Temporales },
    { label: 'Notas Crédito', path: '/notas-credito', icon: S['Notas Credito'] },
    { label: 'Historial', path: '/historial', icon: S.Historial, permiso: 'ver_historial_propio' },
    { label: 'Domicilios', path: '/domicilios', icon: S.Domicilios, permiso: 'ver_domicilios' },
  ],
};

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [token, setToken] = useState(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const savedToken = localStorage.getItem('tiksa_token');
    const savedUser = localStorage.getItem('tiksa_usuario');
    if (savedToken && savedUser) {
      setToken(savedToken);
      try {
        setUsuario(JSON.parse(savedUser));
      } catch (e) {
        localStorage.removeItem('tiksa_usuario');
        localStorage.removeItem('tiksa_token');
      }
    }
    setCargando(false);
  }, []);

  const login = useCallback(async (usuario, contrasena) => {
    const res = await api.post('/auth/login', { usuario, contrasena });
    const { token: newToken, usuario: user } = res.data;
    localStorage.setItem('tiksa_token', newToken);
    localStorage.setItem('tiksa_usuario', JSON.stringify(user));
    setToken(newToken);
    setUsuario(user);
    return user;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('tiksa_token');
    localStorage.removeItem('tiksa_usuario');
    setToken(null);
    setUsuario(null);
  }, []);

  const getMenus = useCallback(() => {
    if (!usuario) return [];
    return MENUS[usuario.rol] || [];
  }, [usuario]);

  const tienePermiso = useCallback((permiso) => {
    if (!usuario) return false;
    const PERMISOS = {
      admin: ['ver_dashboard','crear_factura','ver_historial_todos','editar_factura_pos','anular_factura','eliminar_factura','ver_inventario','editar_inventario','ajustar_stock','ver_clientes','editar_clientes','ver_caja','cerrar_caja','abrir_caja','registrar_movimiento','ver_reportes','resolver_alertas','ver_domicilios','actualizar_domicilio','ver_usuarios','crear_usuario','editar_usuario','ver_auditoria','ver_gastos','editar_gastos','ver_creditos','crear_credito','registrar_abono'],
      encargado: ['ver_dashboard','crear_factura','ver_historial_todos','editar_factura_pos','anular_factura','ver_inventario','ajustar_stock','ver_clientes','editar_clientes','ver_reportes','resolver_alertas','ver_domicilios','actualizar_domicilio','abrir_caja','registrar_movimiento','ver_gastos','ver_creditos','registrar_abono'],
      cajero: ['crear_factura','ver_historial_propio','registrar_movimiento'],
      domicilios: ['crear_factura','ver_historial_propio','ver_domicilios','actualizar_domicilio'],
    };
    return PERMISOS[usuario.rol]?.includes(permiso) || false;
  }, [usuario]);

  return (
    <AuthContext.Provider value={{ usuario, token, cargando, login, logout, getMenus, tienePermiso }}>
      {children}
    </AuthContext.Provider>
  );
}
