import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card';
import { authApi } from '@/lib/api';
import type { User } from '@/lib/api';
import { KeyRound, User as UserIcon, AlertCircle, Eye, EyeOff } from 'lucide-react';
import Logo from '@/components/Logo';
import { useTranslation } from '@/lib/translations';
interface LoginPageProps {
  onLoginSuccess: (user: User, rememberMe: boolean) => void;
}
export default function LoginPage({ onLoginSuccess }: LoginPageProps) {
  const { t } = useTranslation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [rememberMe, setRememberMe] = useState(() => {
    return localStorage.getItem('rememberMePreference') === 'true';
  });
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('Please fill in all fields.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const response = await authApi.login({
        username: username.trim(),
        password: password
      });
      onLoginSuccess(response.user, rememberMe);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="flex w-full h-full items-center justify-center px-4 bg-transparent">
      <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-primary/5 blur-[120px] pointer-events-none animate-pulse-glow" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-accent/5 blur-[120px] pointer-events-none" />
      <Card className="w-full max-w-[420px] glass-card border-border/60 shadow-xl animate-fade-in relative z-10 p-2">
        <CardHeader className="flex flex-col items-center text-center pb-4">
          <div className="flex justify-center mb-3 w-full">
            <Logo className="h-16 w-auto text-foreground" />
          </div>
          <CardDescription className="text-sm text-muted-foreground mt-1">
            {t('loginSubtitle')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs animate-fade-in mb-2">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="username">{t('username')}</Label>
              <div className="relative group">
                <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <Input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="user"
                  className="pl-9 bg-secondary/35 border-border/80 focus-visible:ring-primary/30"
                  disabled={loading}
                  autoFocus
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">{t('password')}</Label>
              <div className="relative group">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pl-9 pr-9 bg-secondary/35 border-border/80 focus-visible:ring-primary/30"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="flex items-center space-x-2 py-1 select-none">
              <input
                id="rememberMe"
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-4 w-4 rounded border-border/80 bg-secondary/35 text-primary focus:ring-primary/30 cursor-pointer accent-primary"
              />
              <Label htmlFor="rememberMe" className="text-xs text-muted-foreground cursor-pointer">
                Remember Me
              </Label>
            </div>
            <Button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg text-sm font-semibold tracking-wide transition-all shadow-lg hover:shadow-primary/10 cursor-pointer mt-2"
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin mr-2" />
                  ...
                </div>
              ) : (
                t('login')
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
