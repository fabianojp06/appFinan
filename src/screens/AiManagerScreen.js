import React, { useState, useEffect, useRef, useContext } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Send, Bot, User as UserIcon, Trash2, Sparkles } from 'lucide-react-native';
import { ThemeContext } from '../contexts/ThemeContext';
import { supabase } from '../services/supabase'; // Importante: Precisamos do Supabase para puxar os dados reais

export default function AiManagerScreen() {
  const { isDark } = useContext(ThemeContext);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollViewRef = useRef();

  // Cores Dinâmicas do Tema
  const bgMain = isDark ? 'bg-slate-950' : 'bg-slate-50';
  const bgCard = isDark ? 'bg-slate-900' : 'bg-white';
  const bgInput = isDark ? 'bg-slate-800' : 'bg-slate-100';
  const borderCard = isDark ? 'border-slate-800' : 'border-slate-200';
  const textTitle = isDark ? 'text-white' : 'text-slate-900';
  const textSub = isDark ? 'text-slate-400' : 'text-slate-500';

  useEffect(() => {
    const loadChatHistory = async () => {
      try {
        const savedChat = await AsyncStorage.getItem('@ai_chat_history');
        if (savedChat) {
          setMessages(JSON.parse(savedChat));
        } else {
          setMessages([{
            id: 'welcome',
            role: 'ai',
            text: 'Olá! Eu sou seu Gestor IA. Como posso ajudar com suas finanças hoje? Você pode me fazer uma pergunta ou clicar no botão abaixo para eu analisar sua conta.',
            timestamp: new Date().toISOString()
          }]);
        }
      } catch (error) {
        console.error("Erro ao carregar histórico", error);
      }
    };
    loadChatHistory();
  }, []);

  const saveChatHistory = async (newMessages) => {
    try {
      await AsyncStorage.setItem('@ai_chat_history', JSON.stringify(newMessages));
    } catch (error) {
      console.error("Erro ao salvar histórico", error);
    }
  };

  const clearHistory = async () => {
    const welcomeMsg = [{
      id: Date.now().toString(),
      role: 'ai',
      text: 'Histórico limpo! Como posso te ajudar agora?',
      timestamp: new Date().toISOString()
    }];
    setMessages(welcomeMsg);
    await saveChatHistory(welcomeMsg);
  };

  // FUNÇÃO MÁGICA: INSIGHT AUTOMÁTICO
  const handleAutoInsight = async () => {
    const userMsg = {
      id: Date.now().toString(),
      role: 'user',
      text: 'Por favor, analise minhas finanças e me dê um insight.',
      timestamp: new Date().toISOString()
    };

    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setLoading(true);
    setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);

    try {
      // 1. Puxa os dados reais do usuário no Supabase
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não logado");

      const { data: txs, error } = await supabase
        .from('transactions')
        .select('*, categories(name, type)')
        .eq('user_id', user.id);

      if (error) throw error;

      // 2. Faz as contas
      let receitas = 0;
      let despesas = 0;
      const gastosPorCategoria = {};

      (txs || []).forEach(t => {
        const valor = Number(t.amount) || 0;
        const isIncome = t.type === 'income' || t.categories?.type === 'income';
        if (isIncome) {
          receitas += valor;
        } else {
          despesas += valor;
          const catName = t.categories?.name || 'Geral';
          gastosPorCategoria[catName] = (gastosPorCategoria[catName] || 0) + valor;
        }
      });

      const saldo = receitas - despesas;
      
      let maiorCategoria = '';
      let maiorValor = 0;
      Object.keys(gastosPorCategoria).forEach(cat => {
        if (gastosPorCategoria[cat] > maiorValor) {
          maiorValor = gastosPorCategoria[cat];
          maiorCategoria = cat;
        }
      });

      // 3. Monta o texto inteligente (Simulando uma IA baseada nos dados)
      let aiText = `Acabei de olhar seus números! 📊\n\n`;
      
      if (txs.length === 0) {
        aiText = "Parece que você ainda não lançou nenhuma transação. Adicione seus primeiros ganhos e gastos na aba 'Lançar' para eu poder analisar sua saúde financeira!";
      } else {
        aiText += `Você teve ganhos de R$ ${receitas.toFixed(2).replace('.', ',')} e já gastou R$ ${despesas.toFixed(2).replace('.', ',')}. Seu saldo de controle atual é de R$ ${saldo.toFixed(2).replace('.', ',')}.\n\n`;
        
        if (despesas > receitas) {
          aiText += `⚠️ Alerta vermelho: Suas despesas ultrapassaram suas receitas. Cuidado com o uso do cartão de crédito ou cheque especial. `;
        } else if (saldo > 0) {
          aiText += `✅ Parabéns! Suas contas estão no azul. `;
        }

        if (maiorCategoria) {
          aiText += `Notei que o seu ralo de dinheiro este mês foi com **${maiorCategoria}** (R$ ${maiorValor.toFixed(2).replace('.', ',')}). Que tal tentar estabelecer um limite mais rígido para essa categoria no seu Perfil?`;
        }
      }

      const aiMsg = {
        id: (Date.now() + 1).toString(),
        role: 'ai',
        text: aiText,
        timestamp: new Date().toISOString()
      };

      const finalMessages = [...updatedMessages, aiMsg];
      setMessages(finalMessages);
      await saveChatHistory(finalMessages);

    } catch (err) {
      setMessages([...updatedMessages, { id: Date.now().toString(), role: 'ai', text: 'Desculpe, não consegui acessar seus dados no momento.', timestamp: new Date().toISOString() }]);
    } finally {
      setLoading(false);
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMsg = {
      id: Date.now().toString(),
      role: 'user',
      text: input.trim(),
      timestamp: new Date().toISOString()
    };

    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput('');
    setLoading(true);

    setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);

    try {
      await new Promise(resolve => setTimeout(resolve, 1500)); 
      const respostaIA = "Entendi! Por enquanto, eu respondo de forma automática, mas você pode usar o botão ✨ 'Analisar minhas finanças' para eu ler seus dados reais do aplicativo!";

      const aiMsg = {
        id: (Date.now() + 1).toString(),
        role: 'ai',
        text: respostaIA,
        timestamp: new Date().toISOString()
      };

      const finalMessages = [...updatedMessages, aiMsg];
      setMessages(finalMessages);
      await saveChatHistory(finalMessages);

    } catch (error) {
      setMessages([...updatedMessages, { id: Date.now().toString(), role: 'ai', text: 'Erro de conexão.', timestamp: new Date().toISOString() }]);
    } finally {
      setLoading(false);
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  const formatTime = (isoString) => {
    const date = new Date(isoString);
    return `${date.toLocaleDateString('pt-BR')} às ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className={`flex-1 ${bgMain}`}>
      <View className="max-w-3xl mx-auto w-full flex-1 flex">
        
        {/* CABEÇALHO */}
        <View className={`pt-14 pb-4 px-6 flex-row justify-between items-center border-b ${borderCard}`}>
          <View>
            <Text className={`text-2xl font-bold ${textTitle}`}>Gestor IA</Text>
            <Text className={`text-sm mt-1 ${textSub}`}>Seu conselheiro financeiro pessoal</Text>
          </View>
          <TouchableOpacity onPress={clearHistory} className={`p-2 rounded-full border ${bgCard} ${borderCard}`}>
            <Trash2 size={20} color="#ef4444" />
          </TouchableOpacity>
        </View>

        {/* ÁREA DO CHAT */}
        <ScrollView 
          ref={scrollViewRef}
          className="flex-1 px-4 py-4"
          onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
        >
          {messages.map((msg) => {
            const isUser = msg.role === 'user';
            return (
              <View key={msg.id} className={`mb-6 flex-row ${isUser ? 'justify-end' : 'justify-start'}`}>
                
                {!isUser && (
                  <View className="w-8 h-8 rounded-full bg-blue-600/20 border border-blue-500/30 items-center justify-center mr-2 mt-1">
                    <Bot size={16} color="#3b82f6" />
                  </View>
                )}

                <View className={`max-w-[80%] p-4 rounded-2xl shadow-sm ${
                  isUser 
                    ? 'bg-blue-600 rounded-tr-sm' 
                    : `${bgCard} border ${borderCard} rounded-tl-sm`
                }`}>
                  <Text className={`text-[15px] leading-6 ${isUser ? 'text-white' : textTitle}`}>
                    {msg.text}
                  </Text>
                  
                  <Text className={`text-[10px] mt-2 text-right ${isUser ? 'text-blue-200' : textSub}`}>
                    {formatTime(msg.timestamp)}
                  </Text>
                </View>

                {isUser && (
                  <View className={`w-8 h-8 rounded-full border items-center justify-center ml-2 mt-1 ${bgInput} ${borderCard}`}>
                    <UserIcon size={16} color={isDark ? '#94a3b8' : '#64748b'} />
                  </View>
                )}
              </View>
            );
          })}
          
          {loading && (
            <View className="mb-6 flex-row justify-start">
               <View className="w-8 h-8 rounded-full bg-blue-600/20 border border-blue-500/30 items-center justify-center mr-2 mt-1">
                  <Bot size={16} color="#3b82f6" />
                </View>
              <View className={`p-4 rounded-2xl rounded-tl-sm border ${bgCard} ${borderCard}`}>
                <ActivityIndicator size="small" color="#3b82f6" />
              </View>
            </View>
          )}
          
          <View className="h-4" /> 
        </ScrollView>

        {/* CHIP DE AÇÃO RÁPIDA (INSIGHT AUTOMÁTICO) */}
        <View className="px-4 py-2 flex-row justify-end">
          <TouchableOpacity 
            onPress={handleAutoInsight}
            disabled={loading}
            className={`flex-row items-center px-4 py-2 rounded-full border shadow-sm ${bgCard} ${borderCard}`}
          >
            <Sparkles size={16} color="#3b82f6" />
            <Text className={`ml-2 text-sm font-bold text-blue-500`}>Analisar minhas finanças</Text>
          </TouchableOpacity>
        </View>

        {/* BARRA DE DIGITAÇÃO */}
        <View className={`p-4 border-t ${bgCard} ${borderCard}`}>
          <View className={`flex-row items-center rounded-3xl border px-2 ${bgInput} ${borderCard}`}>
            <TextInput
              className={`flex-1 min-h-[50px] max-h-[120px] px-4 py-3 ${textTitle}`}
              placeholder="Pergunte algo ao Gestor IA..."
              placeholderTextColor={isDark ? '#64748b' : '#94a3b8'}
              multiline
              value={input}
              onChangeText={setInput}
            />
            <TouchableOpacity 
              onPress={handleSend}
              disabled={!input.trim() || loading}
              className={`w-10 h-10 rounded-full items-center justify-center mr-1 ${
                input.trim() && !loading ? 'bg-blue-600' : 'bg-slate-500/50'
              }`}
            >
              <Send size={18} color="#ffffff" style={{ marginLeft: -2, marginTop: 2 }} />
            </TouchableOpacity>
          </View>
        </View>

      </View>
    </KeyboardAvoidingView>
  );
}