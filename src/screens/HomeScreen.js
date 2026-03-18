import React, { useCallback, useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  Pressable,
  TextInput,
  Dimensions,
  Alert,
  Modal,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Trash2, Pencil } from 'lucide-react-native';
import { PieChart } from 'react-native-chart-kit';
import { supabase } from '../services/supabase';

const TOTAL_LIMIT = 500;
const NEON_COLORS = [
  'rgba(59, 130, 246, 1)',
  'rgba(249, 115, 22, 1)',
  'rgba(239, 68, 68, 1)',
  'rgba(34, 197, 94, 1)',
  'rgba(168, 85, 247, 1)',
  'rgba(236, 72, 153, 1)',
];
const chartConfig = {
  backgroundColor: 'transparent',
  color: () => 'rgba(148, 163, 184, 0.8)',
  labelColor: () => '#e2e8f0',
};

export default function HomeScreen() {
  const [transactions, setTransactions] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [viewType, setViewType] = useState('pizza'); // 'pizza' | 'barras'
  const [deleteModal, setDeleteModal] = useState(null); // { id } | null
  const [deleteError, setDeleteError] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [editAmount, setEditAmount] = useState('');

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setTransactions([]);
        setTotal(0);
        return;
      }

      const { data, error } = await supabase
        .from('transactions')
        .select(
          `
          id,
          amount,
          description,
          created_at,
          categories (
            name,
            color
          )
        `.replace(/\s+/g, ' ')
        )
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Erro ao carregar transações:', error.message);
        setTransactions([]);
        setTotal(0);
        return;
      }

      setTransactions(data || []);
      const totalAmount =
        data?.reduce((acc, t) => acc + (Number(t.amount) || 0), 0) || 0;
      setTotal(totalAmount);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchTransactions();
    }, [fetchTransactions])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchTransactions();
  }, [fetchTransactions]);

  const openEditModal = useCallback((transaction) => {
    if (!transaction) return;
    setEditingTransaction(transaction);
    const numericAmount = Number(transaction.amount) || 0;
    const stringAmount = String(numericAmount).replace('.', ',');
    setEditAmount(stringAmount);
    setIsEditModalVisible(true);
  }, []);

  const handleDeletePress = useCallback((id) => {
    setDeleteError(null);
    setDeleteModal({ id });
  }, []);

  const confirmDelete = useCallback(async () => {
    if (!deleteModal?.id) return;
    const id = deleteModal.id;
    setDeleting(true);
    setDeleteError(null);
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error('Usuário não autenticado.');

      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      // Atualização imediata: remove da lista e recalcula total
      const deleted = transactions.find((t) => t.id === id);
      const amountToSubtract = deleted ? Number(deleted.amount) || 0 : 0;
      setTransactions((prev) => prev.filter((t) => t.id !== id));
      setTotal((prev) => prev - amountToSubtract);
      setDeleteModal(null);
    } catch (err) {
      console.error('Erro ao excluir:', err);
      setDeleteError(err.message || 'Não foi possível excluir.');
    } finally {
      setDeleting(false);
    }
  }, [deleteModal, transactions]);

  const formatCurrency = useCallback((v) => `R$ ${v.toFixed(2).replace('.', ',')}`, []);

  const formatDate = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
    });
  };

  const chartData = useMemo(() => {
    const byCat = {};
    transactions.forEach((t) => {
      const cat = t.categories?.name || 'Geral';
      if (!byCat[cat]) byCat[cat] = { name: cat, value: 0 };
      byCat[cat].value += Number(t.amount) || 0;
    });
    return Object.values(byCat)
      .filter((c) => c.value > 0)
      .map((c, i) => ({
        name: `${c.name} - ${formatCurrency(c.value)}`,
        population: c.value,
        color: NEON_COLORS[i % NEON_COLORS.length],
        legendFontColor: '#e2e8f0',
        legendFontSize: 11,
      }));
  }, [transactions, formatCurrency]);

  const handleSaveEdit = useCallback(async () => {
    if (!editingTransaction) return;
    const raw = String(editAmount || '').trim();
    if (!raw) {
      Alert.alert('Valor inválido', 'Informe um valor para o lançamento.');
      return;
    }

    const parsed = parseFloat(raw.replace(',', '.')) || 0;
    if (Number.isNaN(parsed)) {
      Alert.alert('Valor inválido', 'Não foi possível interpretar o valor informado.');
      return;
    }

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error('Usuário não autenticado.');

      const { error } = await supabase
        .from('transactions')
        .update({ amount: parsed })
        .eq('id', editingTransaction.id)
        .eq('user_id', user.id);

      if (error) throw error;

      // Atualiza lista localmente para feedback imediato
      setTransactions((prev) =>
        prev.map((t) =>
          t.id === editingTransaction.id ? { ...t, amount: parsed } : t
        )
      );

      // Recalcula total localmente
      setTotal((prev) => {
        const old = Number(editingTransaction.amount) || 0;
        return prev - old + parsed;
      });

      setIsEditModalVisible(false);
      setEditingTransaction(null);
      setEditAmount('');

      // Garante sincronização com backend
      fetchTransactions();
    } catch (error) {
      console.error('Erro ao editar lançamento:', error);
      Alert.alert('Erro ao salvar', error.message || 'Não foi possível atualizar o lançamento.');
    }
  }, [editingTransaction, editAmount, fetchTransactions]);

  const screenWidth = Dimensions.get('window').width;

  return (
    <>
      {/* Modal de confirmação de exclusão */}
      <Modal
        visible={!!deleteModal}
        transparent
        animationType="fade"
        onRequestClose={() => !deleting && setDeleteModal(null)}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => {
            if (!deleting) {
              setDeleteModal(null);
              setDeleteError(null);
            }
          }}
          className="flex-1 justify-center items-center bg-black/50 px-6"
        >
          <View
            onStartShouldSetResponder={() => true}
            className="bg-slate-800 rounded-2xl p-6 w-full max-w-sm border border-slate-600"
          >
            <Text className="text-lg font-bold text-white mb-2">Excluir lançamento</Text>
            <Text className="text-slate-300 mb-6">Tem certeza que deseja excluir?</Text>
            {deleteError && (
              <Text className="text-red-400 text-sm mb-4">{deleteError}</Text>
            )}
            <View className="flex-row">
              <TouchableOpacity
                onPress={() => { setDeleteModal(null); setDeleteError(null); }}
                disabled={deleting}
                className="flex-1 py-3 rounded-xl items-center border border-slate-600 mr-2"
              >
                <Text className="text-slate-300 font-semibold">Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={confirmDelete}
                disabled={deleting}
                className="flex-1 py-3 rounded-xl items-center bg-red-600"
              >
                {deleting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text className="text-white font-semibold">Excluir</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Modal de edição de valor */}
      <Modal
        transparent
        visible={isEditModalVisible}
        animationType="fade"
        onRequestClose={() => setIsEditModalVisible(false)}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setIsEditModalVisible(false)}
          className="flex-1 justify-center items-center bg-black/50 px-6"
        >
          <View
            onStartShouldSetResponder={() => true}
            className="bg-slate-900 rounded-2xl p-6 w-full max-w-sm border border-slate-700"
          >
            <Text className="text-lg font-bold text-white mb-2">
              Editar valor do lançamento
            </Text>
            <Text className="text-slate-400 text-xs mb-4">
              Informe o novo valor para este gasto.
            </Text>
            <View className="bg-slate-800 rounded-xl px-4 py-3 mb-6 border border-slate-700">
              <Text className="text-[11px] text-slate-400 uppercase tracking-[2px] mb-1">
                Novo valor (R$)
              </Text>
              <View className="flex-row items-center">
                <Text className="text-slate-500 mr-2 text-base">R$</Text>
                <TextInput
                  className="flex-1 text-white text-base"
                  keyboardType="numeric"
                  placeholder="0,00"
                  placeholderTextColor="#64748b"
                  value={editAmount}
                  onChangeText={setEditAmount}
                />
              </View>
            </View>
            <View className="flex-row">
              <TouchableOpacity
                onPress={() => setIsEditModalVisible(false)}
                className="flex-1 py-3 rounded-xl items-center border border-slate-600 mr-2"
              >
                <Text className="text-slate-300 font-semibold">Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSaveEdit}
                className="flex-1 py-3 rounded-xl items-center bg-blue-600"
              >
                <Text className="text-white font-semibold">Salvar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      <ScrollView
        className="flex-1 bg-slate-900"
        refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Header */}
      <View className="pt-14 pb-6 px-6 bg-slate-900 flex-row items-center justify-between">
        <View>
          <Text className="text-xs text-slate-400 uppercase tracking-[3px]">
            Visão Geral
          </Text>
          <Text className="text-2xl font-bold text-white mt-1">
            Seu Painel Financeiro
          </Text>
        </View>
      </View>

      {/* Toggle visualização */}
      <View className="px-6 mb-3 flex-row space-x-2">
        <TouchableOpacity
          onPress={() => setViewType('pizza')}
          className={`flex-1 py-2 rounded-2xl items-center border ${
            viewType === 'pizza'
              ? 'bg-blue-600 border-blue-600'
              : 'bg-slate-800 border-slate-700'
          }`}
        >
          <Text className={`font-semibold ${viewType === 'pizza' ? 'text-white' : 'text-slate-300'}`}>Pizza</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setViewType('barras')}
          className={`flex-1 py-2 rounded-2xl items-center border ${
            viewType === 'barras'
              ? 'bg-blue-600 border-blue-600'
              : 'bg-slate-800 border-slate-700'
          }`}
        >
          <Text className={`font-semibold ${viewType === 'barras' ? 'text-white' : 'text-slate-300'}`}>Barras</Text>
        </TouchableOpacity>
      </View>

      {/* Gráfico ou Barras */}
      <View className="px-6 mb-6">
        {loading && chartData.length === 0 ? (
          <View className="py-12 items-center">
            <ActivityIndicator color="#64748b" />
          </View>
        ) : viewType === 'pizza' ? (
          chartData.length === 0 ? (
            <View className="p-6 items-center">
              <Text className="text-sm text-slate-400">Sem dados para mostrar gráfico.</Text>
            </View>
          ) : (
            <PieChart
              data={chartData}
              width={screenWidth - 48}
              height={220}
              chartConfig={chartConfig}
              accessor="population"
              backgroundColor="transparent"
              paddingLeft="15"
              absolute
              hasLegend
              legendPosition="bottom"
            />
          )
        ) : (
          <View className="space-y-4">
            {chartData.length === 0 ? (
              <Text className="text-sm text-slate-400 text-center">Sem dados para mostrar barras.</Text>
            ) : (
              chartData.map((cat) => {
                const percent = Math.min((cat.population / TOTAL_LIMIT) * 100, 100);
                const isOver = percent > 90;
                return (
                  <View key={cat.name}>
                    <View className="flex-row items-center justify-between mb-1">
                      <Text className="text-sm text-slate-200 font-semibold">{cat.name}</Text>
                      <Text
                        className={`text-xs font-bold ${
                          isOver ? 'text-red-400' : 'text-slate-400'
                        }`}
                      >
                        {formatCurrency(cat.population)} / {formatCurrency(TOTAL_LIMIT)}
                      </Text>
                    </View>
                    <View className="w-full h-5 bg-slate-800 rounded-xl overflow-hidden">
                      <View
                        style={{
                          width: `${percent}%`,
                          backgroundColor: isOver ? '#ef4444' : cat.color || '#38bdf8',
                        }}
                        className="h-5 rounded-xl"
                      />
                    </View>
                  </View>
                );
              })
            )}
          </View>
        )}
      </View>

      {/* Card principal de saldo */}
      <View className="px-6 -mt-2 mb-6">
        <View className="bg-gradient-to-br from-blue-500 via-indigo-500 to-slate-900 rounded-3xl p-6 shadow-2xl shadow-blue-900/40 border border-white/5">
          <Text className="text-xs font-semibold text-slate-100/70 uppercase tracking-[3px]">
            Total de Gastos
          </Text>
          <View className="flex-row items-baseline mt-3">
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-4xl font-extrabold text-white">
                {formatCurrency(total)}
              </Text>
            )}
          </View>

          <View className="flex-row mt-4 space-x-2">
            <View className="flex-1 bg-white/10 rounded-2xl px-4 py-3 border border-white/10">
              <Text className="text-[11px] text-slate-100/70 uppercase tracking-[2px]">
                Lançamentos
              </Text>
              <Text className="text-lg font-semibold text-white mt-1">
                {transactions.length}
              </Text>
            </View>
            <View className="flex-1 bg-black/20 rounded-2xl px-4 py-3 border border-white/10">
              <Text className="text-[11px] text-slate-100/70 uppercase tracking-[2px]">
                Atualização
              </Text>
              <Text className="text-sm font-medium text-slate-100 mt-1">
                Puxe para atualizar
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Últimos lançamentos */}
      <View className="px-6 mb-4">
        <View className="flex-row items-center justify-between mb-3">
          <Text className="text-sm font-semibold text-slate-200">
            Últimos lançamentos
          </Text>
          <Text className="text-xs text-slate-400">
            {transactions.length > 0
              ? `Exibindo ${transactions.length}`
              : 'Nenhum lançamento'}
          </Text>
        </View>

        <View className="bg-slate-900/60 rounded-3xl border border-slate-700/80 overflow-hidden">
          {loading && transactions.length === 0 ? (
            <View className="py-10 items-center justify-center">
              <ActivityIndicator color="#64748b" />
              <Text className="text-xs text-slate-400 mt-3">
                Carregando seus últimos gastos...
              </Text>
            </View>
          ) : transactions.length === 0 ? (
            <View className="py-10 items-center justify-center px-6">
              <Text className="text-sm font-medium text-slate-200 mb-1">
                Nenhum gasto registrado ainda
              </Text>
              <Text className="text-xs text-slate-500 text-center">
                Use a tela de novo gasto para começar a registrar suas
                movimentações.
              </Text>
            </View>
          ) : (
            transactions.map((t) => {
              const categoryName = t.categories?.name || 'Geral';
              const amount = Number(t.amount) || 0;
              const isHigh = amount >= 300;

              return (
                <View
                  key={t.id}
                  className="flex-row items-center px-4 py-3 border-b border-slate-800/80 last:border-b-0"
                >
                  <View className="w-10 h-10 rounded-2xl bg-slate-800/80 items-center justify-center mr-3">
                    <Text className="text-xs font-semibold text-slate-100">
                      {categoryName.charAt(0).toUpperCase()}
                    </Text>
                  </View>

                  <View className="flex-1">
                    <Text className="text-sm font-semibold text-slate-100">
                      {categoryName}
                    </Text>
                    {!!t.description && (
                      <Text
                        className="text-xs text-slate-400 mt-0.5"
                        numberOfLines={1}
                      >
                        {t.description}
                      </Text>
                    )}
                  </View>

                  <View className="items-end">
                    <View className="flex-row items-center">
                      <Text
                        className={`text-sm font-semibold mr-2 ${
                          isHigh ? 'text-rose-400' : 'text-slate-100'
                        }`}
                      >
                        {formatCurrency(amount)}
                      </Text>
                      <Pressable
                        onPress={() => openEditModal(t)}
                        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                        style={({ pressed }) => ({
                          opacity: pressed ? 0.6 : 1,
                          padding: 8,
                          marginRight: -4,
                        })}
                      >
                        <Pencil color="#60a5fa" size={18} />
                      </Pressable>
                      <Pressable
                        onPress={() => handleDeletePress(t.id)}
                        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                        style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1, padding: 8, margin: -8 })}
                      >
                        <Trash2 color="#ef4444" size={20} />
                      </Pressable>
                    </View>
                    <Text className="text-[11px] text-slate-500 mt-0.5">
                      {formatDate(t.created_at)}
                    </Text>
                  </View>
                </View>
              );
            })
          )}
        </View>
      </View>

      <View className="h-10" />
    </ScrollView>
    </>
  );
}
