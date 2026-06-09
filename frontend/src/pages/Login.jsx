import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, CircleX, Loader } from 'lucide-react';
import useAuth from '../hooks/useAuth';

export default function Login() {
  const [usuario, setUsuario] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [verContrasena, setVerContrasena] = useState(false);
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!usuario || !contrasena) {
      setError('Usuario y contraseña son requeridos');
      return;
    }
    setError('');
    setCargando(true);
    try {
      const user = await login(usuario, contrasena);
      if (user.rol === 'cajero' || user.rol === 'domicilios') {
        navigate('/pos');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Error al iniciar sesión');
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sidebar via-sidebar to-blue-900 px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl p-8">
        <div className="text-center mb-7">
          <div className="w-14 h-14 bg-blue rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue/30">
            <span className="text-white text-2xl font-bold">T</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-800">tiksa</h1>
          <p className="text-gray-400 text-sm mt-0.5">Tu negocio, en control</p>
        </div>

        {error && (
          <div className="flex items-center gap-2 bg-red/5 border border-red/20 text-red text-sm p-3 rounded-xl mb-5">
            <CircleX size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1.5">
              Usuario
            </label>
            <input
              type="text"
              value={usuario}
              onChange={(e) => setUsuario(e.target.value)}
              className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-xl focus:bg-white focus:border-blue focus:outline-none text-sm transition-all"
              placeholder="Ingresa tu usuario"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1.5">
              Contraseña
            </label>
            <div className="relative">
              <input
                type={verContrasena ? 'text' : 'password'}
                value={contrasena}
                onChange={(e) => setContrasena(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-xl focus:bg-white focus:border-blue focus:outline-none text-sm transition-all pr-12"
                placeholder="Ingresa tu contraseña"
              />
              <button
                type="button"
                onClick={() => setVerContrasena(!verContrasena)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors p-1"
                tabIndex={-1}
              >
                {verContrasena ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={cargando}
            className="w-full py-3 bg-blue hover:bg-blue-800 text-white font-semibold rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-blue/30 hover:shadow-blue/40"
          >
            {cargando ? (
              <Loader size={20} className="animate-spin" />
            ) : (
              'Ingresar'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
