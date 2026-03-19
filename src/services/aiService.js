const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

/**
 * Gera um relatório detalhado sobre a saúde financeira do mês via OpenAI para gestores.
 * @param {number} totalSpent - Total gasto no mês
 * @param {Array<{ name: string, spent: number }>} categoriesData - Lista de objetos com categoria e valor gasto
 * @returns {Promise<string>} Texto do relatório gerado pela IA
 */
export async function generateManagerReport(totalSpent, categoriesData) {
  const apiKey = process.env.EXPO_PUBLIC_OPENAI_API_KEY;

  if (!apiKey) {
    return 'Configure EXPO_PUBLIC_OPENAI_API_KEY no .env para ativar o relatório de gestão com IA.';
  }

  const categoriesSummary = categoriesData
    .map(cat => `- ${cat.name}: R$ ${cat.spent.toFixed(2)}`)
    .join('\n');

  const userMessage = 
    `Resumo do mês:\nTotal gasto: R$ ${totalSpent.toFixed(2)}\nCategorias:\n${categoriesSummary}\nAvalie a saúde financeira deste mês.`;

  const SYSTEM_PROMPT = 'Você é um gestor financeiro de elite, rigoroso, um pouco sarcástico, mas que quer o bem do cliente. Analise o total gasto e as categorias. Dê um parecer sobre a saúde financeira deste mês em um ou dois parágrafos curtos.';

  try {
    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userMessage },
        ],
        max_tokens: 350,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      const msg = errData.error?.message || response.statusText;
      throw new Error(`OpenAI API: ${msg}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content?.trim();

    if (!content) {
      throw new Error('OpenAI API não retornou conteúdo para o relatório de gestão.');
    }

    return content;
  } catch (err) {
    return `Erro ao gerar relatório de gestão via IA: ${err.message}`;
  }
}
const MODEL = 'gpt-4o-mini';

const SYSTEM_PROMPT = `Você é uma conselheira financeira premium, direta e objetiva. Seu estilo tem um leve toque de sarcasmo e humor. 
Você recebe: o valor que o usuário acabou de gastar, o nome da categoria do gasto e o limite mensal (R$ 500).
Responda em no máximo 2 frases, avaliando a situação de forma clara e impactante. Seja breve e memorável.`;

/**
 * Gera um alerta financeiro personalizado via OpenAI.
 * @param {string} categoryName - Nome da categoria do gasto
 * @param {number} amountSpent - Valor gasto
 * @param {number} totalLimit - Limite mensal (ex: 500)
 * @returns {Promise<string>} Texto do alerta gerado pela IA
 */
export async function generateFinancialAlert(categoryName, amountSpent, totalLimit) {
  const apiKey = process.env.EXPO_PUBLIC_OPENAI_API_KEY;

  if (!apiKey) {
    return 'Configure EXPO_PUBLIC_OPENAI_API_KEY no .env para ativar os alertas com IA.';
  }

  const userMessage = `O usuário gastou R$ ${amountSpent.toFixed(2)} na categoria "${categoryName}". O limite mensal é R$ ${totalLimit.toFixed(2)}. Avalie a situação.`;

  try {
    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userMessage },
        ],
        max_tokens: 150,
        temperature: 0.8,
      }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      const msg = errData.error?.message || response.statusText;
      throw new Error(`OpenAI API: ${msg}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content?.trim();

    if (!content) {
      throw new Error('Resposta vazia da IA');
    }

    return content;
  } catch (error) {
    console.error('Erro ao gerar alerta financeiro:', error);
    return error.message || 'Não foi possível gerar o alerta. Tente novamente.';
  }
}
