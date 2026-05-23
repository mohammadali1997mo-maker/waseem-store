
export const getCurrency = (): 'USD' | 'SYP' => {
  return (localStorage.getItem('wsimCurrency') as 'USD' | 'SYP') || 'USD';
};

export const getExchangeRate = (): number => {
  return 15000; // This could be fetched from Firebase in a real app
};

export const formatPrice = (usdPrice: string | number, currency: 'USD' | 'SYP' = getCurrency()): string => {
  const price = typeof usdPrice === 'string' ? parseFloat(usdPrice) : usdPrice;
  if (currency === 'SYP') {
    return (Math.round(price * getExchangeRate())).toLocaleString() + ' ل.س';
  }
  return '$' + price.toLocaleString();
};
