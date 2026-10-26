"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useSettings } from "@/components/providers/settings-provider";

const forgotPasswordSchema = z.object({
  email: z.string().email("Invalid email address"),
});

type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [unavailable, setUnavailable] = useState<string | null>(null);
  const { settings } = useSettings();
  const contactPhone = settings?.phoneNumber?.trim();
  const contactEmail = settings?.storeEmail?.trim();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data: ForgotPasswordInput) => {
    setLoading(true);
    setError(null);
    setMessage(null);
    setUnavailable(null);

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (errorData.code === "EMAIL_NOT_CONFIGURED") {
          setUnavailable(errorData.message);
          return;
        }
        throw new Error(errorData.message || "Something went wrong");
      }

      setMessage("If an account exists with this email, you will receive a password reset link.");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 py-12 px-4">
      <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-lg shadow-md p-8">
        <h1 className="text-3xl font-bold mb-6 text-center">Forgot Password</h1>
        <p className="text-center text-gray-600 dark:text-gray-400 mb-6">
          Enter your email address and we’ll send you a link to reset your password.
        </p>

        {message && (
          <div className="mb-4 p-3 bg-green-50 text-green-700 rounded-lg text-sm">
            {message}
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}

        {unavailable && (
          <div role="alert" className="mb-4 p-3 bg-amber-50 text-amber-800 rounded-lg text-sm">
            <p>{unavailable}</p>
            {(contactPhone || contactEmail) && (
              <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 font-medium">
                {contactPhone && <a href={`tel:${contactPhone}`} className="hover:underline">{contactPhone}</a>}
                {contactEmail && <a href={`mailto:${contactEmail}`} className="hover:underline">{contactEmail}</a>}
              </p>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="Email Address"
            type="email"
            {...register("email")}
            error={errors.email?.message}
            placeholder="you@example.com"
          />

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Sending..." : "Send Reset Link"}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <Link href="/login" className="text-blue-600 hover:underline font-medium">
            Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
