import { CabecalhoApp } from '@/components/CabecalhoApp';
import { GuardaPerfil } from '@/lib/usePerfil';

export default function ClienteLayout({ children }: { children: React.ReactNode }) {
  return (
    <GuardaPerfil papel="customer">
      <CabecalhoApp papel="customer" />
      {children}
    </GuardaPerfil>
  );
}
