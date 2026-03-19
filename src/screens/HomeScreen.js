import React, { useCallback, useState, useMemo, useContext } from 'react';
import { View, Text, ScrollView, RefreshControl, ActivityIndicator, TouchableOpacity, Pressable, TextInput, Dimensions, Alert, Modal } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Trash2, Pencil, Sun, Moon } from 'lucide-react-native';
import { PieChart } from 'react-native-chart-kit';
import { supabase } from '../services/supabase';
import { ThemeContext } from '../contexts/ThemeContext'; 
import { UserContext } from '../contexts/UserContext'; // Importando o contexto do usuário

export default function HomeScreen() {
  const { isDark, toggleTheme } = useContext(ThemeContext); 
  const { displayName, loading: userLoading } = useContext(UserContext); // Consumindo o nome e estado de carregamento

  const [transactions, setTransactions] = useState([]);
  const [saldoTotal, setSaldoTotal] = useState(0);
  const [totalReceitas, setTotalReceitas] = useState(0);
  const [totalDespesas, setTotalDespesas] = useState(0);
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [viewType, setViewType] = useState('pizza');
  const [deleteModal, setDeleteModal] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [editAmount, setEditAmount] = useState('');

  // --- CORES DINÂMICAS DO TEMA ---
  const bgMain = isDark ? 'bg-slate-950' : 'bg-slate-50';
  const bgCard = isDark ? 'bg-slate-900' : 'bg-white';
  const bgInput = isDark ? 'bg-slate-800' : 'bg-slate-100';
  const borderCard = isDark ? 'border-slate-800' : 'border-slate-200';
  const textTitle = isDark ? 'text-white' : 'text-slate-800';
  const textSub = isDark ? 'text-slate-400' : 'text-slate-500';
  const textItem = isDark ? 'text-slate-200' : 'text-slate-700';
  const borderItem = isDark ? 'border-slate-800/60' : 'border-slate-100';
  
  const bgToggleActive = isDark ? 'bg-slate-800' : 'bg-slate-200';
  const borderToggleActive = isDark ? 'border-slate-700' : 'border-slate-300';
  const borderToggleInactive = isDark ? 'border-slate-800' : 'border-slate-200';

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        setTransactions([]); setSaldoTotal(0); return;
      }

      const { data, error } = await supabase
        .from('transactions')
        .select('*, categories(id, name, color, monthly_limit, type)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      const txs = data || [];
      setTransactions(txs);

      let calcReceitas = 0;
      let calcDespesas = 0;

      txs.forEach(t => {
        const valor = Number(t.amount) || 0;
        const isIncome = t.type === 'income' || t.categories?.type === 'income';
        
        if (isIncome) calcReceitas += valor;
        else calcDespesas += valor;
      });

      setTotalReceitas(calcReceitas);
      setTotalDespesas(calcDespesas);
      setSaldoTotal(calcReceitas - calcDespesas);

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { fetchTransactions(); }, [fetchTransactions]));
  const onRefresh = useCallback(() => { setRefreshing(true); fetchTransactions(); }, [fetchTransactions]);

  const openEditModal = useCallback((t) => {
    setEditingTransaction(t);
    setEditAmount(String(Number(t.amount) || 0).replace('.', ','));
    setIsEditModalVisible(true);
  }, []);

  const confirmDelete = async () => {
    if (!deleteModal?.id) return;
    const idToDelete = deleteModal.id;
    setDeleting(true); 
    try {
      const { error } = await supabase.from('transactions').delete().eq('id', idToDelete);
      if (error) throw error;
      setTransactions((prev) => prev.filter((t) => t.id !== idToDelete));
      setDeleteModal(null);
      fetchTransactions();
    } catch (err) {
      Alert.alert('Erro', err.message);
    } finally {
      setDeleting(false);
    }
  };

  const formatCurrency = useCallback((v) => `R$ ${v.toFixed(2).replace('.', ',')}`, []);

  const chartDataDespesas = useMemo(() => {
    const byCat = {};
    const despesas = transactions.filter(t => t.type !== 'income' && t.categories?.type !== 'income');

    despesas.forEach((t) => {
      const catName = t.categories?.name || 'Geral';
      const catLimit = t.categories?.monthly_limit ?? 0;
      const catColor = t.categories?.color || '#38bdf8';
      
      if (!byCat[catName]) byCat[catName] = { name: catName, value: 0, limit: catLimit, color: catColor };
      byCat[catName].value += Number(t.amount) || 0;
    });

    return Object.values(byCat).filter((c) => c.value > 0).map((c) => ({
      name: c.name,
      population: c.value,
      limit: c.limit,
      color: c.color,
      legendFontColor: isDark ? '#e2e8f0' : '#475569',
      legendFontSize: 11,
    }));
  }, [transactions, isDark]);

  const handleSaveEdit = async () => {
    const parsed = parseFloat(editAmount.replace(',', '.')) || 0;
    if (!parsed) return;
    try {
      const { error } = await supabase.from('transactions').update({ amount: parsed }).eq('id', editingTransaction.id);
      if (error) throw error;
      setIsEditModalVisible(false);
      fetchTransactions();
    } catch (error) {
      Alert.alert('Erro', error.message);
    }
  };

  const screenWidth = Dimensions.get('window').width;
  const chartWidth = screenWidth > 1024 ? 400 : (screenWidth > 768 ? (screenWidth / 2) - 60 : screenWidth - 48);

  const listReceitas = transactions.filter(t => t.type === 'income' || t.categories?.type === 'income');
  const listDespesas = transactions.filter(t => t.type !== 'income' && t.categories?.type !== 'income');

  return (
    <>
      <Modal visible={!!deleteModal} transparent animationType="fade" onRequestClose={() => setDeleteModal(null)}>
        <View className="flex-1 justify-center items-center bg-black/70 px-6">
          <View className={`rounded-2xl p-6 w-full max-w-sm border shadow-2xl ${bgCard} ${borderCard}`}>
            <Text className={`text-lg font-bold mb-2 ${textTitle}`}>Excluir lançamento</Text>
            <Text className={`${textSub} mb-6`}>Tem certeza que deseja excluir?</Text>
            <View className="flex-row">
              <TouchableOpacity onPress={() => setDeleteModal(null)} className={`flex-1 py-3 border rounded-xl mr-2 items-center ${borderCard}`}><Text className={textTitle}>Cancelar</Text></TouchableOpacity>
              <TouchableOpacity onPress={confirmDelete} className="flex-1 py-3 bg-red-600 rounded-xl items-center">{deleting ? <ActivityIndicator color="#fff" /> : <Text className="text-white">Excluir</Text>}</TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={isEditModalVisible} transparent animationType="fade" onRequestClose={() => setIsEditModalVisible(false)}>
        <View className="flex-1 justify-center items-center bg-black/70 px-6">
          <View className={`rounded-2xl p-6 w-full max-w-sm border shadow-2xl ${bgCard} ${borderCard}`}>
            <Text className={`text-lg font-bold mb-4 ${textTitle}`}>Editar valor</Text>
            <TextInput className={`p-3 rounded-xl mb-6 border ${bgInput} ${borderCard} ${textTitle}`} keyboardType="numeric" value={editAmount} onChangeText={setEditAmount} />
            <View className="flex-row">
              <TouchableOpacity onPress={() => setIsEditModalVisible(false)} className={`flex-1 py-3 border rounded-xl mr-2 items-center ${borderCard}`}><Text className={textTitle}>Cancelar</Text></TouchableOpacity>
              <TouchableOpacity onPress={handleSaveEdit} className="flex-1 py-3 bg-blue-600 rounded-xl items-center"><Text className="text-white">Salvar</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <ScrollView className={`flex-1 ${bgMain}`} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3b82f6" />}>
        <View className="max-w-5xl mx-auto w-full"> 
          
          {/* TOP: CABEÇALHO COM BOAS-VINDAS PERSONALIZADAS */}
          <View className="pt-14 pb-4 px-6 flex-row justify-between items-center">
            <View className="flex-1 pr-2">
              <Text className={`text-sm font-semibold uppercase tracking-widest ${textSub}`}>Seu Painel</Text>
              <Text className={`text-3xl font-extrabold mt-1 ${textTitle}`}>
                Olá, {userLoading ? '...' : displayName}! 👋
              </Text>
            </View>
            <TouchableOpacity onPress={toggleTheme} className={`p-2 rounded-full border shadow-sm ${bgCard} ${borderCard}`}>
              {isDark ? <Sun size={20} color="#f59e0b" /> : <Moon size={20} color="#64748b" />}
            </TouchableOpacity>
          </View>
          
          {/* PAINEL DE SALDO */}
          <View className="px-6 mb-8">
            <View className={`rounded-3xl p-6 border shadow-xl ${bgCard} ${borderCard}`}>
              <Text className={`text-sm font-semibold uppercase tracking-widest ${textSub}`}>Saldo Atual</Text>
              <Text className={`text-4xl font-extrabold mt-1 ${saldoTotal >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {formatCurrency(saldoTotal)}
              </Text>
              <View className={`flex-row justify-between mt-4 pt-4 border-t ${borderCard}`}>
                <View>
                  <Text className={`text-xs uppercase tracking-wider ${textSub}`}>Total de Ganhos</Text>
                  <Text className="text-sm font-bold text-green-500">↑ {formatCurrency(totalReceitas)}</Text>
                </View>
                <View className="items-end">
                  <Text className={`text-xs uppercase tracking-wider ${textSub}`}>Total de Gastos</Text>
                  <Text className="text-sm font-bold text-red-500">↓ {formatCurrency(totalDespesas)}</Text>
                </View>
              </View>
            </View>
          </View>

          {/* DUAS COLUNAS */}
          <View className="px-6 mb-4">
            <View className="flex-row flex-wrap justify-between">
              
              <View className="w-full md:w-[48%] mb-8">
                <Text className={`text-lg font-bold text-green-500 mb-4 border-b pb-2 ${isDark ? 'border-green-900/30' : 'border-green-200'}`}>Receitas</Text>
                
                <View className={`rounded-3xl border overflow-hidden min-h-[100px] ${bgCard} ${borderCard}`}>
                  {listReceitas.length === 0 ? (
                    <Text className={`${textSub} text-sm p-6 text-center italic`}>Nenhuma receita lançada.</Text>
                  ) : (
                    listReceitas.map((t) => (
                      <View key={t.id} className={`flex-row items-center px-4 py-4 border-b ${borderItem}`}>
                        <View className="flex-1 pr-2">
                          <Text className={`text-sm font-bold ${textItem}`}>{t.categories?.name || 'Geral'}</Text>
                          {t.description ? <Text className={`text-[11px] mt-1 ${textSub}`}>{t.description}</Text> : null}
                        </View>
                        <View className="items-end flex-row">
                          <Text className="text-sm font-bold text-green-500 mr-3">+{formatCurrency(Number(t.amount) || 0)}</Text>
                          <Pressable onPress={() => openEditModal(t)} className="p-1"><Pencil color="#64748b" size={16} /></Pressable>
                          <Pressable onPress={() => setDeleteModal({ id: t.id })} className="p-1 ml-2"><Trash2 color="#ef4444" size={16} /></Pressable>
                        </View>
                      </View>
                    ))
                  )}
                </View>
              </View>

              <View className="w-full md:w-[48%] mb-8">
                <Text className={`text-lg font-bold text-rose-500 mb-4 border-b pb-2 ${isDark ? 'border-red-900/30' : 'border-red-200'}`}>Despesas</Text>
                
                <View className="flex-row space-x-2 mb-4">
                  <TouchableOpacity onPress={() => setViewType('pizza')} className={`flex-1 py-2 rounded-xl items-center border ${viewType === 'pizza' ? `${bgToggleActive} ${borderToggleActive}` : `bg-transparent ${borderToggleInactive}`}`}><Text className={`${isDark ? 'text-slate-300' : 'text-slate-600'} font-semibold text-xs`}>Gráfico</Text></TouchableOpacity>
                  <TouchableOpacity onPress={() => setViewType('barras')} className={`flex-1 py-2 rounded-xl items-center border ${viewType === 'barras' ? `${bgToggleActive} ${borderToggleActive}` : `bg-transparent ${borderToggleInactive}`}`}><Text className={`${isDark ? 'text-slate-300' : 'text-slate-600'} font-semibold text-xs`}>Limites</Text></TouchableOpacity>
                </View>

                <View className={`mb-6 p-4 rounded-3xl border flex items-center justify-center ${isDark ? 'bg-slate-900/50 border-slate-800/50' : 'bg-slate-50 border-slate-200'}`}>
                  {viewType === 'pizza' ? (
                    chartDataDespesas.length > 0 ? (
                      <PieChart data={chartDataDespesas} width={chartWidth} height={160} chartConfig={{ color: () => 'rgba(255, 255, 255, 1)' }} accessor="population" backgroundColor="transparent" absolute paddingLeft="0" center={[10, 0]} />
                    ) : <Text className={`${textSub} text-center py-4 text-sm`}>Nenhuma despesa para exibir.</Text>
                  ) : (
                    chartDataDespesas.map((cat) => {
                      const percent = cat.limit > 0 ? Math.min((cat.population / cat.limit) * 100, 100) : 0;
                      const isOver = cat.limit > 0 && percent >= 100;
                      return (
                        <View key={cat.name} className="mb-3 w-full">
                          <View className="flex-row items-center justify-between mb-1">
                            <Text className={`text-xs font-bold ${textItem}`}>{cat.name}</Text>
                            <Text className={`text-[10px] font-bold ${isOver ? 'text-red-500' : textSub}`}>{formatCurrency(cat.population)} / {formatCurrency(cat.limit)}</Text>
                          </View>
                          <View className={`w-full h-2 rounded-full overflow-hidden ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`}>
                            <View style={{ width: `${percent}%`, backgroundColor: isOver ? '#ef4444' : cat.color }} className="h-full rounded-full" />
                          </View>
                        </View>
                      );
                    })
                  )}
                </View>

                <View className={`rounded-3xl border overflow-hidden min-h-[100px] ${bgCard} ${borderCard}`}>
                  {listDespesas.length === 0 ? (
                    <Text className={`${textSub} text-sm p-6 text-center italic`}>Nenhuma despesa lançada.</Text>
                  ) : (
                    listDespesas.map((t) => (
                      <View key={t.id} className={`flex-row items-center px-4 py-4 border-b ${borderItem}`}>
                        <View className="flex-1 pr-2">
                          <Text className={`text-sm font-bold ${textItem}`}>{t.categories?.name || 'Geral'}</Text>
                          {t.description ? <Text className={`text-[11px] mt-1 ${textSub}`}>{t.description}</Text> : null}
                        </View>
                        <View className="items-end flex-row">
                          <Text className="text-sm font-bold text-rose-500 mr-3">-{formatCurrency(Number(t.amount) || 0)}</Text>
                          <Pressable onPress={() => openEditModal(t)} className="p-1"><Pencil color="#64748b" size={16} /></Pressable>
                          <Pressable onPress={() => setDeleteModal({ id: t.id })} className="p-1 ml-2"><Trash2 color="#ef4444" size={16} /></Pressable>
                        </View>
                      </View>
                    ))
                  )}
                </View>
              </View>

            </View>
          </View>

          <View className="h-10" />
        </View>
      </ScrollView>
    </>
  );
}