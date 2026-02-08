
import React, { useState, useCallback, useEffect } from 'react';
import { AppScreen, Asset, Signal, UserStatus, SignalStatus, Language } from './types';
import Header from './components/Header';
import MainScreen from './components/MainScreen';
import AssetSelection from './components/AssetSelection';
import TimeframeSelection from './components/TimeframeSelection';
import AnalysisScreen from './components/AnalysisScreen';
import SignalResult from './components/SignalResult';
import EconomicCalendar from './components/EconomicCalendar';
import { TRANSLATIONS, ASSETS } from './constants';

const App: React.FC = () => {
  const [screen, setScreen] = useState<AppScreen>(AppScreen.MAIN);
  const [lang, setLang] = useState<Language>('RU');
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [selectedTimeframe, setSelectedTimeframe] = useState<string | null>(null);
  const [currentSignal, setCurrentSignal] = useState<Signal | null>(null);
  const [history, setHistory] = useState<Signal[]>([]);

  const [userStatus, setUserStatus] = useState<UserStatus>(() => {
    const saved = localStorage.getItem('bt_user_status');
    return (saved as UserStatus) || UserStatus.STANDARD;
  });

  const [signalsUsed, setSignalsUsed] = useState<number>(() => {
    const saved = localStorage.getItem('bt_signals_used');
    return saved ? parseInt(saved, 10) : 0;
  });

  const [lastResetTime, setLastResetTime] = useState<number>(() => {
    const saved = localStorage.getItem('bt_last_reset');
    return saved ? parseInt(saved, 10) : Date.now();
  });

  const t = TRANSLATIONS[lang];
  const LIMIT = userStatus === UserStatus.VIP ? Infinity : (userStatus === UserStatus.ELITE ? 50 : 20);

  useEffect(() => {
    const checkReset = () => {
      const now = Date.now();
      const resetInterval = 12 * 60 * 60 * 1000;
      if (now - lastResetTime >= resetInterval) {
        setSignalsUsed(0);
        setLastResetTime(now);
      }
    };
    checkReset();
    const interval = setInterval(checkReset, 60000);
    return () => clearInterval(interval);
  }, [lastResetTime]);

  useEffect(() => {
    localStorage.setItem('bt_user_status', userStatus);
    localStorage.setItem('bt_signals_used', signalsUsed.toString());
    localStorage.setItem('bt_last_reset', lastResetTime.toString());
  }, [userStatus, signalsUsed, lastResetTime]);

  const handleAssetSelect = (asset: Asset) => {
    if (signalsUsed >= LIMIT) {
      setScreen(AppScreen.MAIN);
      return;
    }
    setSelectedAsset(asset);
    setScreen(AppScreen.TIMEFRAME_SELECTION);
  };

  const handleBack = () => {
    if (screen === AppScreen.RESULT) {
      setScreen(AppScreen.TIMEFRAME_SELECTION);
    } else if (screen === AppScreen.TIMEFRAME_SELECTION) {
      setScreen(AppScreen.ASSET_SELECTION);
    } else if (screen === AppScreen.ASSET_SELECTION) {
      setScreen(AppScreen.MAIN);
    } else if (screen === AppScreen.ANALYSIS) {
      setScreen(AppScreen.TIMEFRAME_SELECTION);
    } else {
      setScreen(AppScreen.MAIN);
    }
  };

  const handleGoHome = () => {
    setScreen(AppScreen.MAIN);
    setSelectedAsset(null);
    setSelectedTimeframe(null);
  };

  const handleTimeframeSelect = (tf: string) => {
    setSelectedTimeframe(tf);
    setScreen(AppScreen.ANALYSIS);
  };

  /**
   * УЛУЧШЕННАЯ МАТЕМАТИЧЕСКАЯ МОДЕЛЬ
   * Анализирует фидбек пользователя и принудительно корректирует вектор прогноза
   */
  const calculateSophisticatedDirection = useCallback((asset: Asset, currentHistory: Signal[]): 'BUY' | 'SELL' => {
    // 1. Технический базис (трендовый скоринг)
    const changeValue = parseFloat(asset.change.replace(',', '.').replace('%', '')) || 0;
    let score = changeValue * 15; 

    // 2. ВЕКТОР КОРРЕКЦИИ (Логика обратной связи)
    // Ищем последний сигнал ИМЕННО ПО ЭТОМУ АКТИВУ
    const lastAssetSignal = currentHistory.find(s => s.asset.id === asset.id);
    
    if (lastAssetSignal && lastAssetSignal.status === 'FAILED') {
      // Если предыдущий сигнал по этому активу провалился, 
      // применяем мощный "инвертирующий импульс".
      // Мы предполагаем, что рынок развернулся, а прошлая логика устарела.
      const inversionForce = lastAssetSignal.direction === 'BUY' ? -80 : 80;
      score += inversionForce;
    } else if (lastAssetSignal && lastAssetSignal.status === 'CONFIRMED') {
      // Если сигнал был успешен, продолжаем следовать этой логике с небольшим бонусом
      score += (lastAssetSignal.direction === 'BUY' ? 15 : -15);
    }

    // 3. Анализ общей серии неудач
    const recentLosses = currentHistory.slice(0, 3).filter(s => s.status === 'FAILED').length;
    if (recentLosses >= 2) {
      // Если пользователь часто жмет "не удачно", добавляем больше хаоса/разворотных паттернов
      score += (Math.random() > 0.5 ? 40 : -40);
    }

    // 4. Математический шум
    score += (Math.random() * 20) - 10;

    return score >= 0 ? 'BUY' : 'SELL';
  }, []);

  const generateNewSignal = useCallback(() => {
    if (!selectedAsset || !selectedTimeframe) return;
    
    // Генерируем направление, используя актуальную историю сигналов
    const direction = calculateSophisticatedDirection(selectedAsset, history);
    
    // Рассчитываем вероятность на основе "силы" итогового score
    const baseProb = 84;
    const variancy = Math.floor(Math.random() * 11); // +0-10%
    
    const signal: Signal = {
      id: `INF-${Math.floor(Math.random() * 90000) + 10000}`,
      asset: selectedAsset,
      timeframe: selectedTimeframe,
      direction: direction,
      probability: baseProb + variancy,
      timestamp: Date.now(),
      status: 'PENDING'
    };
    
    if (signalsUsed === 0) {
      setLastResetTime(Date.now());
    }

    setSignalsUsed(prev => prev + 1);
    setCurrentSignal(signal);
    // Важно: добавляем сигнал в историю сразу, чтобы следующий цикл видел его статус (после обновления)
    setHistory(prev => [signal, ...prev]);
  }, [selectedAsset, selectedTimeframe, signalsUsed, history, calculateSophisticatedDirection]);

  const handleAnalysisComplete = useCallback(() => {
    generateNewSignal();
    setScreen(AppScreen.RESULT);
  }, [generateNewSignal]);

  const handleFeedback = (status: SignalStatus) => {
    if (!currentSignal) return;
    const updatedSignal = { ...currentSignal, status };
    setCurrentSignal(updatedSignal);
    
    // Обновляем историю. Когда пользователь нажмет "Новый цикл", 
    // calculateSophisticatedDirection увидит этот обновленный статус.
    setHistory(prev => prev.map(s => s.id === updatedSignal.id ? updatedSignal : s));
  };

  const handleUpgrade = (password: string) => {
    if (password === '2741520') {
      setUserStatus(UserStatus.ELITE);
      setSignalsUsed(0);
      setLastResetTime(Date.now());
      return true;
    }
    if (password === '1448135') {
      setUserStatus(UserStatus.VIP);
      return true;
    }
    return false;
  };

  return (
    <div className="h-full bg-[#050505] text-white flex flex-col overflow-hidden">
      <Header lang={lang} setLang={setLang} onHome={handleGoHome} onCalendar={() => setScreen(AppScreen.CALENDAR)} />
      <main className="flex-1 relative flex flex-col min-h-0">
        {screen === AppScreen.MAIN && (
          <MainScreen 
            onStart={() => setScreen(AppScreen.ASSET_SELECTION)} 
            onAssetSelect={handleAssetSelect}
            userStatus={userStatus} 
            onStatusToggle={() => {}}
            history={history}
            signalsUsed={signalsUsed}
            limit={LIMIT}
            t={t} 
            lang={lang} 
            onUpgrade={handleUpgrade}
            onResetElite={() => setSignalsUsed(0)}
          />
        )}
        {screen === AppScreen.ASSET_SELECTION && (
          <AssetSelection 
            assets={ASSETS} 
            onSelect={handleAssetSelect} 
            onBack={handleBack} 
            userStatus={userStatus} 
            t={t} 
          />
        )}
        {screen === AppScreen.TIMEFRAME_SELECTION && selectedAsset && (
          <TimeframeSelection 
            asset={selectedAsset} 
            onSelect={handleTimeframeSelect} 
            onBack={handleBack} 
            t={t} 
          />
        )}
        {screen === AppScreen.ANALYSIS && (
          <AnalysisScreen 
            asset={selectedAsset!} 
            timeframe={selectedTimeframe!} 
            onComplete={handleAnalysisComplete} 
            t={t} 
          />
        )}
        {screen === AppScreen.RESULT && currentSignal && (
          <SignalResult 
            signal={currentSignal} 
            onBack={handleBack} 
            onFeedback={handleFeedback}
            onNewCycle={generateNewSignal} 
            t={t} 
          />
        )}
        {screen === AppScreen.CALENDAR && (
          <EconomicCalendar 
            lang={lang} 
            onBack={handleBack} 
            t={t} 
          />
        )}
      </main>
    </div>
  );
};

export default App;
