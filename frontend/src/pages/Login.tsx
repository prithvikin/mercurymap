import React, { useRef, useState } from 'react';
import { useAuth } from '../contexts/AuthContext.tsx';
import { Link, useNavigate } from 'react-router-dom';
import { Camera, LogIn, UserPlus } from 'lucide-react';
import toast from 'react-hot-toast';
import NavBar from '../components/NavBar.tsx';
import Card from '../components/ui/Card.tsx';
import Spinner from '../components/ui/Spinner.tsx';
import { button, focusRing } from '../components/ui/buttonStyles.ts';

const inputClasses =
  'block w-full px-3 py-2 border rounded-lg placeholder-sand-400 sm:text-sm ' +
  'focus:outline-none focus:ring-2 focus:ring-clay-500 focus:border-clay-500';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  // Field-level errors render next to the input that caused them; the toast
  // alone left the user hunting for which box was wrong.
  const [errors, setErrors] = useState<{ email?: string; password?: string; form?: string }>({});
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();

  const validate = () => {
    const next: { email?: string; password?: string } = {};
    if (!email.trim()) {
      next.email = 'Enter your email address.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      next.email = 'Enter a complete email address, like you@example.com.';
    }
    if (!password) {
      next.password = 'Enter your password.';
    } else if (isSignUp && password.length < 6) {
      next.password = 'Use at least 6 characters for your password.';
    }
    return next;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const fieldErrors = validate();
    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      // Focus the first field that failed so keyboard and screen-reader users
      // land on the problem instead of the top of the form.
      (fieldErrors.email ? emailRef : passwordRef).current?.focus();
      return;
    }

    setErrors({});
    setLoading(true);

    try {
      if (isSignUp) {
        await signUp(email, password);
        toast.success('Account created. Check your email to verify your account.');
      } else {
        await signIn(email, password);
        toast.success('Signed in successfully.');
        navigate('/app');
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'We could not sign you in. Check your email and password, then try again.';
      setErrors({ form: message });
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setIsSignUp((prev) => !prev);
    setErrors({});
  };

  return (
    <div className="min-h-screen bg-sand-50">
      <NavBar />

      <main id="main-content" className="flex flex-col justify-center py-16 px-4 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="flex justify-center">
            <div className="bg-clay-100 p-3 rounded-2xl">
              <Camera className="h-8 w-8 text-clay-600" aria-hidden="true" />
            </div>
          </div>
          <h1 className="mt-6 text-center text-2xl font-bold text-sand-900 text-balance">
            {isSignUp ? 'Create Your Account' : 'Sign In to Your Account'}
          </h1>
          <p className="mt-2 text-center text-sm text-sand-500">
            {isSignUp ? 'Already have an account?' : 'Don’t have an account?'}{' '}
            <button
              type="button"
              onClick={toggleMode}
              className={`rounded font-medium text-clay-600 hover:text-clay-700 hover:underline ${focusRing}`}
            >
              {isSignUp ? 'Sign In' : 'Sign Up'}
            </button>
          </p>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <Card className="p-6 sm:p-8">
            <form className="space-y-6" onSubmit={handleSubmit} noValidate>
              {errors.form && (
                <div
                  role="alert"
                  className="rounded-xl border border-berry-200 bg-berry-50 px-4 py-3 text-sm text-berry-700"
                >
                  {errors.form}
                </div>
              )}

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-sand-700">
                  Email Address
                </label>
                <div className="mt-1">
                  <input
                    ref={emailRef}
                    id="email"
                    name="email"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    required
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
                    }}
                    aria-invalid={Boolean(errors.email)}
                    aria-describedby={errors.email ? 'email-error' : undefined}
                    className={`${inputClasses} ${
                      errors.email ? 'border-berry-400' : 'border-sand-300'
                    }`}
                    placeholder="you@example.com"
                  />
                </div>
                {errors.email && (
                  <p id="email-error" className="mt-1.5 text-sm text-berry-600">
                    {errors.email}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-sand-700">
                  Password
                </label>
                <div className="mt-1">
                  <input
                    ref={passwordRef}
                    id="password"
                    name="password"
                    type="password"
                    autoComplete={isSignUp ? 'new-password' : 'current-password'}
                    spellCheck={false}
                    required
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
                    }}
                    aria-invalid={Boolean(errors.password)}
                    aria-describedby={
                      errors.password ? 'password-error' : isSignUp ? 'password-hint' : undefined
                    }
                    className={`${inputClasses} ${
                      errors.password ? 'border-berry-400' : 'border-sand-300'
                    }`}
                    placeholder={isSignUp ? 'At least 6 characters' : 'Enter your password'}
                  />
                </div>
                {errors.password ? (
                  <p id="password-error" className="mt-1.5 text-sm text-berry-600">
                    {errors.password}
                  </p>
                ) : (
                  isSignUp && (
                    <p id="password-hint" className="mt-1.5 text-xs text-sand-500">
                      Use at least 6 characters.
                    </p>
                  )
                )}
              </div>

              <div>
                {/* Stays enabled until the request actually starts -- an invalid
                    form should explain itself, not present a dead button. */}
                <button type="submit" disabled={loading} className={button('primary', 'lg', 'w-full')}>
                  {loading ? (
                    <>
                      <Spinner
                        label={isSignUp ? 'Creating your account…' : 'Signing you in…'}
                        className="h-4 w-4"
                      />
                      <span>{isSignUp ? 'Creating Account…' : 'Signing In…'}</span>
                    </>
                  ) : isSignUp ? (
                    <>
                      <UserPlus className="h-4 w-4" aria-hidden="true" />
                      <span>Create Account</span>
                    </>
                  ) : (
                    <>
                      <LogIn className="h-4 w-4" aria-hidden="true" />
                      <span>Sign In</span>
                    </>
                  )}
                </button>
              </div>
            </form>

            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                  <div className="w-full border-t border-sand-200" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-sand-500">Or</span>
                </div>
              </div>

              <div className="mt-6">
                <Link to="/" className={button('secondary', 'lg', 'w-full')}>
                  Continue Without Signing In
                </Link>
              </div>
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Login;
