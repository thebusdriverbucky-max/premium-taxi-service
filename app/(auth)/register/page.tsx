"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Chrome } from "lucide-react";
import { signIn } from "next-auth/react";

const registerSchema = z
  .object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Invalid email address"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

type RegisterInput = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterInput) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.name,
          email: data.email,
          password: data.password,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Registration failed");
      }

      router.push("/login?registered=true");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthSignIn = (provider: "google") => {
    signIn(provider, { callbackUrl: "/" });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-taxi-dark-navy py-12 px-4">
      <div className="w-full max-w-md bg-slate-900 border border-taxi-gold/20 rounded-2xl shadow-2xl p-8">
        <h1 className="text-3xl font-bold mb-2 text-center text-taxi-gold">Create Account</h1>
        <p className="text-gray-400 text-center mb-8">Join our exclusive taxi network</p>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <Input
            label="Full Name"
            {...register("name")}
            error={errors.name?.message}
            placeholder="John Doe"
            className="bg-taxi-dark-navy/50 border-taxi-gold/10 text-white placeholder:text-gray-600 focus:border-taxi-gold/50"
          />

          <Input
            label="Email Address"
            type="email"
            {...register("email")}
            error={errors.email?.message}
            placeholder="you@example.com"
            className="bg-taxi-dark-navy/50 border-taxi-gold/10 text-white placeholder:text-gray-600 focus:border-taxi-gold/50"
          />

          <Input
            label="Password"
            type="password"
            {...register("password")}
            error={errors.password?.message}
            placeholder="••••••••"
            helperText="At least 8 characters"
            className="bg-taxi-dark-navy/50 border-taxi-gold/10 text-white placeholder:text-gray-600 focus:border-taxi-gold/50"
          />

          <Input
            label="Confirm Password"
            type="password"
            {...register("confirmPassword")}
            error={errors.confirmPassword?.message}
            placeholder="••••••••"
            className="bg-taxi-dark-navy/50 border-taxi-gold/10 text-white placeholder:text-gray-600 focus:border-taxi-gold/50"
          />

          <Button
            type="submit"
            className="w-full py-6 bg-taxi-gold-gradient text-taxi-dark-navy font-bold hover:opacity-90 transition-all shadow-lg shadow-taxi-gold/10"
            disabled={loading}
          >
            {loading ? "Creating account..." : "Create Account"}
          </Button>
        </form>

        <div className="mt-8 text-center">
          <p className="text-gray-400 text-sm">
            Already have an account?{" "}
            <Link href="/login" className="text-taxi-gold hover:text-taxi-gold-light font-semibold transition-colors">
              Sign In
            </Link>
          </p>
        </div>

        <div className="mt-8 relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-taxi-gold/10"></div>
          </div>
          <div className="relative flex justify-center text-xs uppercase tracking-widest">
            <span className="px-4 bg-slate-900 text-gray-500">
              Or continue with
            </span>
          </div>
        </div>

        <div className="mt-8">
          <Button
            type="button"
            variant="outline"
            className="w-full py-6 gap-3 border-taxi-gold/30 bg-taxi-dark-navy text-white hover:bg-taxi-gold/10 hover:border-taxi-gold/50 transition-all shadow-inner"
            onClick={() => handleOAuthSignIn("google")}
          >
            <Chrome className="w-5 h-5 text-taxi-gold" />
            Google
          </Button>
        </div>
      </div>
    </div>
  );
}
