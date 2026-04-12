export interface ShopSettingsPayload {
  shopName: string;
  currency: "MAD" | "EUR" | "USD";
  phone: string;
  address: string;
  receiptFooter: string;
  defaultCashFund: number;
}

export type LocalShopSettings = ShopSettingsPayload;

export const DEFAULT_SHOP_SETTINGS: ShopSettingsPayload = {
  shopName: "Mawad Scan",
  currency: "MAD",
  phone: "",
  address: "",
  receiptFooter: "Merci pour votre visite.",
  defaultCashFund: 500,
};

const STORAGE_KEYS = {
  shopName: "shop_name",
  currency: "shop_currency",
  phone: "shop_phone",
  address: "shop_address",
  receiptFooter: "shop_receipt_footer",
  defaultCashFund: "shop_default_cash_fund",
} as const;

export function normalizeShopSettings(
  input?: Partial<ShopSettingsPayload> | null
): ShopSettingsPayload {
  const rawFund = Number(input?.defaultCashFund);
  return {
    shopName: input?.shopName?.trim() || DEFAULT_SHOP_SETTINGS.shopName,
    currency: input?.currency || DEFAULT_SHOP_SETTINGS.currency,
    phone: input?.phone?.trim() || "",
    address: input?.address?.trim() || "",
    receiptFooter: input?.receiptFooter?.trim() || DEFAULT_SHOP_SETTINGS.receiptFooter,
    defaultCashFund: rawFund > 0 ? rawFund : DEFAULT_SHOP_SETTINGS.defaultCashFund,
  };
}

export function readLocalShopSettings(): LocalShopSettings {
  if (typeof window === "undefined") {
    return DEFAULT_SHOP_SETTINGS;
  }

  return normalizeShopSettings({
    shopName: localStorage.getItem(STORAGE_KEYS.shopName) || DEFAULT_SHOP_SETTINGS.shopName,
    currency:
      (localStorage.getItem(STORAGE_KEYS.currency) as ShopSettingsPayload["currency"]) ||
      DEFAULT_SHOP_SETTINGS.currency,
    phone: localStorage.getItem(STORAGE_KEYS.phone) || DEFAULT_SHOP_SETTINGS.phone,
    address: localStorage.getItem(STORAGE_KEYS.address) || DEFAULT_SHOP_SETTINGS.address,
    receiptFooter:
      localStorage.getItem(STORAGE_KEYS.receiptFooter) ||
      DEFAULT_SHOP_SETTINGS.receiptFooter,
    defaultCashFund:
      Number(localStorage.getItem(STORAGE_KEYS.defaultCashFund)) ||
      DEFAULT_SHOP_SETTINGS.defaultCashFund,
  });
}

export function saveLocalShopSettings(settings: LocalShopSettings) {
  if (typeof window === "undefined") {
    return;
  }

  const normalized = normalizeShopSettings(settings);

  localStorage.setItem(STORAGE_KEYS.shopName, normalized.shopName);
  localStorage.setItem(STORAGE_KEYS.currency, normalized.currency);
  localStorage.setItem(STORAGE_KEYS.phone, normalized.phone);
  localStorage.setItem(STORAGE_KEYS.address, normalized.address);
  localStorage.setItem(STORAGE_KEYS.receiptFooter, normalized.receiptFooter);
  localStorage.setItem(STORAGE_KEYS.defaultCashFund, String(normalized.defaultCashFund));
  window.dispatchEvent(new Event("storage"));
  window.dispatchEvent(new Event("shop-settings-updated"));
}
