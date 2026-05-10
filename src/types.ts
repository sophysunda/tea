import { Timestamp } from 'firebase/firestore';

export interface Category {
  id: string;
  name: string;
  order: number;
}

export interface Prices {
  M?: number;
  L?: number;
}

export interface Product {
  id: string;
  name: string;
  categoryId: string;
  prices: Prices;
  description?: string;
  image?: string;
  isRecommended?: boolean;
  isAvailable?: boolean;
}

export interface OrderItem {
  productId: string;
  name: string;
  size: 'M' | 'L';
  sugar: string;
  ice: string;
  price: number;
  quantity: number;
  additions: { name: string; price: number }[];
}

export type OrderStatus = 'pending' | 'preparing' | 'ready' | 'completed' | 'cancelled';

export interface Order {
  id: string;
  customerName: string;
  phoneNumber: string;
  items: OrderItem[];
  totalAmount: number;
  status: OrderStatus;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
  }
}
