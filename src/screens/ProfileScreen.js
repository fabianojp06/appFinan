import React from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { supabase } from '../services/supabase';

export default function ProfileScreen() {
  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) Alert.alert('Erro', error.message);
  };

  return (
    <View className="flex-1 bg-white p-6 justify-center">
      <View className="bg-slate-50 p-8 rounded-3xl items-center border border-slate-100">
        <Text className="text-xl font-bold text-slate-800 mb-2">Sua Conta</Text>
        <Text className="text-slate-500 mb-8 text-center">Gerencie suas configurações e alertas de IA.</Text>
        
        <TouchableOpacity 
          onPress={handleSignOut}
          className="bg-red-500 w-full p-4 rounded-2xl items-center shadow-lg shadow-red-200"
        >
          <Text className="text-white font-bold text-lg">Sair do Aplicativo</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

