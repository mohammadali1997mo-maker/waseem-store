import { db } from "./firebase";
import { doc, onSnapshot } from "firebase/firestore";

let currentExchangeRate = 15000;

// Setup instant real-time subscriber for global exchange rate settings
try {
  onSnapshot(doc(db, "settings", "global"), (snap) => {
    if (snap.exists()) {
      const data = snap.data();
      if (data && typeof data.exchangeRate === 'number') {
        currentExchangeRate = data.exchangeRate;
        // Trigger currencyChange event to force-update and recalculate ALL storefront pricing renders in real time
        window.dispatchEvent(new Event('currencyChange'));
        window.dispatchEvent(new Event('exchangeRateChange'));
      }
    }
  }, (err) => {
    console.warn("Error watching global settings exchange rate:", err);
  });
} catch (error) {
  console.warn("Failed to build Firestore onSnapshot for currency settings:", error);
}

// Add window listener to sync local storage changes across components
window.addEventListener('storage', (e) => {
  if (e.key === 'local_prices' || e.key === 'local_exchange_rate' || e.key === 'price_edit_mode') {
    window.dispatchEvent(new Event('currencyChange'));
    window.dispatchEvent(new Event('exchangeRateChange'));
    window.dispatchEvent(new Event('localPricesChange'));
  }
});

export const getCurrency = (): 'USD' | 'SYP' => {
  return (localStorage.getItem('wsimCurrency') as 'USD' | 'SYP') || 'USD';
};

export const getExchangeRate = (): number => {
  return currentExchangeRate;
};

export const getLocalPrice = (key: string): number | null => {
  return null;
};

export const formatPrice = (usdPrice: string | number, currency: 'USD' | 'SYP' = getCurrency()): string => {
  const price = typeof usdPrice === 'string' ? parseFloat(usdPrice) : usdPrice;
  if (currency === 'SYP') {
    return (Math.round(price * getExchangeRate())).toLocaleString() + ' ل.س';
  }
  return '$' + price.toLocaleString();
};
