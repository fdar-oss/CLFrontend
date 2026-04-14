'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { authApi } from '@/lib/api/auth.api';
import { useAuthStore } from '@/lib/stores/auth.store';
import { Eye, EyeOff } from 'lucide-react';
import Image from 'next/image';

const schema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});
type FormData = z.infer<typeof schema>;

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get('from') || '/admin/dashboard';
  const { setAuth } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  async function onSubmit(data: FormData) {
    try {
      const res = await authApi.login(data.email, data.password);
      setAuth(res.user, res.accessToken);
      toast.success(`Welcome back, ${res.user.fullName.split(' ')[0]}!`);
      router.replace(from);
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Login failed. Check your credentials.';
      toast.error(message);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div>
        <label className="block text-sm font-medium text-charcoal-300 mb-1.5">
          Email address
        </label>
        <input
          {...register('email')}
          type="email"
          autoComplete="email"
          placeholder="you@coffeelab.pk"
          className="w-full px-4 py-3 rounded-xl bg-charcoal-700 border border-charcoal-600 text-white placeholder:text-charcoal-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition text-sm"
        />
        {errors.email && (
          <p className="mt-1.5 text-xs text-red-400">{errors.email.message}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-charcoal-300 mb-1.5">
          Password
        </label>
        <div className="relative">
          <input
            {...register('password')}
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            placeholder="••••••••"
            className="w-full px-4 py-3 rounded-xl bg-charcoal-700 border border-charcoal-600 text-white placeholder:text-charcoal-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition text-sm pr-10"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-charcoal-400 hover:text-white transition-colors"
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        {errors.password && (
          <p className="mt-1.5 text-xs text-red-400">{errors.password.message}</p>
        )}
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full py-3 px-4 bg-brand-500 hover:bg-brand-400 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all text-sm tracking-wide shadow-lg shadow-brand-500/20 active:scale-[0.98]"
      >
        {isSubmitting ? 'Signing in…' : 'Sign In'}
      </button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-charcoal-950 flex">
      {/* Left branding panel */}
      <div className="hidden lg:flex lg:w-[45%] bg-charcoal-900 flex-col items-center justify-center p-16 relative overflow-hidden border-r border-charcoal-800">
        {/* Ambient glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-brand-500/8 rounded-full blur-3xl pointer-events-none" />
        {/* Decorative circles */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-[520px] h-[520px] rounded-full border border-charcoal-700/60" />
        </div>
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-[360px] h-[360px] rounded-full border border-charcoal-700/40" />
        </div>

        <div className="relative z-10 flex flex-col items-center text-center">
          <div className="w-44 h-44 rounded-full overflow-hidden ring-2 ring-brand-500/40 shadow-2xl shadow-brand-500/10 mb-7">
            <Image
              src="/logo.jpeg"
              alt="The Coffee Lab"
              width={176}
              height={176}
              className="object-cover w-full h-full"
            />
          </div>
          <h1 className="text-3xl font-bold text-white mb-1 tracking-tight">The Coffee Lab</h1>
          <p className="text-charcoal-400 text-base">Management Platform</p>

          <div className="mt-10 grid grid-cols-3 gap-3">
            {[
              { label: 'POS', desc: 'Fast checkout' },
              { label: 'ERP', desc: 'Full operations' },
              { label: 'Analytics', desc: 'Live insights' },
            ].map((f) => (
              <div key={f.label} className="bg-charcoal-800/80 rounded-xl px-3 py-3 border border-charcoal-700/80 text-center">
                <p className="text-brand-400 font-semibold text-sm">{f.label}</p>
                <p className="text-charcoal-500 text-xs mt-0.5">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="absolute bottom-6 text-charcoal-600 text-xs">
          &copy; {new Date().getFullYear()} The Coffee Lab
        </p>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 lg:p-12">
        {/* Mobile logo */}
        <div className="lg:hidden flex flex-col items-center mb-8">
          <div className="w-20 h-20 rounded-full overflow-hidden ring-2 ring-brand-500/40 mb-3">
            <Image src="/logo.jpeg" alt="The Coffee Lab" width={80} height={80} className="object-cover w-full h-full" />
          </div>
          <h1 className="text-xl font-bold text-white">The Coffee Lab</h1>
        </div>

        <div className="w-full max-w-[360px]">
          <div className="mb-7">
            <h2 className="text-2xl font-bold text-white">Welcome back</h2>
            <p className="text-charcoal-400 text-sm mt-1">Sign in to your account to continue</p>
          </div>

          <div className="bg-charcoal-800 rounded-2xl border border-charcoal-700 p-7 shadow-2xl">
            <Suspense fallback={<div className="h-44 animate-pulse bg-charcoal-700 rounded-xl" />}>
              <LoginForm />
            </Suspense>
          </div>

          <p className="text-center text-charcoal-600 text-xs mt-8">
            The Coffee Lab Platform &copy; {new Date().getFullYear()}
          </p>
        </div>
      </div>
    </div>
  );
}
