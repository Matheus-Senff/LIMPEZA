import Link from 'next/link';
import type { Metadata } from 'next';
import { Logo } from '@/components/Marca';

export const metadata: Metadata = { title: 'Termos de uso' };

export default function Termos() {
  return (
    <main className="min-h-screen bg-tinta-5 px-5 py-10">
      <div className="container-app max-w-2xl">
        <div className="mb-8 flex justify-center">
          <Logo />
        </div>
        <div className="cartao p-7 sm:p-10">
          <h1 className="text-2xl font-bold tracking-tight">Termos de uso</h1>
          <p className="mt-1 text-sm text-tinta-50">Última atualização: 8 de setembro de 2026.</p>

          <div className="mt-8 flex flex-col gap-6 text-sm leading-relaxed text-tinta-70">
            <section>
              <h2 className="mb-2 text-base font-bold text-tinta">1. O que é a Plano Limpo</h2>
              <p>
                A Plano Limpo é uma plataforma que conecta clientes que precisam de serviços domésticos
                (faxina, limpeza pesada, passadoria, montagem de móveis e afins) a profissionais autônomos
                cadastrados que prestam esses serviços na região de Itaiópolis, Mafra e Rio Negro. A
                plataforma não é empregadora dos profissionais nem presta os serviços diretamente: ela
                organiza o agendamento, o pagamento e a comunicação entre as partes.
              </p>
            </section>

            <section>
              <h2 className="mb-2 text-base font-bold text-tinta">2. Cadastro e conta</h2>
              <p>
                Para usar a plataforma é preciso criar uma conta com e-mail e senha. Você é responsável por
                manter seus dados de acesso em sigilo e por tudo que acontecer na sua conta. Uma mesma
                pessoa pode ter conta de cliente e de profissional ao mesmo tempo, usando o mesmo e-mail.
              </p>
            </section>

            <section>
              <h2 className="mb-2 text-base font-bold text-tinta">3. Como funciona o agendamento</h2>
              <p>
                Ao pedir um serviço, o cliente informa endereço, data/horário e características do imóvel,
                e recebe um preço calculado na hora. Esse pedido é oferecido a todos os profissionais
                cadastrados na região que atendem aquele serviço; o primeiro a aceitar fica responsável por
                ele. O endereço completo só é revelado ao profissional depois que ele aceita o pedido.
              </p>
            </section>

            <section>
              <h2 className="mb-2 text-base font-bold text-tinta">4. Preço e pagamento</h2>
              <p>
                O preço mostrado no momento da cotação é o preço cobrado — ele não muda depois, mesmo que a
                cotação expire e precise ser recalculada. O repasse ao profissional também é fixado nesse
                momento. Nesta versão da plataforma o pagamento é processado de forma simulada, sem
                cobrança real em cartão ou Pix; isso será substituído por um meio de pagamento real antes do
                lançamento comercial.
              </p>
            </section>

            <section>
              <h2 className="mb-2 text-base font-bold text-tinta">5. Cancelamento</h2>
              <p>
                O cliente pode cancelar um pedido gratuitamente enquanto ele ainda não foi aceito por um
                profissional. Depois que um profissional aceita, o cancelamento feito com menos de 24 horas
                de antecedência do horário agendado está sujeito a uma taxa de 20% do valor do serviço.
              </p>
            </section>

            <section>
              <h2 className="mb-2 text-base font-bold text-tinta">6. Avaliações</h2>
              <p>
                Depois que um serviço é concluído, o cliente pode avaliar o profissional com uma nota de 1 a
                5 estrelas e um comentário opcional. Essas avaliações formam a nota pública do profissional
                na plataforma.
              </p>
            </section>

            <section>
              <h2 className="mb-2 text-base font-bold text-tinta">7. Conduta esperada</h2>
              <p>
                Espera-se respeito mútuo entre clientes e profissionais, uso do chat da plataforma apenas
                para tratar do serviço contratado, e informações verdadeiras no cadastro e no endereço
                informado.
              </p>
            </section>

            <section>
              <h2 className="mb-2 text-base font-bold text-tinta">8. Alterações destes termos</h2>
              <p>
                Estes termos podem ser atualizados conforme a plataforma evolui. Mudanças relevantes serão
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
