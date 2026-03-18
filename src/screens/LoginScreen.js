import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { supabase } from '../services/supabase';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);

  async function handleAuth() {
    if (!email || !password) {
      Alert.alert('Erro', 'Por favor, preencha todos os campos.');
      return;
    }

    setLoading(true);
    if (isSignUp) {
      // Lógica de Cadastro
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) Alert.alert('Erro no Cadastro', error.message);
      else Alert.alert('Sucesso!', 'Verifique seu e-mail para confirmar o cadastro.');
    } else {
      // Lógica de Login
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) Alert.alert('Erro no Login', error.message);
    }
    setLoading(false);
  }

  return (
    <View className="flex-1 justify-center px-6 bg-slate-50">
      <View className="bg-white p-8 rounded-3xl shadow-sm">
        <Text className="text-3xl font-bold text-slate-800 mb-2">
          {isSignUp ? 'Criar conta' : 'Bem-vindo'}
        </Text>
        <Text className="text-slate-500 mb-8">
          {isSignUp ? 'Comece a controlar seus gastos hoje.' : 'Acesse seu painel financeiro.'}
        </Text>

        <TextInput
          placeholder="E-mail"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          className="bg-slate-100 p-4 rounded-xl mb-4 text-slate-800"
        />

        <TextInput
          placeholder="Senha"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          className="bg-slate-100 p-4 rounded-xl mb-6 text-slate-800"
        />

        <TouchableOpacity 
          onPress={handleAuth}
          disabled={loading}
          className="bg-blue-600 p-4 rounded-xl items-center"
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-white font-semibold text-lg">
              {isSignUp ? 'Cadastrar' : 'Entrar'}
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity 
          onPress={() => setIsSignUp(!isSignUp)}
          className="mt-6 items-center"
        >
          <Text className="text-blue-600">
            {isSignUp ? 'Já tem uma conta? Entre aqui' : 'Não tem conta? Cadastre-se'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}