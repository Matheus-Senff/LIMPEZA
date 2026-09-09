import { CabecalhoApp } from '@/components/CabecalhoApp';
import { GuardaPerfil } from '@/lib/usePerfil';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <GuardaPerfil papel="admin">
      <CabecalhoApp papel="admin" />
      {children}
    </GuardaPerfil>
  );
}
