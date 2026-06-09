import { NavLink } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import useAuth from '../hooks/useAuth';

const SECTIONS = [
  { label: 'Principal', items: ['Dashboard', 'POS'] },
  { label: 'Ventas', items: ['Historial', 'Domicilios', 'Temporales', 'Notas Crédito'] },
  { label: 'Inventario', items: ['Inventario', 'Clientes'] },
  { label: 'Finanzas', items: ['Cierre Caja', 'Reportes', 'Gastos', 'Créditos'] },
  { label: 'Admin', items: ['Usuarios', 'Auditoría'] },
];

export default function Sidebar() {
  const { usuario, getMenus, logout } = useAuth();
  const menus = getMenus();

  return (
    <aside className="w-64 bg-sidebar min-h-screen flex flex-col">
      <div className="p-6 pb-4">
        <h1 className="text-white text-xl font-bold flex items-center gap-2.5">
          <span className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white text-sm font-bold">T</span>
          tiksa
        </h1>
      </div>

      <nav className="flex-1 px-3 overflow-y-auto space-y-5">
        {SECTIONS.map((section) => {
          const visible = section.items
            .map(label => menus.find(m => m.label === label))
            .filter(Boolean);
          if (visible.length === 0) return null;

          return (
            <div key={section.label}>
              <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-widest text-gray-500">
                {section.label}
              </p>
              <div className="space-y-0.5">
                {visible.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-150 ${
                        isActive
                          ? 'bg-primary/15 text-primary font-medium shadow-sm'
                          : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'
                      }`
                    }
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </NavLink>
                ))}
              </div>
            </div>
          );
        })}
      </nav>

      <div className="p-3 mt-auto">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-white/5 mb-1">
          <div className="w-8 h-8 rounded-full bg-primary/30 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
            {usuario?.nombre?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{usuario?.nombre}</p>
            <p className="text-[10px] text-gray-500 uppercase tracking-wide">{usuario?.rol}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-3 text-gray-500 hover:text-gray-300 text-sm w-full px-3 py-2 rounded-lg hover:bg-white/5 transition-colors"
        >
          <LogOut size={16} />
          <span>Cerrar sesión</span>
        </button>
      </div>
    </aside>
  );
}
