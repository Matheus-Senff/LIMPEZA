'use client';

import { usePerfil } from '@/lib/usePerfil';
import { GradeServicos } from '@/components/GradeServicos';

export default function ClienteHome() {
  const perfil = usePerfil();
  const primeiroNome = perfil.full_name.split(' ')[0];

  return (
    <main className="container-app flex flex-col gap-10 py-10">
      <h1 className="text-2xl font-bold tracking-tight">Olá, {primeiroNome}</h1>
      <GradeServicos />
    </main>
  );
}
