
export enum AppScreen {
  MAIN = 'MAIN',
  ASSET_SELECTION = 'ASSET_SELECTION',
  TIMEFRAME_SELECTION = 'TIMEFRAME_SELECTION',
  ANALYSIS = 'ANALYSIS',
  RESULT = 'RESULT',
  CALENDAR = 'CALENDAR'
}

export enum AssetType {
  FOREX = 'Forex',
  CRYPTO = 'Crypto',
  METALS = 'Metals'
}

export enum UserStatus {
  STANDARD = 'STANDARD',
  ELITE = 'ELITE',
  VIP = 'VIP'
}

export type Language = 'RU' | 'EN';

export interface Asset {
  id: string;
  name: string;
  price: string;
  absChange: string;
  change: string;
  type: AssetType;
  open: string;
  high: string;
  low: string;
  prev: string;
  flag: string;
  lastTick?: 'up' | 'down' | null;
}

export type SignalStatus = 'PENDING' | 'CONFIRMED' | 'FAILED';

export interface Signal {
  id: string;
  asset: Asset;
  timeframe: string;
  direction: 'BUY' | 'SELL';
  probability: number;
  timestamp: number;
  status: SignalStatus;
}
