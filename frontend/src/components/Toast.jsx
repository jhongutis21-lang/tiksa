import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

const CONFIG = {
  success: { bar: 'bg-green' },
  error: { bar: 'bg-red' },
  warning: { bar: 'bg-yellow' },
  info: { bar: 'bg-blue' },
};

export default function Toast({ mensaje, tipo = 'info', duracion = 5000, onClose, accion }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      onClose?.();
    }, duracion);
    return () => clearTimeout(timer);
  }, [duracion, onClose]);

  if (!visible) return null;

  const cfg = CONFIG[tipo] || CONFIG.info;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex items-start bg-white border border-border rounded-xl shadow-xl text-sm min-w-[300px] max-w-md overflow-hidden animate-slide-up">
      <div className={`w-1 self-stretch shrink-0 ${cfg.bar}`} />
      <div className="flex items-center justify-between gap-3 py-3 pl-3 pr-3 w-full">
        <span className="text-gray-700">{mensaje}</span>
        <div className="flex items-center gap-2 shrink-0">
          {accion && (
            <button
              onClick={() => { accion.onClick(); setVisible(false); onClose?.(); }}
              className="text-xs font-semibold text-blue hover:text-blue/80 transition-colors"
            >
              {accion.label}
            </button>
          )}
          <button
            onClick={() => { setVisible(false); onClose?.(); }}
            className="text-gray-300 hover:text-gray-500 transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
