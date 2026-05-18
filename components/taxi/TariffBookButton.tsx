"use client";

import { useRouter } from "next/navigation";

interface TariffBookButtonProps {
  tariffId: string;
  tariffName: string;
}

export function TariffBookButton({ tariffId, tariffName }: TariffBookButtonProps) {
  const router = useRouter();

  const handleClick = () => {
    localStorage.setItem("selectedTariffId", tariffId);
    router.push("/booking");
  };

  return (
    <button
      onClick={handleClick}
      className="w-full py-4 rounded-2xl bg-taxi-gold-gradient text-taxi-dark-navy font-bold text-center hover:shadow-[0_0_20px_rgba(191,149,63,0.3)] transition-all duration-300"
    >
      Book {tariffName}
    </button>
  );
}
