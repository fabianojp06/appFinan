import React, { createContext, useState, useEffect } from 'react';
import { supabase } from '../services/supabase';

export const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [displayName, setDisplayName] = useState('Usuário');
  const [loading, setLoading] = useState(true);

  const fetchProfileName = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data, error } = await supabase
          .from('profiles')
          .select('display_name')
          .eq('id', user.id)
          .single();

        if (!error && data?.display_name) {
          setDisplayName(data.display_name);
        }
      }
    } catch (error) {
      console.log("Erro ao buscar nome:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfileName();
  }, []);

  const updateDisplayName = async (newName) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não logado");

      // 1. Atualiza no Supabase
      const { error } = await supabase
        .from('profiles')
        .upsert({ 
          id: user.id, 
          display_name: newName, 
          updated_at: new Date().toISOString() 
        });

      if (error) throw error;

      // 2. ATUALIZAÇÃO FORÇADA DO ESTADO (Isso faz a Home mudar na hora)
      setDisplayName(newName);
      
      return { success: true };
    } catch (error) {
      console.error("Erro no Contexto:", error);
      return { success: false, error: error.message };
    }
  };

  return (
    <UserContext.Provider value={{ displayName, loading, updateDisplayName, fetchProfileName }}>
      {children}
    </UserContext.Provider>
  );
};