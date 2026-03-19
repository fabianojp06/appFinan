import React, { useState, useEffect, useCallback, useContext } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, RefreshControl, Linking, Alert, ActivityIndicator } from 'react-native';
import { TrendingUp, TrendingDown, Newspaper, ChevronRight } from 'lucide-react-native';
import { ThemeContext } from '../contexts/ThemeContext'; 

const FALLBACK_IMAGES = [
  'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&q=80&w=200&h=200', 
  'https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?auto=format&fit=crop&q=80&w=200&h=200', 
  'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?auto=format&fit=crop&q=80&w=200&h=200', 
  'https://images.unsplash.com/photo-1633158829585-23ba8f7c8caf?auto=format&fit=crop&q=80&w=200&h=200', 
  'https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?auto=format&fit=crop&q=80&w=200&h=200'  
];

// FUNÇÃO ATUALIZADA: Resolve o problema de sincronia de horário
const formatarDataBR = (dataISO) => {
  if (!dataISO) return '';
  
  try {
    // A API envia "YYYY-MM-DD HH:mm:ss". 
    // Substituímos o espaço por 'T' e adicionamos 'Z' para garantir que o JS trate como UTC puro.
    const dataISOAjustada = dataISO.replace(' ', 'T') + 'Z';
    const data = new Date(dataISOAjustada);

    // Caso a conversão falhe, tentamos o método padrão
    if (isNaN(data.getTime())) {
      return new Date(dataISO).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    }

    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(data);
  } catch (e) {
    return dataISO;
  }
};

const extractImageFromHtml = (html) => {
  if (!html) return null;
  const match = html.match(/<img[^>]+src="([^">]+)"/);
  return match ? match[1] : null;
};

export default function NewsScreen() {
  const { isDark } = useContext(ThemeContext); 
  const [marketData, setMarketData] = useState([]);
  const [newsData, setNewsData] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const bgMain = isDark ? 'bg-slate-950' : 'bg-slate-50';
  const bgCard = isDark ? 'bg-slate-900' : 'bg-white';
  const borderCard = isDark ? 'border-slate-800' : 'border-slate-200';
  const textTitle = isDark ? 'text-white' : 'text-slate-900';
  const textSub = isDark ? 'text-slate-400' : 'text-slate-500';
  const textMarketTitle = isDark ? 'text-slate-200' : 'text-slate-800';

  const loadAllData = useCallback(async () => {
    setRefreshing(true);
    try {
      const [cryptoRes, tradMarketRes, newsRes] = await Promise.all([
        fetch('https://api.coingecko.com/api/v3/coins/markets?vs_currency=brl&ids=bitcoin,ethereum&order=market_cap_desc').catch(() => null),
        fetch('https://api.hgbrasil.com/finance?format=json-cors').catch(() => null),
        fetch('https://api.rss2json.com/v1/api.json?rss_url=https://www.infomoney.com.br/feed/').catch(() => null)
      ]);

      let newMarketData = [];

      if (tradMarketRes && tradMarketRes.ok) {
        const hgData = await tradMarketRes.json();
        if (hgData && hgData.results) {
          const usd = hgData.results.currencies.USD;
          const ibov = hgData.results.stocks.IBOVESPA;
          newMarketData.push({
            id: 'ibov', name: 'Ibovespa', symbol: 'IBOV',
            price: `${ibov.points.toLocaleString('pt-BR')} pts`,
            change: `${ibov.variation > 0 ? '+' : ''}${ibov.variation.toFixed(2)}%`,
            isUp: ibov.variation >= 0,
          });
          newMarketData.push({
            id: 'usd', name: 'Dólar Comercial', symbol: 'USD',
            price: `R$ ${usd.buy.toFixed(2).replace('.', ',')}`,
            change: `${usd.variation > 0 ? '+' : ''}${usd.variation.toFixed(2)}%`,
            isUp: usd.variation >= 0,
          });
        }
      }

      if (cryptoRes && cryptoRes.ok) {
        const cryptoData = await cryptoRes.json();
        const cryptoFormatted = cryptoData.map(coin => ({
          id: coin.id,
          name: coin.name,
          symbol: coin.symbol.toUpperCase(),
          price: `R$ ${coin.current_price.toLocaleString('pt-BR')}`,
          change: `${coin.price_change_percentage_24h > 0 ? '+' : ''}${coin.price_change_percentage_24h.toFixed(2)}%`,
          isUp: coin.price_change_percentage_24h >= 0,
        }));
        newMarketData = [...newMarketData, ...cryptoFormatted];
      }
      setMarketData(newMarketData);

      if (newsRes && newsRes.ok) {
        const data = await newsRes.json();
        if (data.status === 'ok') {
          const formattedNews = data.items.slice(0, 10).map((item, index) => {
            let imageUrl = item.thumbnail || extractImageFromHtml(item.content) || extractImageFromHtml(item.description);
            if (!imageUrl || imageUrl.includes('blank')) {
              imageUrl = FALLBACK_IMAGES[index % FALLBACK_IMAGES.length];
            }
            return {
              id: String(index),
              title: item.title,
              source: 'InfoMoney',
              time: formatarDataBR(item.pubDate), // Aplicando a correção de fuso
              image: imageUrl,
              link: item.link
            };
          });
          setNewsData(formattedNews);
        }
      }
    } catch (error) {
      console.warn("Erro ao buscar dados.", error);
    }
    setRefreshing(false);
  }, []);

  useEffect(() => { loadAllData(); }, [loadAllData]);

  const openLink = async (url) => {
    const supported = await Linking.canOpenURL(url);
    if (supported) await Linking.openURL(url);
    else Alert.alert('Erro', 'Não foi possível abrir a notícia.');
  };

  return (
    <ScrollView 
      className={`flex-1 ${bgMain}`}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadAllData} tintColor="#3b82f6" />}
    >
      <View className="max-w-3xl mx-auto w-full pb-10">
        
        <View className="pt-14 pb-6 px-6">
          <Text className={`text-2xl font-bold ${textTitle}`}>Radar do Mercado</Text>
          <Text className={`${textSub} text-sm mt-1`}>Puxe para baixo para atualizar em tempo real.</Text>
        </View>

        <View className="mb-8">
          <View className="px-6 mb-3 flex-row justify-between items-center">
            <Text className={`text-lg font-bold ${textMarketTitle}`}>Cotações Globais</Text>
            {refreshing && <ActivityIndicator size="small" color="#3b82f6" />}
          </View>
          
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="pl-6 pr-4">
            {marketData.map((item) => (
              <View key={item.id} className={`${bgCard} border ${borderCard} rounded-2xl p-4 mr-4 w-44 shadow-lg`}>
                <View className="flex-row justify-between items-start mb-2">
                  <Text className={`${textSub} text-xs font-bold`}>{item.symbol}</Text>
                  <View className={`flex-row items-center px-2 py-1 rounded-md ${item.isUp ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                    {item.isUp ? <TrendingUp size={12} color="#22c55e" /> : <TrendingDown size={12} color="#ef4444" />}
                    <Text className={`text-[10px] font-bold ml-1 ${item.isUp ? 'text-green-500' : 'text-red-500'}`}>{item.change}</Text>
                  </View>
                </View>
                <Text className={`${textTitle} font-extrabold text-lg mt-1`}>{item.price}</Text>
                <Text className={`${textSub} text-xs mt-1`}>{item.name}</Text>
              </View>
            ))}
            <View className="w-6" />
          </ScrollView>
        </View>

        <View className="px-6">
          <Text className={`text-lg font-bold ${textMarketTitle} mb-4`}>Últimas Notícias</Text>
          
          {newsData.map((item) => (
            <TouchableOpacity 
              key={item.id} 
              onPress={() => openLink(item.link)}
              className={`${bgCard} rounded-3xl border ${borderCard} p-4 mb-4 flex-row items-center shadow-md active:opacity-70`}
            >
              <View className="w-20 h-20 rounded-2xl bg-slate-800 mr-4 overflow-hidden">
                <Image source={{ uri: item.image }} className="w-full h-full" resizeMode="cover" />
              </View>
              
              <View className="flex-1 pr-2">
                <View className="flex-row items-center mb-1">
                  <View className="bg-blue-500/20 px-2 py-1 rounded-md flex-row items-center mr-2">
                    <Newspaper size={10} color="#3b82f6" />
                    <Text className="text-[10px] text-blue-400 font-bold ml-1 uppercase">Mercado</Text>
                  </View>
                  <Text className={`text-xs ${textSub}`}>{item.time}</Text>
                </View>
                
                <Text className={`${textTitle} font-bold text-sm leading-5 mb-2`} numberOfLines={2}>
                  {item.title}
                </Text>
                <Text className={`text-xs ${textSub} font-semibold`}>{item.source}</Text>
              </View>
              <ChevronRight size={20} color={isDark ? "#475569" : "#cbd5e1"} />
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}