import React, { useState, useEffect, useCallback, useContext } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ScrollView, ActivityIndicator, Modal } from 'react-native';
import { Trash2, Pencil, Moon, Sun, User as UserIcon, Save } from 'lucide-react-native';
import { supabase } from '../services/supabase';
import { useFocusEffect } from '@react-navigation/native';
import { ThemeContext } from '../contexts/ThemeContext';
import { UserContext } from '../contexts/UserContext'; 

const PRESET_COLORS = ['#ef4444', '#3b82f6', '#22c55e', '#eab308', '#a855f7', '#ec4899'];

export default function ProfileScreen() {
  const { isDark, toggleTheme } = useContext(ThemeContext);
  const { displayName, updateDisplayName } = useContext(UserContext); // Puxa dados do contexto global

  const [newCategoryName, setNewCategoryName] = useState('');
  const [monthlyLimit, setMonthlyLimit] = useState(''); 
  const [selectedColor, setSelectedColor] = useState(PRESET_COLORS[0]);
  const [categoryType, setCategoryType] = useState('expense'); 
  const [loading, setLoading] = useState(false);
  
  const [myCategories, setMyCategories] = useState([]);

  // Estados para edição de nome do perfil local
  const [tempDisplayName, setTempDisplayName] = useState('');
  const [updatingProfile, setUpdatingProfile] = useState(false);

  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editId, setEditId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editLimit, setEditLimit] = useState('');
  const [editColor, setEditColor] = useState(PRESET_COLORS[0]);
  const [editType, setEditType] = useState('expense');
  const [updating, setUpdating] = useState(false);

  // Sincroniza o nome do contexto com o input local sempre que o contexto mudar
  useEffect(() => {
    if (displayName) {
      setTempDisplayName(displayName);
    }
  }, [displayName]);

  // Função para salvar o nome de exibição de forma reativa[cite: 9]
  const handleSaveProfile = async () => {
    const nomeLimpo = tempDisplayName.trim();
    
    if (!nomeLimpo) {
      Alert.alert('Atenção', 'O nome não pode estar vazio.');
      return;
    }

    setUpdatingProfile(true);
    try {
      // Chama a função do contexto que faz o setDisplayName interno[cite: 9]
      const result = await updateDisplayName(nomeLimpo);
      
      if (result.success) {
        Alert.alert('Sucesso!', 'Seu perfil foi atualizado.');
      } else {
        throw new Error(result.error || 'Erro desconhecido');
      }
    } catch (error) {
      Alert.alert('Erro ao salvar', error.message);
    } finally {
      setUpdatingProfile(false);
    }
  };

  // VARIAVEIS DE COR DINÂMICAS[cite: 9]
  const bgMain = isDark ? 'bg-slate-950' : 'bg-slate-50';
  const bgCard = isDark ? 'bg-slate-900' : 'bg-white';
  const bgInput = isDark ? 'bg-slate-800' : 'bg-slate-100';
  const borderCard = isDark ? 'border-slate-800' : 'border-slate-200';
  const borderInput = isDark ? 'border-slate-700' : 'border-slate-300';
  const textTitle = isDark ? 'text-white' : 'text-slate-900';
  const textSub = isDark ? 'text-slate-400' : 'text-slate-500';

  const fetchMyCategories = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data, error } = await supabase.from('categories').select('*').eq('user_id', user.id).order('name');
      if (!error && data) setMyCategories(data);
    }
  };

  useFocusEffect(useCallback(() => { fetchMyCategories(); }, []));

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) { Alert.alert('Atenção', 'Digite um nome para a categoria.'); return; }
    const parsedLimit = parseFloat(monthlyLimit.replace(',', '.')) || 0;
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado.');
      const { error } = await supabase.from('categories').insert([{ name: newCategoryName.trim(), color: selectedColor, user_id: user.id, monthly_limit: parsedLimit, type: categoryType }]);
      if (error) throw error;
      Alert.alert('Sucesso!', 'Categoria criada com sucesso.');
      setNewCategoryName(''); setMonthlyLimit(''); setSelectedColor(PRESET_COLORS[0]); setCategoryType('expense'); 
      fetchMyCategories();
    } catch (error) { Alert.alert('Erro ao salvar', error.message); } finally { setLoading(false); }
  };

  const handleEditClick = (cat) => {
    setEditId(cat.id); setEditName(cat.name); setEditLimit(String(cat.monthly_limit || 0).replace('.', ',')); setEditColor(cat.color || PRESET_COLORS[0]); setEditType(cat.type || 'expense');
    setEditModalVisible(true);
  };

  const handleUpdateCategory = async () => {
    if (!editName.trim()) { Alert.alert('Atenção', 'O nome não pode ficar vazio.'); return; }
    const parsedLimit = parseFloat(editLimit.replace(',', '.')) || 0;
    setUpdating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado.');
      const { error } = await supabase.from('categories').update({ name: editName.trim(), color: editColor, monthly_limit: parsedLimit, type: editType }).eq('id', editId).eq('user_id', user.id);
      if (error) throw error;
      Alert.alert('Sucesso!', 'Categoria atualizada.');
      setEditModalVisible(false); fetchMyCategories();        
    } catch (error) { Alert.alert('Erro ao atualizar', error.message); } finally { setUpdating(false); }
  };

  const handleDeleteCategory = async (id) => {
    Alert.alert('Excluir Categoria', 'Tem certeza? Os gastos vinculados a ela ficarão sem categoria.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Excluir', style: 'destructive', onPress: async () => {
          const { error } = await supabase.from('categories').delete().eq('id', id);
          if (error) Alert.alert('Erro', error.message); else fetchMyCategories();
        }
      }
    ]);
  };

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) Alert.alert('Erro', error.message);
  };

  return (
    <>
      <Modal visible={editModalVisible} transparent animationType="fade" onRequestClose={() => setEditModalVisible(false)}>
        <View className="flex-1 justify-center items-center bg-black/60 px-6">
          <View className={`rounded-3xl p-6 w-full max-w-sm border shadow-2xl ${bgCard} ${borderCard}`}>
            <Text className={`text-xl font-bold mb-4 ${textTitle}`}>Editar Categoria</Text>
            <View className={`flex-row p-1 rounded-xl mb-4 border ${bgInput} ${borderInput}`}>
              <TouchableOpacity onPress={() => setEditType('expense')} className={`flex-1 py-2 rounded-lg items-center ${editType === 'expense' ? 'bg-red-500' : ''}`}>
                <Text className={`font-bold ${editType === 'expense' ? 'text-white' : textSub}`}>Despesa</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setEditType('income')} className={`flex-1 py-2 rounded-lg items-center ${editType === 'income' ? 'bg-green-600' : ''}`}>
                <Text className={`font-bold ${editType === 'income' ? 'text-white' : textSub}`}>Receita</Text>
              </TouchableOpacity>
            </View>

            <Text className={`${textSub} font-semibold mb-2`}>Nome</Text>
            <TextInput className={`p-3 rounded-xl mb-4 border ${bgInput} ${borderInput} ${textTitle}`} value={editName} onChangeText={setEditName} />

            <Text className={`${textSub} font-semibold mb-2`}>{editType === 'expense' ? 'Limite Mensal (R$)' : 'Meta Mensal (R$)'}</Text>
            <TextInput className={`p-3 rounded-xl mb-6 border ${bgInput} ${borderInput} ${textTitle}`} keyboardType="numeric" value={editLimit} onChangeText={setEditLimit} />

            <View className="flex-row justify-between mb-8 px-1">
              {PRESET_COLORS.map((color) => (
                <TouchableOpacity key={color} onPress={() => setEditColor(color)} className={`w-10 h-10 rounded-full items-center justify-center ${editColor === color ? 'border-4 border-slate-300' : ''}`} style={{ backgroundColor: color }} />
              ))}
            </View>
            <View className="flex-row">
              <TouchableOpacity onPress={() => setEditModalVisible(false)} className={`flex-1 py-3 border rounded-xl mr-2 items-center ${borderCard}`}>
                <Text className={`${textSub} font-semibold`}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleUpdateCategory} disabled={updating} className="flex-1 py-3 bg-blue-600 rounded-xl items-center">
                {updating ? <ActivityIndicator color="#fff" /> : <Text className="text-white font-semibold">Salvar</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <ScrollView className={`flex-1 ${bgMain} p-6`}>
        <View className="max-w-3xl mx-auto w-full">
          
          <View className="flex-row justify-between items-center mt-10 mb-6">
            <Text className={`text-2xl font-bold ${textTitle}`}>Perfil</Text>
            <TouchableOpacity onPress={toggleTheme} className={`flex-row items-center px-4 py-2 rounded-full border ${bgCard} ${borderCard}`}>
              {isDark ? <Moon size={18} color="#eab308" /> : <Sun size={18} color="#f59e0b" />}
              <Text className={`ml-2 font-bold ${textTitle}`}>{isDark ? 'Escuro' : 'Claro'}</Text>
            </TouchableOpacity>
          </View>

          {/* SEÇÃO EDITAR PERFIL[cite: 9] */}
          <View className={`${bgCard} p-6 rounded-3xl border ${borderCard} mb-8 shadow-xl`}>
            <Text className={`text-lg font-bold ${textTitle} mb-2`}>Seu Perfil</Text>
            <Text className={`${textSub} mb-6 text-sm`}>Como você quer ser chamado na tela inicial?</Text>

            <View className={`flex-row items-center ${bgInput} p-4 rounded-xl border ${borderInput}`}>
              <UserIcon size={20} color={isDark ? '#64748b' : '#94a3b8'} />
              <TextInput
                className={`flex-1 ml-3 text-base ${textTitle}`}
                value={tempDisplayName}
                onChangeText={setTempDisplayName} 
                placeholder="Digite seu nome..."
                placeholderTextColor={isDark ? '#64748b' : '#94a3b8'}
              />
            </View>

            <TouchableOpacity 
              onPress={handleSaveProfile}
              disabled={updatingProfile}
              className={`mt-6 p-4 rounded-xl flex-row justify-center items-center ${updatingProfile ? 'bg-slate-600' : 'bg-blue-600'}`}
            >
              {updatingProfile ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Save size={20} color="#fff" className="mr-2" />
                  <Text className="text-white font-bold text-lg">Salvar Nome</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* SEÇÃO: NOVA CATEGORIA[cite: 9] */}
          <View className={`p-6 rounded-3xl border mb-8 shadow-xl ${bgCard} ${borderCard}`}>
            <Text className={`text-lg font-bold mb-2 ${textTitle}`}>Nova Categoria</Text>
            <Text className={`${textSub} mb-4 text-sm`}>Defina o nome, limite e cor para seus gastos ou ganhos.</Text>

            <View className={`flex-row p-1 rounded-xl mb-6 border max-w-sm ${bgInput} ${borderInput}`}>
              <TouchableOpacity onPress={() => setCategoryType('expense')} className={`flex-1 py-3 rounded-lg items-center ${categoryType === 'expense' ? 'bg-red-500' : ''}`}>
                <Text className={`font-bold ${categoryType === 'expense' ? 'text-white' : textSub}`}>Despesa</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setCategoryType('income')} className={`flex-1 py-3 rounded-lg items-center ${categoryType === 'income' ? 'bg-green-600' : ''}`}>
                <Text className={`font-bold ${categoryType === 'income' ? 'text-white' : textSub}`}>Receita</Text>
              </TouchableOpacity>
            </View>

            <Text className={`${textSub} font-semibold mb-2`}>Nome</Text>
            <TextInput className={`p-4 rounded-xl mb-4 border ${bgInput} ${borderInput} ${textTitle}`} placeholderTextColor={isDark ? '#64748b' : '#94a3b8'} placeholder={categoryType === 'expense' ? 'Ex: Futebol, Pets...' : 'Ex: Salário, Freelance...'} value={newCategoryName} onChangeText={setNewCategoryName} />

            <Text className={`${textSub} font-semibold mb-2`}>{categoryType === 'expense' ? 'Limite Mensal (R$)' : 'Meta Mensal (R$)'}</Text>
            <TextInput className={`p-4 rounded-xl mb-6 border ${bgInput} ${borderInput} ${textTitle}`} placeholderTextColor={isDark ? '#64748b' : '#94a3b8'} placeholder="Ex: 200,00" keyboardType="numeric" value={monthlyLimit} onChangeText={setMonthlyLimit} />

            <Text className={`${textSub} font-semibold mb-3`}>Cor de Destaque</Text>
            <View className="flex-row justify-between mb-8 px-1 max-w-sm">
              {PRESET_COLORS.map((color) => (
                <TouchableOpacity key={color} onPress={() => setSelectedColor(color)} className={`w-10 h-10 rounded-full items-center justify-center ${selectedColor === color ? 'border-4 border-slate-300' : ''}`} style={{ backgroundColor: color }} />
              ))}
            </View>
            <TouchableOpacity onPress={handleCreateCategory} disabled={loading} className={`p-4 rounded-xl items-center ${loading ? 'bg-slate-700' : 'bg-blue-600'}`}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text className="text-white font-bold text-lg">Criar Categoria</Text>}
            </TouchableOpacity>
          </View>

          <View className="mb-8">
            <Text className={`text-lg font-bold mb-4 ${textTitle}`}>Minhas Categorias</Text>
            {myCategories.length === 0 ? (
              <Text className={`${textSub} text-sm`}>Você ainda não criou categorias personalizadas.</Text>
            ) : (
              <View className="flex-row flex-wrap justify-between">
                {myCategories.map((cat) => (
                  <View key={cat.id} className={`w-full md:w-[49%] p-4 rounded-2xl mb-3 flex-row items-center justify-between border ${bgCard} ${borderCard}`}>
                    <View className="flex-row items-center flex-1">
                      <View style={{ backgroundColor: cat.color }} className="w-4 h-4 rounded-full mr-3" />
                      <View>
                        <Text className={`font-bold ${textTitle}`}>{cat.name}</Text>
                        <Text className={`text-xs ${textSub}`}>{cat.type === 'income' ? 'Meta: ' : 'Limite: '} R$ {cat.monthly_limit || '0,00'}</Text>
                        <Text className={`text-[10px] font-bold mt-1 uppercase ${cat.type === 'income' ? 'text-green-400' : 'text-red-400'}`}>{cat.type === 'income' ? 'Receita' : 'Despesa'}</Text>
                      </View>
                    </View>
                    <View className="flex-row">
                      <TouchableOpacity onPress={() => handleEditClick(cat)} className={`p-2 mr-2 rounded-lg ${bgInput}`}>
                        <Pencil color="#60a5fa" size={18} />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => handleDeleteCategory(cat.id)} className={`p-2 rounded-lg ${bgInput}`}>
                        <Trash2 color="#ef4444" size={18} />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>

          <View className={`p-6 rounded-3xl border mb-10 items-center ${bgCard} ${borderCard}`}>
            <Text className={`text-lg font-bold mb-2 ${textTitle}`}>Sua Conta</Text>
            <TouchableOpacity onPress={handleSignOut} className="bg-red-500/10 border border-red-500 w-full p-4 rounded-xl items-center mt-4 max-w-sm">
              <Text className="text-red-500 font-bold text-lg">Sair do Aplicativo</Text>
            </TouchableOpacity>
          </View>
          <View className="h-10" />
        </View>
      </ScrollView>
    </>
  );
}