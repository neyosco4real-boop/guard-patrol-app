'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function QRGeneratorRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/admin/checkpoints');
  }, [router]);

  return (
    <main className="min-h-screen bg-[#070913] text-white flex items-center justify-center font-sans">
      <p className="text-xs text-slate-400">Redirecting to Checkpoint & QR Hub...</p>
    </main>
  );
}
