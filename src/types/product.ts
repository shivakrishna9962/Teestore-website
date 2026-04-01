export interface Product {
  _id?: string;
  title: string;
  description: string;
  price: number; // in cents
  images: string[];
  category: string;
  sizes: string[];
  colors: string[];
  featured: boolean;
  active: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface InventoryVariant {
  _id?: string;
  product: string;
  size: string;
  color: string;
  stock: number;
  lowStockThreshold: number;
  updatedAt?: Date;
}
