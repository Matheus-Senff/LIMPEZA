/**
 * Bairro (e resto do endereço) pelo CEP via ViaCEP — serviço público
 * brasileiro, sem chave. Se der erro ou demorar, devolve null em vez de
 * travar o fluxo por causa de uma API de terceiro.
 */
export interface EnderecoDoCep {
  street: string | null;
  district: string | null;
  city: string | null;
  state: string | null;
}

export async function enderecoDoCep(cep: string): Promise<EnderecoDoCep | null> {
  const limpo = cep.replace(/\D/g, '');
  if (limpo.length !== 8) return null;
  try {
    const r = await fetch(`https://viacep.com.br/ws/${limpo}/json/`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!r.ok) return null;
    const dados = await r.json();
    if (dados?.erro) return null;
    return {
      street: dados.logradouro || null,
      district: dados.bairro || null,
      city: dados.localidade || null,
      state: dados.uf || null,
    };
  } catch {
    return null;
  }
}

export async function bairroDoCep(cep: string): Promise<string | null> {
  return (await enderecoDoCep(cep))?.district ?? null;
}
