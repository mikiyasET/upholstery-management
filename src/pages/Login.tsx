import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import api from '../lib/api';
import { Label } from '../components/ui/label';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { toast } from 'sonner';
import { CarFront, ShieldCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function Login() {
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);
  const { t } = useTranslation();
  
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', { phone, password });
      login(data.user, data.accessToken, data.refreshToken);
      toast.success(t('auth.login.success', 'Logged in successfully'));
      navigate('/');
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || t('auth.login.failed', 'Login failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-background dark text-foreground selection:bg-primary/30">
      <div className="flex-1 hidden lg:flex relative">
        <div className="absolute inset-0 bg-gradient-to-r from-background/80 to-transparent z-10" />
        <img 
          src="/login-bg.png" 
          alt="Premium Car Interior" 
          className="object-cover w-full h-full opacity-60 mix-blend-luminosity"
        />
        <div className="absolute bottom-12 left-12 z-20 max-w-lg">
          <div className="inline-flex items-center justify-center p-3 bg-primary/20 backdrop-blur-md rounded-2xl mb-6 border border-primary/30 shadow-[0_0_30px_rgba(var(--primary),0.3)]">
            <CarFront className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-5xl font-bold tracking-tight mb-4 leading-tight">
            {t('auth.login.heroTitleStart', 'Elevate Your')} <span className="text-gradient">{t('auth.login.heroTitleHighlight', 'Automotive')}</span> {t('auth.login.heroTitleEnd', 'Experience')}
          </h1>
          <p className="text-lg text-muted-foreground font-light">
            {t('auth.login.heroSubtitle', 'The premier management system for high-end car decoration, detailing, and inventory tracking.')}
          </p>
        </div>
      </div>
      
      <div className="flex-1 flex flex-col justify-center items-center p-8 lg:p-16 relative overflow-hidden">
        <div className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] bg-primary/10 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[300px] h-[300px] bg-primary/20 blur-[100px] rounded-full pointer-events-none" />

        <div className="w-full max-w-md space-y-8 glass p-10 rounded-3xl relative z-10">
          <div className="text-center space-y-2">
            <div className="mx-auto w-16 h-16 bg-muted/50 rounded-2xl flex items-center justify-center mb-6 shadow-inner border border-white/5">
              <ShieldCheck className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-3xl font-semibold tracking-tight">{t('auth.login.welcomeBack', 'Welcome Back')}</h2>
            <p className="text-sm text-muted-foreground">{t('auth.login.signInToContinue', 'Sign in to your account to continue')}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6 mt-8">
            <div className="space-y-4">
              <div className="space-y-2 relative">
                <Label htmlFor="phone" className="text-xs uppercase tracking-wider text-muted-foreground ml-1">{t('auth.login.phoneNumber', 'Phone Number')}</Label>
                <Input 
                  id="phone" 
                  type="tel" 
                  placeholder={t('auth.login.phonePlaceholder', '0911234567')} 
                  className="h-12 bg-background/50 border-white/10 focus:border-primary/50 transition-colors"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2 relative">
                <div className="flex items-center justify-between ml-1">
                  <Label htmlFor="password" className="text-xs uppercase tracking-wider text-muted-foreground">{t('auth.login.password', 'Password')}</Label>
                  <a href="#" className="text-xs text-primary hover:text-primary/80 transition-colors">{t('auth.login.forgotPassword', 'Forgot?')}</a>
                </div>
                <Input 
                  id="password" 
                  type="password" 
                  placeholder="••••••••"
                  className="h-12 bg-background/50 border-white/10 focus:border-primary/50 transition-colors tracking-widest"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <Button 
              className="w-full h-12 text-md font-medium shadow-[0_0_20px_rgba(var(--primary),0.2)] hover:shadow-[0_0_25px_rgba(var(--primary),0.4)] transition-all duration-300" 
              type="submit" 
              disabled={loading}
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  {t('auth.login.signingIn', 'Signing in...')}
                </div>
              ) : (
                t('auth.login.signIn', 'Sign In')
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
