import { useState } from 'react';
import { ArrowLeft, LogIn, UserPlus, Eye, EyeOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { validateEmail, getEmailValidationMessage, validatePassword, buildPasswordErrorMessage, validateName, validatePhone, getPhoneValidationMessage } from '../utils/validation';
import { showToast } from '../utils/toast';
import { useNavigationHelpers } from '../hooks/useNavigationHelpers';


type ClientAuthPageProps = {
  initialMode?: 'login' | 'signup';
};

export function ClientAuthPage({ initialMode = 'login' }: ClientAuthPageProps) {
  const navigate = useNavigate();
  const { handleClientLogin, handleClientSignup } = useNavigationHelpers();
  const [mode, setMode] = useState<'login' | 'signup'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{[key: string]: string}>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setFieldErrors({});

    if (mode === 'signup') {
      const firstNameValidation = validateName(firstName);
      if (!firstNameValidation.isValid) {
        setFieldErrors({ firstName: firstNameValidation.error! });
        setError(firstNameValidation.error!);
        showToast(firstNameValidation.error!, 'error');
        return;
      }
      const lastNameValidation = validateName(lastName);
      if (!lastNameValidation.isValid) {
        setFieldErrors({ lastName: lastNameValidation.error! });
        setError(lastNameValidation.error!);
        showToast(lastNameValidation.error!, 'error');
        return;
      }
      if (!phone.trim()) {
        setFieldErrors({ phone: 'Le numéro de téléphone est requis' });
        setError('Le numéro de téléphone est requis');
        showToast('Le numéro de téléphone est requis', 'error');
        return;
      }
      if (!validatePhone(phone)) {
        setFieldErrors({ phone: getPhoneValidationMessage() });
        setError(getPhoneValidationMessage());
        showToast(getPhoneValidationMessage(), 'error');
        return;
      }
    }

    if (!validateEmail(email)) {
      setFieldErrors({ email: getEmailValidationMessage() });
      setError(getEmailValidationMessage());
      showToast(getEmailValidationMessage(), 'error');
      return;
    }

    if (mode === 'signup') {
      const passwordValidation = validatePassword(password);
      if (!passwordValidation.isValid) {
        const msg = passwordValidation.errors.join('. ');
        setFieldErrors({ password: msg });
        setError(msg);
        return;
      }
    } else if (!password) {
      setFieldErrors({ password: 'Mot de passe requis' });
      setError('Mot de passe requis');
      return;
    }

    if (mode === 'signup' && password !== confirmPassword) {
      setFieldErrors({ confirmPassword: 'Les mots de passe ne correspondent pas' });
      setError('Les mots de passe ne correspondent pas');
      return;
    }

    setLoading(true);

    try {
      if (mode === 'signup') {
        await handleClientSignup(email, password, false, {
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          phone: phone.trim(),
        });
      } else if (mode === 'login') {
        await handleClientLogin(email, password);
      }
    } catch (err: any) {
      let errorMessage = 'Erreur de connexion';

      if (err.message) {
        const msg = err.message.toLowerCase();

        if (msg.includes('user already registered') || msg.includes('already registered')) {
          errorMessage = 'Ce compte existe déjà. Veuillez vous connecter ou utiliser un autre email.';
          setFieldErrors({ email: errorMessage });
        } else if (msg.includes('invalid login credentials') || msg.includes('invalid credentials')) {
          errorMessage = mode === 'login'
            ? 'Email ou mot de passe incorrect'
            : 'Erreur lors de la création du compte';
          setFieldErrors({ password: errorMessage });
        } else if (msg.includes('email') && msg.includes('invalid')) {
          errorMessage = 'Format d\'email invalide';
          setFieldErrors({ email: errorMessage });
        } else if (msg.includes('password')) {
          errorMessage = 'Le mot de passe doit contenir au moins 6 caractères';
          setFieldErrors({ password: errorMessage });
        } else if (msg.includes('network') || msg.includes('fetch')) {
          errorMessage = 'Erreur de connexion. Vérifiez votre connexion internet.';
        } else {
          errorMessage = err.message;
        }
      }

      setError(errorMessage);
      showToast(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen relative"
      style={{
        backgroundImage: 'url(https://images.pexels.com/photos/4246120/pexels-photo-4246120.jpeg?auto=compress&cs=tinysrgb&w=1920)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <button
        onClick={() => navigate('/')}
        className="fixed top-4 left-4 z-50 hover:opacity-80 transition-opacity bg-white dark:bg-gray-800 rounded-lg shadow-lg p-2"
      >
        
      </button>
      <div className="absolute inset-0 bg-gradient-to-br from-blue-900/60 via-slate-900/55 to-cyan-900/60 pointer-events-none"></div>
      <div className="relative max-w-md mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <button
          onClick={() => navigate('/client/auth-choice')}
          className="flex items-center space-x-2 text-white hover:text-cyan-300 transition mb-6 backdrop-blur-sm bg-white/10 px-4 py-2 rounded-lg"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Retour</span>
        </button>

        <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-white/20">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              {mode === 'login' ? (
                <LogIn className="w-6 h-6 text-blue-600" />
              ) : (
                <UserPlus className="w-6 h-6 text-blue-600" />
              )}
            </div>
            <h2 className="text-2xl font-bold text-gray-900">
              {mode === 'login' ? 'Connexion Client' : 'Créer un compte'}
            </h2>
          </div>

          <p className="text-gray-600 mb-8">
            {mode === 'login'
              ? 'Connectez-vous pour suivre vos demandes de devis'
              : 'Créez un compte pour suivre vos demandes et recevoir des propositions'}
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            {mode === 'signup' && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Prénom <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={firstName}
                      onChange={(e) => {
                        setFirstName(e.target.value);
                        if (fieldErrors.firstName) setFieldErrors({ ...fieldErrors, firstName: '' });
                      }}
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:border-transparent ${
                        fieldErrors.firstName ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
                      }`}
                      placeholder="Votre prénom"
                      required
                    />
                    {fieldErrors.firstName && <p className="text-red-600 text-sm mt-1">{fieldErrors.firstName}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nom <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={lastName}
                      onChange={(e) => {
                        setLastName(e.target.value);
                        if (fieldErrors.lastName) setFieldErrors({ ...fieldErrors, lastName: '' });
                      }}
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:border-transparent ${
                        fieldErrors.lastName ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
                      }`}
                      placeholder="Votre nom"
                      required
                    />
                    {fieldErrors.lastName && <p className="text-red-600 text-sm mt-1">{fieldErrors.lastName}</p>}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Téléphone <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => {
                      setPhone(e.target.value);
                      if (fieldErrors.phone) setFieldErrors({ ...fieldErrors, phone: '' });
                    }}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:border-transparent ${
                      fieldErrors.phone ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
                    }`}
                    placeholder="06 12 34 56 78"
                    required
                  />
                  {fieldErrors.phone && <p className="text-red-600 text-sm mt-1">{fieldErrors.phone}</p>}
                </div>
              </>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (fieldErrors.email) setFieldErrors({ ...fieldErrors, email: '' });
                }}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:border-transparent ${
                  fieldErrors.email ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
                }`}
                placeholder="votre@email.com"
                required
              />
              {fieldErrors.email && <p className="text-red-600 text-sm mt-1">{fieldErrors.email}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mot de passe <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (fieldErrors.password) setFieldErrors({ ...fieldErrors, password: '' });
                  }}
                  className={`w-full px-4 py-3 pr-12 border rounded-lg focus:ring-2 focus:border-transparent ${
                    mode === 'signup' && password && buildPasswordErrorMessage(password)
                      ? 'border-red-500 focus:ring-red-500'
                      : 'border-gray-300 focus:ring-blue-500'
                  }`}
                  placeholder="••••••••"
                  required
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {mode === 'signup' && password
                ? buildPasswordErrorMessage(password) && (
                    <p className="text-red-500 text-xs mt-1">{buildPasswordErrorMessage(password)}</p>
                  )
                : mode === 'signup' && (
                    <p className="text-gray-500 text-xs mt-1">
                      Min. 8 caractères, 1 majuscule, 1 chiffre, 1 caractère spécial
                    </p>
                  )
              }
            </div>

            {mode === 'signup' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Confirmer le mot de passe <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      if (fieldErrors.confirmPassword) setFieldErrors({ ...fieldErrors, confirmPassword: '' });
                    }}
                    onBlur={() => {
                      if (confirmPassword && password !== confirmPassword) {
                        setFieldErrors(prev => ({ ...prev, confirmPassword: 'Les mots de passe ne correspondent pas' }));
                      }
                    }}
                    className={`w-full px-4 py-3 pr-12 border rounded-lg focus:ring-2 focus:border-transparent ${
                      fieldErrors.confirmPassword ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
                    }`}
                    placeholder="••••••••"
                    required
                    minLength={8}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition"
                  >
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {fieldErrors.confirmPassword && (
                  <p className="text-red-600 text-sm mt-1">{fieldErrors.confirmPassword}</p>
                )}
              </div>
            )}

            {error && (
              <div className="text-red-600 text-sm bg-red-50 p-3 rounded-lg">
                {error}
              </div>
            )}

            {mode === 'login' && (
              <div className="text-right">
                <a href="/forgot-password" className="text-sm text-blue-600 hover:underline">
                  Mot de passe oublié ?
                </a>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition font-semibold disabled:opacity-50"
            >
              {loading ? 'Chargement...' : mode === 'login' ? 'Se connecter' : 'Créer mon compte'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => {
                setMode(mode === 'login' ? 'signup' : 'login');
                setError('');
                setFieldErrors({});
              }}
              className="text-blue-600 hover:underline text-sm"
            >
              {mode === 'login'
                ? 'Pas encore de compte ? Créer un compte'
                : 'Déjà un compte ? Se connecter'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
