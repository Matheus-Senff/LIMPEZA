import Link from 'next/link';
import { Logo } from './Marca';
import { SERVICOS } from '@/lib/catalogo';

export function Rodape() {
  return (
    <footer className="mt-24 border-t border-tinta-20 bg-tinta-5">
      <div className="container-app grid gap-10 py-14 md:grid-cols-4">
        <div className="flex flex-col gap-4">
          <Logo />
          <p className="max-w-xs text-sm text-tinta-50">
            Serviços domésticos com preço transparente e profissionais credenciados e segurados.
          </p>
        </div>

        <div>
          <p className="rotulo mb-3">Serviços</p>
          <ul className="flex flex-col gap-2 text-sm text-tinta-70">
            {SERVICOS.map((s) => (
              <li key={s.slug}>
                <Link href={`/contratar/${s.slug}`} className="hover:text-azul-600">
                  {s.nome}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="rotulo mb-3">Plano Limpo</p>
          <ul className="flex flex-col gap-2 text-sm text-tinta-70">
            <li><Link href="/profissional" className="hover:text-azul-600">Trabalhe no app</Link></li>
            <li><Link href="/conta" className="hover:text-azul-600">Minha conta</Link></li>
            <li><Link href="/admin" className="hover:text-azul-600">Backoffice</Link></li>
            <li><Link href="/contratar/padrao" className="hover:text-azul-600">Agendar serviço</Link></li>
          </ul>
        </div>

        <div>
          <p className="rotulo mb-3">Atendimento</p>
          <p className="text-sm text-tinta-70">
            Segunda a sexta, 7h às 21h
            <br />
            Fins de semana e feriados, 7h às 17h
          </p>
          <p className="mt-3 text-sm font-semibold text-azul-600">contato@planolimpo.com.br</p>
        </div>
      </div>

      <div className="border-t border-tinta-20">
        <div className="container-app flex flex-col gap-2 py-5 text-xs text-tinta-50 sm:flex-row sm:items-center sm:justify-between">
          <span>© {new Date().getFullYear()} Plano Limpo. Todos os direitos reservados.</span>
          <span>Preços variam por região, data e horário. O valor da cotação é o valor cobrado.</span>
        </div>
      </div>
    </footer>
  );
}
