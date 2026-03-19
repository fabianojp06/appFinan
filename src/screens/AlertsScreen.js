import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { MessageCircle, Bot } from 'lucide-react-native';
import { supabase } from '../services/supabase';
import { generateManagerReport } from '../services/aiService';

export default function AlertsScreen() {
  const [insight, setInsight] = useState('');
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState({ total: 0, categories: [] });

  // Busca e resumo ao focar na tela
  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      async function fetchSummary() {
        setLoading(true);
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) return;

          const { data: transactions, error } = await supabase
            .from('transactions')
            .select('id, amount, category_id, categories (name)')
            .eq('user_id', user.id);

          if (error) {
            setSummary({ total: 0, categories: [] });
            return;
          }

          // Agrupar gastos por categoria e somar total
          let total = 0;
          const categoryMap = {};
          for (const t of transactions) {
            total += Number(t.amount);

            const catName = t.categories?.name || 'Sem categoria';
            if (!categoryMap[catName]) categoryMap[catName] = 0;
            categoryMap[catName] += Number(t.amount);
          }
          const categoriesSummary = Object.keys(categoryMap).map(name => ({
            name,
            spent: categoryMap[name],
          }));

          if (isActive) setSummary({ total, categories: categoriesSummary });
        } finally {
          setLoading(false);
        }
      }
      fetchSummary();
      return () => { isActive = false; };
    }, [])
  );

  // Gera análise da IA
  async function handleRequestAnalysis() {
    setLoading(true);
    try {
      const report = await generateManagerReport(summary.total, summary.categories);
      setInsight(report);
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView className="flex-1 bg-slate-950 px-6" contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text className="text-2xl font-bold text-white mt-8 mb-4">Seu Gestor IA</Text>
      <View className="w-full bg-slate-900 rounded-3xl shadow p-6 mb-8 min-h-[150px] flex-row items-start">
        {insight ? (
          <>
            <MessageCircle size={30} color="#60a5fa" className="mr-4" />
            <Text className="text-slate-100 text-base flex-1">{insight}</Text>
          </>
        ) : (
          <>
            <Bot size={28} color="#64748b" className="mr-3" />
            <Text className="text-slate-400 text-base flex-1">Peça sua análise financeira do mês.</Text>
          </>
        )}
      </View>
      <TouchableOpacity
        onPress={handleRequestAnalysis}
        disabled={loading}
        className={`w-full bg-blue-600 py-4 rounded-2xl items-center mb-4 ${loading ? 'opacity-70' : ''}`}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text className="text-white font-bold text-lg">Gerar Análise Profunda</Text>
        )}
      </TouchableOpacity>
      <View className="h-10" />
    </ScrollView>
  );
}