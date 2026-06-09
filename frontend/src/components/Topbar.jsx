import useAuth from '../hooks/useAuth';

export default function Topbar({ titulo }) {
  const { usuario } = useAuth();

  return (
    <header className="bg-white border-b border-gray-100 px-6 py-3 flex items-center justify-between sticky top-0 z-30">
      <div>
        <h2 className="text-lg font-semibold text-gray-800">{titulo}</h2>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center text-white text-sm font-bold shadow-sm">
            {usuario?.nombre?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-medium text-gray-700 leading-tight">{usuario?.nombre}</p>
            <p className="text-[10px] text-gray-400 uppercase tracking-wider leading-tight font-medium">{usuario?.rol}</p>
          </div>
        </div>
      </div>
    </header>
  );
}
