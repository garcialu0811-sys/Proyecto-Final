import mongoose, { Schema, Document } from 'mongoose';

export interface IProduct extends Document {
  name: string;
  description: string;
  price: number;
  stock: number;
  category: string;
  sku: string;
  imageUrl: string;
  qrCode: string;
  isActive: boolean;
  createdAt: Date;
}

const ProductSchema = new Schema<IProduct>({
  name: { type: String, required: true },
  description: { type: String, required: true },
  price: { type: Number, required: true },
  stock: { type: Number, required: true },
  category: { type: String, required: true },
  sku: { type: String, required: true, unique: true },
  imageUrl: { type: String, required: true },
  qrCode: { type: String, required: true },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
});

export interface IForumPost extends Document {
  title: string;
  content: string;
  category: 'SUGERENCIA' | 'DUDA' | 'RESENA' | 'GENERAL';
  authorId: string;
  authorName: string;
  createdAt: Date;
  isHidden: boolean;
  likes: string[];
}

const ForumPostSchema = new Schema<IForumPost>({
  title: { type: String, required: true },
  content: { type: String, required: true },
  category: { type: String, enum: ['SUGERENCIA', 'DUDA', 'RESENA', 'GENERAL'], required: true },
  authorId: { type: String, required: true },
  authorName: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  isHidden: { type: Boolean, default: false },
  likes: { type: [String], default: [] },
});

export interface IForumReply extends Document {
  postId: string;
  content: string;
  authorId: string;
  authorName: string;
  parentId?: string;
  createdAt: Date;
  isHidden: boolean;
}

const ForumReplySchema = new Schema<IForumReply>({
  postId: { type: String, required: true },
  content: { type: String, required: true },
  authorId: { type: String, required: true },
  authorName: { type: String, required: true },
  parentId: { type: String },
  createdAt: { type: Date, default: Date.now },
  isHidden: { type: Boolean, default: false },
});

export const MongooseProduct = mongoose.models.Product || mongoose.model<IProduct>('Product', ProductSchema);
export const MongooseForumPost = mongoose.models.ForumPost || mongoose.model<IForumPost>('ForumPost', ForumPostSchema);
export const MongooseForumReply = mongoose.models.ForumReply || mongoose.model<IForumReply>('ForumReply', ForumReplySchema);
