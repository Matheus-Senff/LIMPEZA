'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Logo } from '@/components/Marca';
import { supabase, supabaseConfigurado } from '@/lib/supabase';
import { ROTA_POR_PAPEL, type PapelUsuario } from '@/lib/perfil';
import { SERVICOS } from '@/lib/catalogo';

type Papel = Extract<PapelUsuario, 'customer' | 'professional'>;
type Etapa = 'papel' | 'dados' | 'codigo' | 'perfil';

const SERVICOS_PROFISSIONAL = SERVICOS.filter((s) => s.code !== 'HOME_ASSISTANCE');

export default function Cadastrar() {
  const router = useRouter();
  const [etapa, setEtapa] = useState<Etapa>('papel');
  const [papel, setPapel] = useState<Papel | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [codigo, setCodigo] = useState('');

  const [telefone, setTelefone] = useState('');
  const [cpf, setCpf] = useState('');
  const [servicos, setServicos] = useState<string[]>([]);

  function escolherPapel(p: Papel) {
    setPapel(p);
    setEtapa('dados');
  }

  async function criarConta(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);

    if (senha.length < 6) {
      setErro('A senha precisa ter pelo menos 6 caracteres.');
      return;
    }
    if (senha !== confirmarSenha) {
      setErro('As senhas não coincidem.');
      return;
    }
    if (!supabase) {
      setErro('Cadastro indisponível: Supabase não está configurado neste ambiente.');
      return;
    }

    setCarregando(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password: senha,
      options: { data: { role: papel, full_name: nome } },
    });
    setCarregando(false);

    if (error) {
      setErro(error.message);
      return;
    }

    // Confirmação de e-mail desativada no projeto: a sessão já vem pronta.
    if (data.session) {
      setEtapa('perfil');
      return;
    }
    setEtapa('codigo');
  }

  async function confirmarCodigo(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    if (!supabase) return;

    setCarregando(true);
    const { error } = await supabase.auth.verifyOtp({ email, token: codigo, type: 'signup' });
    setCarregando(false);

    if (error) {
      setErro('Código inválido ou expirado.');
      return;
    }
    setEtapa('perfil');
  }

  async function reenviarCodigo() {
    if (!supabase) return;
    setErro(null);
    await supabase.auth.resend({ type: 'signup', email });
    setErro('Enviamos um novo código para o seu e-mail.');
  }

  function alternarServico(code: string) {
    setServicos((atual) => (atual.includes(code) ? atual.filter((c) => c !== code) : [...atual, code]));
  }

  async function completarPerfil(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);

    if (papel === 'professional' && cpf.replace(/\D/g, '').length !== 11) {
      setErro('Informe um CPF válido.');
      return;
    }
    if (papel === 'professional' && servicos.length === 0) {
      setErro('Selecione ao menos um serviço que você atende.');
      return;
    }
    if (!supabase) return;

    setCarregando(true);
    const { data: sessao } = await supabase.auth.getUser();
    const usuario = sessao.user;
    if (!usuario) {
      setCarregando(false);
      setErro('Sessão expirada. Faça login novamente.');
      return;
    }

    const { error: erroPerfil } = await supabase.from('profiles').insert({
      id: usuario.id,
      role: papel,
      full_name: nome,
      email,
      phone: telefone || null,
    });
    if (erroPerfil) {
      setCarregando(false);
      setErro(erroPerfil.message);
      return;
    }

    const { error: erroPapel } =
      papel === 'customer'
        ? await supabase.from('customers').insert({ id: usuario.id })
        : await supabase.from('professionals').insert({
            id: usuario.id,
            document: cpf.replace(/\D/g, ''),
            skills: servicos,
          });

    setCarregando(false);
    if (erroPapel) {
      setErro(erroPapel.message);
      return;
    }

    router.replace(ROTA_POR_PAPEL[papel as Papel]);
  }

  return (
    <main className="grid min-h-screen place-items-center bg-tinta-5 px-5 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <Logo />
        </div>

        <div className="cartao p-7">
          {etapa === 'papel' && (
            <>
              <h1 className="text-xl font-bold tracking-tight">Criar conta</h1>
              <p className="mt-1 text-sm text-tinta-50">O que você quer fazer na Plano Limpo?</p>
              <div className="mt-6 flex flex-col gap-3">
                <button onClick={() => escolherPapel('customer')} className="cartao p-5 text-left transition hover:border-tinta-20">
                  <p className="font-bold">Contratar serviços</p>
                  <p className="mt-1 text-sm text-tinta-50">Agendar faxina, passadoria e outros serviços.</p>
                </button>
                <button onClick={() => escolherPapel('professional')} className="cartao p-5 text-left transition hover:border-tinta-20">
                  <p className="font-bold">Trabalhar na Plano Limpo</p>
                  <p className="mt-1 text-sm text-tinta-50">Receber pedidos e atender clientes.</p>
                </button>
              </div>
            </>
          )}

          {etapa === 'dados' && (
            <>
              <h1 className="text-xl font-bold tracking-tight">Seus dados de acesso</h1>
              <p className="mt-1 text-sm text-tinta-50">
                {papel === 'customer' ? 'Conta de cliente' : 'Conta de profissional'}
              </p>
              <form onSubmit={criarConta} className="mt-6 flex flex-col gap-3">
                <input className="campo" required placeholder="Nome completo" value={nome} onChange={(e) => setNome(e.target.value)} aria-label="Nome completo" />
                <input type="email" className="campo" required placeholder="E-mail" value={email} onChange={(e) => setEmail(e.target.value)} aria-label="E-mail" />
                <input type="password" className="campo" required placeholder="Senha" value={senha} onChange={(e) => setSenha(e.target.value)} aria-label="Senha" />
                <input type="password" className="campo" required placeholder="Confirmar senha" value={confirmarSenha} onChange={(e) => setConfirmarSenha(e.target.value)} aria-label="Confirmar senha" />
                {erro && <p className="rounded-lg border border-tinta-20 bg-tinta-5 px-4 py-3 text-sm font-semibold text-tinta">{erro}</p>}
                {!supabaseConfigurado && (
                  <p className="rounded-lg border border-tinta-20 bg-tinta-5 px-4 py-3 text-xs text-tinta-70">
                    Ambiente sem Supabase configurado.
                  </p>
                )}
                <button className="btn-primario w-full" disabled={carregando}>
                  {carregando ? 'Enviando…' : 'Continuar'}
                </button>
                <button type="button" onClick={() => setEtapa('papel')} className="text-center text-sm text-tinta-50">
                  Voltar
                </button>
              </form>
            </>
          )}

          {etapa === 'codigo' && (
            <>
              <h1 className="text-xl font-bold tracking-tight">Confirme seu e-mail</h1>
              <p className="mt-1 text-sm text-tinta-50">
                Enviamos um código de 6 dígitos para <b className="text-tinta">{email}</b>.
              </p>
              <form onSubmit={confirmarCodigo} className="mt-6 flex flex-col gap-3">
                <input
                  className="campo text-center text-lg tracking-[.3em] numero"
                  inputMode="numeric"
                  required
                  maxLength={6}
                  placeholder="000000"
                  value={codigo}
                  onChange={(e) => setCodigo(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  aria-label="Código de confirmação"
                />
                {erro && <p className="rounded-lg border border-tinta-20 bg-tinta-5 px-4 py-3 text-sm font-semibold text-tinta">{erro}</p>}
                <button className="btn-primario w-full" disabled={carregando}>
                  {carregando ? 'Confirmando…' : 'Confirmar'}
                </button>
                <button type="button" onClick={reenviarCodigo} className="text-center text-sm text-tinta-50">
                  Reenviar código
                </button>
              </form>
            </>
          )}

          {etapa === 'perfil' && (
            <>
              <h1 className="text-xl font-bold tracking-tight">Últimos detalhes</h1>
              <form onSubmit={completarPerfil} className="mt-6 flex flex-col gap-3">
                <input className="campo" placeholder="Celular com DDD" value={telefone} onChange={(e) => setTelefone(e.target.value)} aria-label="Celular" />

                {papel === 'professional' && (
                  <>
                    <input
                      className="campo"
                      required
                      placeholder="CPF"
                      value={cpf}
                      onChange={(e) => setCpf(e.target.value.replace(/\D/g, '').slice(0, 11))}
                      aria-label="CPF"
                    />
                    <fieldset className="rounded-xl border border-tinta-20 p-4">
                      <legend className="rotulo px-2">O que você atende</legend>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {SERVICOS_PROFISSIONAL.map((s) => (
                          <label key={s.code} className="flex items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              className="h-4 w-4 accent-[#2563eb]"
                              checked={servicos.includes(s.code)}
                              onChange={() => alternarServico(s.code)}
                            />
                            {s.nome}
                          </label>
                        ))}
                      </div>
                    </fieldset>
                  </>
                )}

                {erro && <p className="rounded-lg border border-tinta-20 bg-tinta-5 px-4 py-3 text-sm font-semibold text-tinta">{erro}</p>}
                <button className="btn-primario w-full" disabled={carregando}>
                  {carregando ? 'Salvando…' : 'Concluir cadastro'}
                </button>
              </form>
            </>
          )}
        </div>

        {etapa === 'papel' && (
          <p className="mt-6 text-center text-sm text-tinta-50">
            Já tem conta?{' '}
            <Link href="/" className="font-semibold text-tinta">
              Entrar
            </Link>
          </p>
        )}
      </div>
    </main>
  );
}
