'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Logo } from '@/components/Marca';
import { supabase, supabaseConfigurado } from '@/lib/supabase';
import { buscarPapeis, buscarPerfil, ROTA_POR_PAPEL, type PapelUsuario } from '@/lib/perfil';
import { SERVICOS } from '@/lib/catalogo';
import type { User } from '@supabase/supabase-js';

type Papel = Extract<PapelUsuario, 'customer' | 'professional'>;
type Etapa = 'papel' | 'dados' | 'aguardando' | 'perfil';

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

  const [telefone, setTelefone] = useState('');
  const [cpf, setCpf] = useState('');
  const [servicos, setServicos] = useState<string[]>([]);
  const [aceitouTermos, setAceitouTermos] = useState(false);

  function escolherPapel(p: Papel) {
    setPapel(p);
    setEtapa('dados');
  }

  // Cliente não precisa de nenhum dado extra: entra direto na plataforma
  // assim que o e-mail é confirmado. Profissional ainda passa pela etapa
  // de perfil porque CPF é obrigatório para credenciamento.
  async function finalizarSessao(usuario: User, p: Papel, nomeCompleto: string) {
    if (p !== 'customer') {
      setPapel(p);
      setNome(nomeCompleto);
      setEmail(usuario.email ?? '');
      setEtapa('perfil');
      return;
    }
    if (!supabase) return;
    await supabase.rpc('fn_registrar_perfil', { p_role: 'customer', p_full_name: nomeCompleto });
    await supabase.rpc('fn_registrar_cliente');
    router.replace(ROTA_POR_PAPEL.customer);
  }

  // Cobre quem já tem sessão ao abrir esta página: clicou no link do e-mail
  // de confirmação, ou voltou depois de já ter confirmado antes.
  useEffect(() => {
    (async () => {
      if (!supabase) return;
      const { data: sessao } = await supabase.auth.getSession();
      if (!sessao.session) return;

      // getSession() só lê o token guardado no navegador, sem checar se o
      // usuário ainda existe no servidor. getUser() valida de verdade — se
      // a conta foi apagada nesse meio tempo, ele volta vazio e limpamos a
      // sessão velha em vez de confiar nos metadados dela.
      const { data: validado } = await supabase.auth.getUser();
      const usuario = validado.user;
      if (!usuario) {
        await supabase.auth.signOut();
        return;
      }

      const perfil = await buscarPerfil();
      if (perfil) {
        // Perfil existe, mas pode faltar a linha de cliente/profissional —
        // é o caso de quem parou o cadastro no meio. Mandar pra tela de
        // login aqui criava um vaivém sem fim entre / e /cadastrar, então
        // retomamos o cadastro do ponto que falta.
        const papeis = await buscarPapeis(perfil.id);
        if (papeis.cliente || papeis.profissional || perfil.role === 'admin') {
          // A conta pode ter os dois papéis — quem decide pra onde mandar é
          // a tela de login.
          router.replace('/');
          return;
        }
        const metaPerfil = usuario.user_metadata as { role?: Papel; full_name?: string };
        await finalizarSessao(usuario, metaPerfil.role ?? 'customer', metaPerfil.full_name ?? perfil.full_name);
        return;
      }

      const meta = usuario.user_metadata as { role?: Papel; full_name?: string };
      await finalizarSessao(usuario, meta.role ?? 'customer', meta.full_name ?? '');
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Enquanto espera o clique no link: se a confirmação acontecer na mesma
  // janela do navegador (outra aba), o Supabase sincroniza a sessão sozinho.
  useEffect(() => {
    if (etapa !== 'aguardando' || !supabase || !papel) return;
    const { data: assinatura } = supabase.auth.onAuthStateChange((_evento, sessao) => {
      if (sessao?.user) finalizarSessao(sessao.user, papel, nome);
    });
    return () => assinatura.subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [etapa, papel]);

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
    if (!aceitouTermos) {
      setErro('Você precisa aceitar os termos de uso e a política de privacidade.');
      return;
    }
    if (!supabase || !papel) {
      setErro('Cadastro indisponível: Supabase não está configurado neste ambiente.');
      return;
    }

    setCarregando(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password: senha,
      options: {
        data: { role: papel, full_name: nome },
        emailRedirectTo: `${window.location.origin}/cadastrar`,
      },
    });

    if (error) {
      setCarregando(false);
      setErro(error.message);
      return;
    }

    if (data.session && data.user) {
      await finalizarSessao(data.user, papel, nome);
      setCarregando(false);
      return;
    }

    // Sem sessão e sem erro é ambíguo: pode ser um cadastro novo (e-mail a
    // caminho) ou um e-mail que já existe e já está confirmado — por
    // segurança o Supabase não avisa qual dos dois é, e nesse segundo caso
    // nenhum e-mail novo é enviado. Tenta entrar com a senha informada: se
    // funcionar, era o segundo caso e a conta já pode seguir adiante.
    const login = await supabase.auth.signInWithPassword({ email, password: senha });
    setCarregando(false);
    if (login.data.session && login.data.user) {
      await finalizarSessao(login.data.user, papel, nome);
      return;
    }
    setEtapa('aguardando');
  }

  async function reenviarEmail() {
    if (!supabase) return;
    setErro(null);
    await supabase.auth.resend({ type: 'signup', email });
    setErro('Reenviamos o e-mail de confirmação.');
  }

  function alternarServico(code: string) {
    setServicos((atual) => (atual.includes(code) ? atual.filter((c) => c !== code) : [...atual, code]));
  }

  async function completarPerfil(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);

    if (cpf.replace(/\D/g, '').length !== 11) {
      setErro('Informe um CPF válido.');
      return;
    }
    if (servicos.length === 0) {
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

    const { error: erroPerfil } = await supabase.rpc('fn_registrar_perfil', {
      p_role: 'professional',
      p_full_name: nome,
      p_phone: telefone || null,
    });
    if (erroPerfil) {
      setCarregando(false);
      setErro(erroPerfil.message);
      return;
    }

    const { error: erroPapel } = await supabase.rpc('fn_registrar_profissional', {
      p_document: cpf.replace(/\D/g, ''),
      p_skills: servicos,
    });

    setCarregando(false);
    if (erroPapel) {
      setErro(erroPapel.message);
      return;
    }

    router.replace(ROTA_POR_PAPEL.professional);
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
                <label className="flex items-start gap-2 text-sm text-tinta-50">
                  <input
                    type="checkbox"
                    className="mt-0.5 h-4 w-4 accent-[#2563eb]"
                    checked={aceitouTermos}
                    onChange={(e) => setAceitouTermos(e.target.checked)}
                  />
                  <span>
                    Li e aceito os{' '}
                    <Link href="/termos" target="_blank" className="font-semibold text-tinta underline">
                      termos de uso
                    </Link>{' '}
                    e a{' '}
                    <Link href="/privacidade" target="_blank" className="font-semibold text-tinta underline">
                      política de privacidade
                    </Link>
                    .
                  </span>
                </label>
                {erro && <p className="rounded-lg border border-tinta-20 bg-tinta-5 px-4 py-3 text-sm font-semibold text-tinta">{erro}</p>}
                {!supabaseConfigurado && (
                  <p className="rounded-lg border border-tinta-20 bg-tinta-5 px-4 py-3 text-xs text-tinta-70">
                    Ambiente sem Supabase configurado.
                  </p>
                )}
                <button className="btn-primario w-full" disabled={carregando || !aceitouTermos}>
                  {carregando ? 'Enviando…' : 'Continuar'}
                </button>
                <button type="button" onClick={() => setEtapa('papel')} className="text-center text-sm text-tinta-50">
                  Voltar
                </button>
              </form>
            </>
          )}

          {etapa === 'aguardando' && (
            <>
              <h1 className="text-xl font-bold tracking-tight">Confirme seu e-mail</h1>
              <p className="mt-1 text-sm text-tinta-50">
                Enviamos um link para <b className="text-tinta">{email}</b>. Clique nele para entrar
                direto na plataforma.
              </p>
              {erro && (
                <p className="mt-4 rounded-lg border border-tinta-20 bg-tinta-5 px-4 py-3 text-sm font-semibold text-tinta">
                  {erro}
                </p>
              )}
              <button onClick={reenviarEmail} className="btn-contorno mt-6 w-full">
                Reenviar e-mail
              </button>
            </>
          )}

          {etapa === 'perfil' && (
            <>
              <h1 className="text-xl font-bold tracking-tight">Últimos detalhes</h1>
              <p className="mt-1 text-sm text-tinta-50">Faltam só esses dados para você atender.</p>
              <form onSubmit={completarPerfil} className="mt-6 flex flex-col gap-3">
                <input className="campo" placeholder="Celular com DDD" value={telefone} onChange={(e) => setTelefone(e.target.value)} aria-label="Celular" />
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
