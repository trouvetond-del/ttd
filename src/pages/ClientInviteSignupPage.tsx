import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { User, Lock, CheckCircle, AlertCircle, EyeOff, Eye, Loader2, Phone, Mail, ArrowRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { showToast } from '../utils/toast';
import { validatePassword, validateName } from '../utils/validation';

interface ProspectData {
  id: string; email: string; firstname: string; lastname: string; phone: string;
  invitation_status: string; invitation_expires_at: string;
}

export default function ClientInviteSignupPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [prospect, setProspect] = useState<ProspectData | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState<'info' | 'password' | 'success'>('info');

  const [firstname, setFirstname] = useState('');
  const [lastname, setLastname] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => { if (token) fetchProspect(); }, [token]);

  const fetchProspect = async () => {
    try {
      const { data, error: fe } = await supabase
        .from('client_prospects')
        .select('*')
        .eq('invitation_token', token)
        .single();

      if (fe || !data) {
        setError("Lien d'invitation invalide ou expiré.");
        return;
      }

      if (data.invitation_status === 'signed_up') {
        setError('Vous êtes déjà inscrit ! Connectez-vous.');
        return;
      }

      if (data.invitation_expires_at && new Date(data.invitation_expires_at) < new Date()) {
        setError('Ce lien a expiré. Contactez-nous pour recevoir un nouveau lien.');
        return;
      }

      setProspect(data);
      setFirstname(data.firstname || '');
      setLastname(data.lastname || '');
      setPhone(data.phone || '');

      // Track click
      await supabase.from('client_prospects')
        .update({ invitation_clicked_at: new Date().toISOString() })
        .eq('id', data.id);
    } catch {
      setError('Erreur de chargement.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!prospect) return;
    if (!firstname.trim()) { showToast('Le prénom est requis', 'error'); setStep('info'); return; }
    if (!lastname.trim()) { showToast('Le nom est requis', 'error'); setStep('info'); return; }
    const fnV = validateName(firstname); if (!fnV.isValid) { showToast(fnV.error!, 'error'); setStep('info'); return; }
    const lnV = validateName(lastname); if (!lnV.isValid) { showToast(lnV.error!, 'error'); setStep('info'); return; }
    if (password.length < 8) { showToast('Mot de passe: min 8 caractères', 'error'); return; }
    const pwValidation = validatePassword(password);
    if (!pwValidation.isValid) { showToast(pwValidation.errors.join('\n'), 'error'); return; }
    if (password !== confirmPassword) { showToast('Mots de passe différents', 'error'); return; }

    setSubmitting(true);
    try {
      const sbUrl = import.meta.env.VITE_SUPABASE_URL;
      const sbKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      const cr = await fetch(`${sbUrl}/functions/v1/create-invited-client`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${sbKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: prospect.email,
          password,
          firstname: firstname.trim(),
          lastname: lastname.trim(),
          phone: phone.trim(),
          token,
        }),
      });

      const cRes = await cr.json();

      if (!cr.ok) {
        if (cRes.error === 'already_exists') {
          showToast('Ce compte existe déjà. Connectez-vous.', 'error');
          return;
        }
        if (cRes.error === 'expired') {
          showToast('Ce lien a expiré.', 'error');
          return;
        }
        throw new Error(cRes.error || cRes.message || 'Erreur création');
      }

      // Sign in immediately
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: prospect.email,
        password,
      });

      if (signInError) {
        console.error('Auto sign-in failed:', signInError);
        // Non-blocking — they can sign in manually
      }

      setStep('success');
      showToast('Inscription réussie !', 'success');
    } catch (err: any) {
      console.error(err);
      showToast(`Erreur: ${err.message}`, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mx-auto mb-3" />
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg max-w-md w-full p-8 text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-gray-900 mb-2">Invitation invalide</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <button onClick={() => navigate('/client/auth')} className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
            Se connecter
          </button>
        </div>
      </div>
    );
  }

  if (!prospect) return null;

  // Success state
  if (step === 'success') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg max-w-md w-full p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Bienvenue ! 🎉</h1>
          <p className="text-gray-600 mb-2">Votre compte a été créé avec succès.</p>
          <p className="text-gray-500 text-sm mb-6">Vous pouvez maintenant demander des devis pour votre déménagement.</p>
          <button
            onClick={() => navigate('/client/dashboard')}
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            Accéder à mon espace
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 py-8 px-4">
      <div className="max-w-lg mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Bienvenue{firstname ? ` ${firstname}` : ''} ! 🏠
          </h1>
          <p className="text-gray-600">Créez votre compte en quelques secondes</p>
        </div>

        {/* Steps indicator */}
        <div className="flex items-center justify-center gap-4 mb-8">
          <button
            onClick={() => step === 'password' && setStep('info')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium ${
              step === 'info' ? 'bg-indigo-600 text-white' : 'bg-green-100 text-green-700 cursor-pointer'
            }`}
          >
            {step === 'password' ? <CheckCircle className="w-4 h-4" /> : <User className="w-4 h-4" />}
            Informations
          </button>
          <div className={`w-8 h-0.5 ${step === 'password' ? 'bg-indigo-400' : 'bg-gray-300'}`} />
          <div className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium ${
            step === 'password' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-400'
          }`}>
            <Lock className="w-4 h-4" />
            Mot de passe
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 sm:p-8">
          {/* Step 1: Info */}
          {step === 'info' && (
            <div className="space-y-5">
              <div>
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-1">
                  <User className="w-5 h-5 text-indigo-600" /> Vérifiez vos informations
                </h2>
                <p className="text-sm text-gray-500">Vos données sont pré-remplies. Modifiez si besoin.</p>
              </div>

              {/* Email (read-only) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5" /> Email
                </label>
                <div className="px-3 py-2 bg-gray-100 border border-gray-200 rounded-lg text-sm text-gray-600">
                  {prospect.email}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Prénom <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={firstname}
                    onChange={(e) => setFirstname(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="Votre prénom"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nom <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={lastname}
                    onChange={(e) => setLastname(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="Votre nom"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5" /> Téléphone
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="06 12 34 56 78"
                />
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={() => {
                    if (!firstname.trim()) { showToast('Prénom requis', 'error'); return; }
                    if (!lastname.trim()) { showToast('Nom requis', 'error'); return; }
                    const fv = validateName(firstname); if (!fv.isValid) { showToast(fv.error!, 'error'); return; }
                    const lv = validateName(lastname); if (!lv.isValid) { showToast(lv.error!, 'error'); return; }
                    setStep('password');
                  }}
                  className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                >
                  Continuer <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Password */}
          {step === 'password' && (
            <div className="space-y-5">
              <div>
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-1">
                  <Lock className="w-5 h-5 text-indigo-600" /> Choisissez votre mot de passe
                </h2>
                <p className="text-sm text-gray-500">Pour sécuriser votre espace client.</p>
              </div>

              <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 text-sm text-indigo-800">
                <Mail className="w-4 h-4 inline mr-1" /> Email : <strong>{prospect.email}</strong>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mot de passe <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 pr-10"
                    placeholder="Min. 8 car., majuscule, chiffre, spécial"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {password && (() => { const v = validatePassword(password); return !v.isValid ? <div className="mt-1 space-y-0.5">{v.errors.map((e, i) => <p key={i} className="text-xs text-red-500">• {e}</p>)}</div> : <p className="text-xs text-green-500 mt-1">✓ Mot de passe valide</p>; })()}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Confirmer le mot de passe <span className="text-red-500">*</span>
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 ${
                    confirmPassword && confirmPassword !== password ? 'border-red-300' : 'border-gray-300'
                  }`}
                />
                {confirmPassword && confirmPassword !== password && (
                  <p className="text-xs text-red-500 mt-1">Les mots de passe ne correspondent pas</p>
                )}
              </div>

              <div className="flex justify-between pt-2">
                <button
                  onClick={() => setStep('info')}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
                >
                  Retour
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={submitting || !validatePassword(password).isValid || password !== confirmPassword}
                  className="flex items-center gap-2 px-6 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Inscription...</>
                  ) : (
                    <><CheckCircle className="w-4 h-4" /> Créer mon compte</>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}