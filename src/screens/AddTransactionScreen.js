import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { supabase } from '../services/supabase';
import { useNavigation } from '@react-navigation/native';

export default function AddTransactionScreen() {
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [loading, setLoading] = useState(false);
  const [aiModal, setAiModal] = useState(null);
  const navigation = useNavigation();

  // 1. Busca as categorias do banco para o seletor
  useEffect(() => {
    async function fetchCategories() {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name');
      
      if (error) {
        console.error("Erro ao carregar categorias:", error.message);
      } else {
        setCategories(data);
      }
    }
    fetchCategories();
  }, []);

  // 2. Função de Salvar Gasto
  async function handleSave() {
    // Validação básica
    if (!amount || !selectedCategory) {
      Alert.alert('Ops!', 'Por favor, informe o valor e selecione uma categoria.');
      return;
    }

    setLoading(true);

    try {
      // Busca o usuário logado de forma segura
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) throw new Error("Usuário não autenticado.");

      // Insere na tabela transactions
      const { error } = await supabase.from('transactions').insert([
        {
          user_id: user.id,
          category_id: selectedCategory,
          // Converte vírgula em ponto e garante que seja um número válido
          amount: parseFloat(String(amount).replace(',', '.')) || 0,
          description: description.trim(),
        }
      ]);

      if (error) throw error;

      // --- MÁGICA DA IA AQUI ---
      const amountValue = parseFloat(String(amount).replace(',', '.')) || 0;
      const categoryName = categories.find(c => c.id === selectedCategory)?.name || 'Geral';
      let message = 'Gasto registrado com sucesso.';
      let title = 'Sucesso!';
      try {
        const { generateFinancialAlert } = await import('../services/aiService');
        const aiMessage = await generateFinancialAlert(categoryName, amountValue, 500);
        title = 'Conselho da IA 🤖';
        message = aiMessage;
      } catch (err) {
        console.warn('IA indisponível:', err);
      }
      // Mostra em Modal (funciona em todas as plataformas, incluindo web)
      setAiModal({ title, message });

    } catch (error) {
      console.error("Erro completo:", error);
      Alert.alert('Erro ao salvar', error.message || 'Ocorreu um erro inesperado.');
    } finally {
      setLoading(false);
    }
  }

  function dismissAiModal() {
    setAiModal(null);
    setAmount('');
    setDescription('');
    setSelectedCategory(null);
    navigation.navigate('Início');
  }

  return (
    <ScrollView className="flex-1 bg-white p-6">
      <Modal
        visible={!!aiModal}
        transparent
        animationType="fade"
        onRequestClose={dismissAiModal}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={dismissAiModal}
          className="flex-1 justify-center items-center bg-black/50 px-6"
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl p-6 w-full max-w-sm"
          >
            <Text className="text-lg font-bold text-slate-800 mb-2">
              {aiModal?.title ?? ''}
            </Text>
            <Text className="text-slate-600 mb-6">{aiModal?.message ?? ''}</Text>
            <TouchableOpacity
              onPress={dismissAiModal}
              className="bg-blue-600 py-3 rounded-xl items-center"
            >
              <Text className="text-white font-semibold">OK</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      <Text className="text-2xl font-bold text-slate-800 mt-10 mb-6">Novo Gasto</Text>

      {/* Input de Valor */}
      <View className="bg-slate-50 p-6 rounded-3xl mb-6 border border-slate-100">
        <Text className="text-slate-500 mb-2 uppercase text-xs font-bold tracking-widest">Valor do Gasto</Text>
        <View className="flex-row items-center">
          <Text className="text-3xl font-bold text-slate-400 mr-2">R$</Text>
          <TextInput
            className="text-4xl font-bold text-blue-600 flex-1"
            placeholder="0,00"
            keyboardType="numeric"
            value={amount}
            onChangeText={setAmount}
            autoFocus
          />
        </View>
      </View>

      {/* Seleção de Categoria */}
      <Text className="text-slate-800 font-semibold mb-3">Selecione a Categoria</Text>
      <View className="flex-row flex-wrap mb-6">
        {categories.map((cat) => (
          <TouchableOpacity
            key={cat.id}
            onPress={() => setSelectedCategory(cat.id)}
            className={`mr-2 mb-2 px-4 py-2 rounded-full border ${
              selectedCategory === cat.id 
                ? 'bg-blue-600 border-blue-600' 
                : 'bg-white border-slate-200'
            }`}
          >
            <Text className={selectedCategory === cat.id ? 'text-white' : 'text-slate-600'}>
              {cat.name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Descrição */}
      <Text className="text-slate-800 font-semibold mb-3">Descrição (opcional)</Text>
      <TextInput
        className="bg-slate-50 p-4 rounded-2xl mb-10 border border-slate-100 text-slate-800"
        placeholder="Ex: Almoço no shopping, Gasolina..."
        value={description}
        onChangeText={setDescription}
      />

      {/* Botão de Ação */}
      <TouchableOpacity
        onPress={handleSave}
        disabled={loading}
        className={`p-5 rounded-2xl items-center shadow-lg ${
          loading ? 'bg-slate-300' : 'bg-blue-600 shadow-blue-200'
        }`}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text className="text-white font-bold text-lg">Confirmar Gasto</Text>
        )}
      </TouchableOpacity>
      
      <View className="h-20" /> 
    </ScrollView>
  );
}