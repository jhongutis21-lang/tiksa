import useAuth from '../hooks/useAuth';

export default function Topbar({ titulo }) {
  const { usuario } = useAuth();

  return (
    <header className="bg-white border-b border-border px-6 py-3 flex items-center justify-between">
      <div>
        <h2 className="text-lg font-semibold text-gray-800">{titulo}</h2>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-blue/10 flex items-center justify-center text-blue text-sm font-bold">
            {usuario?.nombre?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-medium text-gray-700 leading-tight">{usuario?.nombre}</p>
            <p className="text-[10px] text-gray-400 uppercase tracking-wide leading-tight">{usuario?.rol}</p>
          </div>
        </div>
      </div>
    </header>
  );
}
