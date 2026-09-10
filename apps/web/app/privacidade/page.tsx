import Link from 'next/link';
import type { Metadata } from 'next';
import { Logo } from '@/components/Marca';

export const metadata: Metadata = { title: 'Plano Limpo' };

export default function Privacidade() {
  return (
    <main className="min-h-screen bg-tinta-5 px-5 py-10">
      <div className="container-app max-w-2xl">
        <div className="mb-8 flex justify-center">
          <Logo />
        </div>
        <div className="cartao p-7 sm:p-10">
          <h1 className="text-2xl font-bold tracking-tight">Política de privacidade</h1>
          <p className="mt-1 text-sm text-tinta-50">Última atualização: 8 de setembro de 2026.</p>

          <div className="mt-8 flex flex-col gap-6 text-sm leading-relaxed text-tinta-70">
            <section>
              <h2 className="mb-2 text-base font-bold text-tinta">1. Quais dados coletamos</h2>
              <p>
                Coletamos os dados que você informa diretamente ao usar a plataforma: nome, e-mail,
                telefone, endereço dos imóveis atendidos, e — para profissionais — CPF e os serviços que
                atendem. Também registramos os pedidos feitos, mensagens trocadas no chat de cada pedido e
                avaliações dadas após o serviço.
              </p>
            </section>

            <section>
              <h2 className="mb-2 text-base font-bold text-tinta">2. Para que usamos esses dados</h2>
              <p>
                Usamos esses dados para viabilizar o agendamento (calcular preço, encontrar profissionais
                disponíveis na região, permitir contato entre cliente e profissional durante o serviço) e
                para manter sua conta funcionando (login, histórico de pedidos, avaliações).
              </p>
            </section>

            <section>
              <h2 className="mb-2 text-base font-bold text-tinta">3. Com quem compartilhamos</h2>
              <p>
                O endereço completo do cliente só é compartilhado com o profissional depois que ele aceita o
                pedido — antes disso, o profissional vê apenas a cidade. O nome do cliente e do profissional
                fica visível um para o outro apenas enquanto o pedido está em andamento, para permitir o
                atendimento e a comunicação pelo chat. Não vendemos dados pessoais a terceiros.
              </p>
            </section>

            <section>
              <h2 className="mb-2 text-base font-bold text-tinta">4. Onde os dados ficam armazenados</h2>
              <p>
                Os dados são armazenados em um banco de dados com controle de acesso por linha (Row Level
                Security), garantindo que cada pessoa só consegue ler os dados dos próprios pedidos e da
                própria conta, ou os dados mínimos necessários de quem está do outro lado de um pedido em
                andamento.
              </p>
            </section>

            <section>
              <h2 className="mb-2 text-base font-bold text-tinta">5. Seus direitos</h2>
              <p>
                Você pode acessar e corrigir seus dados de cadastro e endereços a qualquer momento pela
                própria plataforma, em &quot;Minha conta&quot;. Para solicitar a exclusão da sua conta e dos
                dados associados a ela, entre em contato pelo canal de suporte informado na plataforma.
              </p>
            </section>

            <section>
              <h2 className="mb-2 text-base font-bold text-tinta">6. Cookies e sessão</h2>
              <p>
                Usamos apenas os mecanismos de sessão necessários para manter você conectado depois do
                login. Não usamos cookies de rastreamento ou publicidade.
              </p>
            </section>

            <section>
              <h2 className="mb-2 text-base font-bold text-tinta">7. Alterações desta política</h2>
              <p>
                Esta política pode ser atualizada conforme a plataforma evolui. Mudanças relevantes serão
                comunicadas na própria plataforma.
              </p>
            </section>
          </div>
        </div>

        <p className="mt-6 text-center text-sm text-tinta-50">
          <Link href="/" className="font-semibold text-tinta">
            Voltar
          </Link>
        </p>
      </div>
    </main>
  );
}
