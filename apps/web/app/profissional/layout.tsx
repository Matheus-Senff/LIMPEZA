import { CabecalhoApp } from '@/components/CabecalhoApp';
import { GuardaPerfil } from '@/lib/usePerfil';

export default function ProfissionalLayout({ children }: { children: React.ReactNode }) {
  return (
    <GuardaPerfil papel="professional">
      <CabecalhoApp papel="professional" />
      {children}
    </GuardaPerfil>
  );
}
