import { NativeWindStyleSheet } from "nativewind";

NativeWindStyleSheet.setOutput({
  default: "native",
});
import React, { useState, useEffect } from 'react';
import { View } from 'react-native';
import { supabase } from './src/services/supabase';
import LoginScreen from './src/screens/LoginScreen';
import AppNavigator from './src/navigation/AppNavigator';

export default function App() {
  const [session, setSession] = useState(null);

  useEffect(() => {
    // Verifica sessão atual
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    // Escuta mudanças na autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Se não houver sessão, mostra Login. Se houver, mostra o Navegador principal (Tabs)
  return (
    <View style={{ flex: 1 }}>
      {session && session.user ? <AppNavigator /> : <LoginScreen />}
    </View>
  );
}