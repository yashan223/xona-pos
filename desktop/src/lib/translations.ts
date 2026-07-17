import { useState, useEffect } from 'react';

export type Language = 'en' | 'si';

export const translations = {
  en: {
    dashboard: 'Dashboard',
    userPanel: 'User Panel',
    productsCatalog: 'Products Catalog',
    checkoutRegister: 'Checkout Register',
    transactionsLog: 'Transactions Log',
    recommendationNet: 'Recommendation Net',
    salesReports: 'Sales Reports',
    logout: 'Log Out',
    systemAdmin: 'System Admin',
    cashier: 'Cashier',
    
    // Dashboard
    revenue: 'Revenue',
    todaySales: "Today's Sales",
    productsCount: 'Products Count',
    activeCashiers: 'Active Cashiers',
    popularProducts: 'Popular Products',
    recentTransactions: 'Recent Transactions',
    
    // Products Catalog
    addProduct: 'Add Product',
    editProduct: 'Edit Product',
    deleteProduct: 'Delete Product',
    productName: 'Product Name',
    skuBarcode: 'SKU / Barcode',
    category: 'Category',
    price: 'Price',
    cost: 'Cost',
    stockQuantity: 'Stock Quantity',
    trackInventory: 'Track Inventory',
    imageUrl: 'Image URL',
    upload: 'Upload',
    description: 'Description',
    save: 'Save',
    cancel: 'Cancel',
    
    // Checkout Register
    currentBasket: 'Current Basket',
    customerLoyalty: 'Customer Loyalty',
    newCustomer: 'New Customer',
    walkInCustomer: 'Walk-in Customer',
    subtotal: 'Subtotal',
    discount: 'Discount',
    vat: 'VAT',
    totalAmount: 'Total Amount',
    completeCheckout: 'Complete Checkout',
    payMethod: 'Pay Method',
    grandTotal: 'Grand Total',
    nextCustomer: 'Next Customer',
    viewPdfBill: 'View PDF Bill',
    transactionComplete: 'Transaction Complete',
    
    // Settings
    systemSettings: 'System Settings',
    taxVatSettings: 'Tax & VAT Settings',
    enableVat: 'Enable VAT Calculation',
    enableVatDesc: 'Toggle to enable or disable VAT tax additions on checkouts.',
    vatPercentage: 'VAT Percentage',
    vatPercentageDesc: 'Specify the VAT tax rate applied to items during checkout.',
    appLanguage: 'Application Language',
    appLanguageDesc: 'Switch the POS system language between English and Sinhala.',
  },
  si: {
    dashboard: 'ප්‍රධාන පුවරුව',
    userPanel: 'පරිශීලක පුවරුව',
    productsCatalog: 'භාණ්ඩ නාමාවලිය',
    checkoutRegister: 'මුදල් ලේඛනය',
    transactionsLog: 'ගනුදෙනු වාර්තාව',
    recommendationNet: 'නිර්දේශ ජාලය',
    salesReports: 'විකුණුම් වාර්තා',
    logout: 'නික්ම යන්න',
    systemAdmin: 'පද්ධති පරිපාලක',
    cashier: 'කැෂියර්',
    
    // Dashboard
    revenue: 'ආදායම',
    todaySales: 'අද විකුණුම්',
    productsCount: 'භාණ්ඩ ප්‍රමාණය',
    activeCashiers: 'ක්‍රියාකාරී සේවකයින්',
    popularProducts: 'ජනප්‍රිය භාණ්ඩ',
    recentTransactions: 'මෑත ගනුදෙනු',
    
    // Products Catalog
    addProduct: 'භාණ්ඩයක් එක් කරන්න',
    editProduct: 'භාණ්ඩය සංස්කරණය කරන්න',
    deleteProduct: 'භාණ්ඩය මකන්න',
    productName: 'භාණ්ඩයේ නම',
    skuBarcode: 'SKU / බාර්කෝඩ්',
    category: 'ප්‍රභේදය',
    price: 'මිල',
    cost: 'පිරිවැය',
    stockQuantity: 'තොග ප්‍රමාණය',
    trackInventory: 'තොග පාලනය කරන්න',
    imageUrl: 'රූපයේ සබැඳිය (URL)',
    upload: 'අප්ලෝඩ් කරන්න',
    description: 'විස්තරය',
    save: 'සුරකින්න',
    cancel: 'අවලංගු කරන්න',
    
    // Checkout Register
    currentBasket: 'වත්මන් කූඩය',
    customerLoyalty: 'පාරිභෝගික ලෝයල්ටි',
    newCustomer: 'නව පාරිභෝගිකයා',
    walkInCustomer: 'පැමිණි පාරිභෝගිකයා',
    subtotal: 'අනු එකතුව',
    discount: 'වට්ටම්',
    vat: 'වැට් බද්ද (VAT)',
    totalAmount: 'මුළු මුදල',
    completeCheckout: 'ගෙවීම් සම්පූර්ණ කරන්න',
    payMethod: 'ගෙවීම් ක්‍රමය',
    grandTotal: 'මුළු එකතුව',
    nextCustomer: 'ඊළඟ පාරිභෝගිකයා',
    viewPdfBill: 'PDF බිල්පත බලන්න',
    transactionComplete: 'ගනුදෙනුව සාර්ථකයි',
    
    // Settings
    systemSettings: 'පද්ධති සැකසුම්',
    taxVatSettings: 'බදු සහ වැට් සැකසුම්',
    enableVat: 'වැට් බදු එකතු කරන්න',
    enableVatDesc: 'ගෙවීම් සඳහා වැට් බද්ද සක්‍රිය හෝ අක්‍රිය කරන්න.',
    vatPercentage: 'වැට් බදු ප්‍රතිශතය',
    vatPercentageDesc: 'ගෙවීම් වලදී එකතු කරන වැට් බදු ප්‍රතිශතය ඇතුළත් කරන්න.',
    appLanguage: 'භාෂාව (Language)',
    appLanguageDesc: 'පද්ධතියේ භාෂාව ඉංග්‍රීසි සහ සිංහල අතර වෙනස් කරන්න.',
  }
};

export const getLanguage = (): Language => {
  const saved = localStorage.getItem('appLanguage');
  return (saved === 'si' ? 'si' : 'en') as Language;
};

export const useTranslation = () => {
  const [lang, setLang] = useState<Language>(getLanguage());
  
  useEffect(() => {
    const handleLangChange = () => {
      setLang(getLanguage());
    };
    window.addEventListener('language_changed', handleLangChange);
    return () => {
      window.removeEventListener('language_changed', handleLangChange);
    };
  }, []);

  const t = (key: keyof typeof translations.en) => {
    return translations[lang][key] || translations.en[key] || String(key);
  };

  const setLanguage = (newLang: Language) => {
    localStorage.setItem('appLanguage', newLang);
    window.dispatchEvent(new CustomEvent('language_changed'));
  };

  return { t, lang, setLanguage };
};
