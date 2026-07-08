import prisma from './prisma';
import dbConnect from './mongoose';
import { MongooseProduct, MongooseForumPost, MongooseForumReply } from './mongooseModels';
import { fallbackDb, isFallbackActive } from './fallbackDb';

async function tryMongo(): Promise<boolean> {
  if (!process.env.MONGODB_URI) return false;
  try {
    const conn = await dbConnect();
    return !!conn;
  } catch {
    return false;
  }
}

export const dbClient = {
  users: {
    findUnique: async (email: string) => {
      if (isFallbackActive() || !prisma) {
        return fallbackDb.users.findUnique(email);
      }
      return prisma.user.findUnique({ where: { email } });
    },
    findById: async (id: string) => {
      if (isFallbackActive() || !prisma) {
        return fallbackDb.users.findById(id);
      }
      return prisma.user.findUnique({ where: { id } });
    },
    findMany: async () => {
      if (isFallbackActive() || !prisma) {
        return fallbackDb.users.findMany();
      }
      return prisma.user.findMany({ orderBy: { createdAt: 'desc' } });
    },
    create: async (data: any) => {
      if (isFallbackActive() || !prisma) {
        return fallbackDb.users.create(data);
      }
      return prisma.user.create({ data });
    },
    update: async (id: string, data: any) => {
      if (isFallbackActive() || !prisma) {
        return fallbackDb.users.update(id, data);
      }
      return prisma.user.update({ where: { id }, data });
    },
    delete: async (id: string) => {
      if (isFallbackActive() || !prisma) {
        return fallbackDb.users.delete(id);
      }
      const res = await prisma.user.delete({ where: { id } });
      return !!res;
    }
  },

  products: {
    findMany: async () => {
      if (isFallbackActive()) {
        return fallbackDb.products.findMany();
      }
      const mongo = await tryMongo();
      if (!mongo) return fallbackDb.products.findMany();
      const products = await MongooseProduct.find({}).sort({ createdAt: -1 });
      return products.map(p => ({
        id: p._id.toString(),
        name: p.name,
        description: p.description,
        price: p.price,
        stock: p.stock,
        minStock: (p as any).minStock ?? 5,
        category: p.category,
        sku: (p as any).sku || '',
        isActive: (p as any).isActive ?? true,
        imageUrl: p.imageUrl,
        qrCode: p.qrCode,
        costPrice: (p as any).costPrice ?? 0,
        location: (p as any).location || { warehouse: 'Almacen Principal', aisle: '', shelf: '' },
        createdAt: p.createdAt.toISOString()
      }));
    },
    findUnique: async (id: string) => {
      if (isFallbackActive()) {
        return fallbackDb.products.findUnique(id);
      }
      const mongo = await tryMongo();
      if (!mongo) return fallbackDb.products.findUnique(id);
      try {
        const p = await MongooseProduct.findById(id);
        if (!p) return undefined;
        return {
          id: p._id.toString(),
          name: p.name,
          description: p.description,
          price: p.price,
          stock: p.stock,
          minStock: (p as any).minStock ?? 5,
          category: p.category,
          sku: (p as any).sku || '',
          isActive: (p as any).isActive ?? true,
          imageUrl: p.imageUrl,
          qrCode: p.qrCode,
          costPrice: (p as any).costPrice ?? 0,
          location: (p as any).location || { warehouse: 'Almacen Principal', aisle: '', shelf: '' },
          createdAt: p.createdAt.toISOString()
        };
      } catch {
        return undefined;
      }
    },
    findByQrCode: async (qrCode: string) => {
      if (isFallbackActive()) {
        return fallbackDb.products.findByQrCode(qrCode);
      }
      const mongo = await tryMongo();
      if (!mongo) return fallbackDb.products.findByQrCode(qrCode);
      const p = await MongooseProduct.findOne({ qrCode });
      if (!p) return undefined;
      return {
        id: p._id.toString(),
        name: p.name,
        description: p.description,
        price: p.price,
        stock: p.stock,
        minStock: (p as any).minStock ?? 5,
        category: p.category,
        sku: (p as any).sku || '',
        isActive: (p as any).isActive ?? true,
        imageUrl: p.imageUrl,
        qrCode: p.qrCode,
        costPrice: (p as any).costPrice ?? 0,
        location: (p as any).location || { warehouse: 'Almacen Principal', aisle: '', shelf: '' },
        createdAt: p.createdAt.toISOString()
      };
    },
    create: async (data: any) => {
      if (isFallbackActive()) {
        return fallbackDb.products.create(data);
      }
      const mongo = await tryMongo();
      if (!mongo) return fallbackDb.products.create(data);
      const p = await MongooseProduct.create(data);
      return {
        id: p._id.toString(),
        name: p.name,
        description: p.description,
        price: p.price,
        stock: p.stock,
        minStock: (p as any).minStock ?? 5,
        category: p.category,
        sku: (p as any).sku || '',
        isActive: (p as any).isActive ?? true,
        imageUrl: p.imageUrl,
        qrCode: p.qrCode,
        costPrice: (p as any).costPrice ?? 0,
        location: (p as any).location || { warehouse: 'Almacen Principal', aisle: '', shelf: '' },
        createdAt: p.createdAt.toISOString()
      };
    },
    update: async (id: string, data: any) => {
      if (isFallbackActive()) {
        return fallbackDb.products.update(id, data);
      }
      const mongo = await tryMongo();
      if (!mongo) return fallbackDb.products.update(id, data);
      try {
        const p = await MongooseProduct.findByIdAndUpdate(id, data, { new: true });
        if (!p) return undefined;
        return {
          id: p._id.toString(),
          name: p.name,
          description: p.description,
          price: p.price,
          stock: p.stock,
          minStock: (p as any).minStock ?? 5,
          category: p.category,
          sku: (p as any).sku || '',
          isActive: (p as any).isActive ?? true,
          imageUrl: p.imageUrl,
          qrCode: p.qrCode,
          costPrice: (p as any).costPrice ?? 0,
          location: (p as any).location || { warehouse: 'Almacen Principal', aisle: '', shelf: '' },
          createdAt: p.createdAt.toISOString()
        };
      } catch {
        return undefined;
      }
    },
    delete: async (id: string) => {
      if (isFallbackActive()) {
        return fallbackDb.products.delete(id);
      }
      const mongo = await tryMongo();
      if (!mongo) return fallbackDb.products.delete(id);
      try {
        const res = await MongooseProduct.findByIdAndDelete(id);
        return !!res;
      } catch {
        return false;
      }
    }
  },

  sales: {
    findMany: async () => {
      if (isFallbackActive() || !prisma) {
        return fallbackDb.sales.findMany();
      }
      return prisma.sale.findMany({ orderBy: { createdAt: 'desc' } });
    },
    create: async (data: any) => {
      if (isFallbackActive() || !prisma) {
        return fallbackDb.sales.create(data);
      }
      return prisma.sale.create({ data });
    }
  },

  orders: {
    findMany: async () => {
      if (isFallbackActive() || !prisma) {
        return fallbackDb.orders.findMany();
      }
      return prisma.order.findMany({ orderBy: { createdAt: 'desc' } });
    },
    findUnique: async (id: string) => {
      if (isFallbackActive() || !prisma) {
        return fallbackDb.orders.findUnique(id);
      }
      return prisma.order.findUnique({ where: { id } });
    },
    create: async (data: any) => {
      if (isFallbackActive() || !prisma) {
        return fallbackDb.orders.create(data);
      }
      return prisma.order.create({ data });
    },
    update: async (id: string, data: any) => {
      if (isFallbackActive() || !prisma) {
        return fallbackDb.orders.update(id, data);
      }
      return prisma.order.update({ where: { id }, data });
    },
    delete: async (id: string) => {
      if (isFallbackActive() || !prisma) {
        return fallbackDb.orders.delete(id);
      }
      const res = await prisma.order.delete({ where: { id } });
      return !!res;
    }
  },

  forumPosts: {
    findMany: async () => {
      if (isFallbackActive()) {
        return fallbackDb.forumPosts.findMany();
      }
      const mongo = await tryMongo();
      if (!mongo) return fallbackDb.forumPosts.findMany();
      const posts = await MongooseForumPost.find({}).sort({ createdAt: -1 });
      return posts.map(p => ({
        id: p._id.toString(),
        title: p.title,
        content: p.content,
        category: p.category,
        authorId: p.authorId,
        authorName: p.authorName,
        createdAt: p.createdAt.toISOString(),
        isHidden: p.isHidden,
        likes: p.likes || []
      }));
    },
    create: async (data: any) => {
      if (isFallbackActive()) {
        return fallbackDb.forumPosts.create(data);
      }
      const mongo = await tryMongo();
      if (!mongo) return fallbackDb.forumPosts.create(data);
      const p = await MongooseForumPost.create(data);
      return {
        id: p._id.toString(),
        title: p.title,
        content: p.content,
        category: p.category,
        authorId: p.authorId,
        authorName: p.authorName,
        createdAt: p.createdAt.toISOString(),
        isHidden: p.isHidden,
        likes: p.likes || []
      };
    },
    toggleLike: async (id: string, userId: string) => {
      if (isFallbackActive()) {
        return fallbackDb.forumPosts.toggleLike(id, userId);
      }
      const mongo = await tryMongo();
      if (!mongo) return fallbackDb.forumPosts.toggleLike(id, userId);
      const post = await MongooseForumPost.findById(id);
      if (!post) return undefined;
      const likes = post.likes || [];
      const idx = likes.indexOf(userId);
      if (idx >= 0) {
        likes.splice(idx, 1);
      } else {
        likes.push(userId);
      }
      post.likes = likes;
      await post.save();
      return {
        id: post._id.toString(),
        title: post.title,
        content: post.content,
        category: post.category,
        authorId: post.authorId,
        authorName: post.authorName,
        createdAt: post.createdAt.toISOString(),
        isHidden: post.isHidden,
        likes: post.likes
      };
    },
    updateVisibility: async (id: string, isHidden: boolean) => {
      if (isFallbackActive()) {
        return fallbackDb.forumPosts.updateVisibility(id, isHidden);
      }
      const mongo = await tryMongo();
      if (!mongo) return fallbackDb.forumPosts.updateVisibility(id, isHidden);
      const p = await MongooseForumPost.findByIdAndUpdate(id, { isHidden }, { new: true });
      if (!p) return undefined;
      return {
        id: p._id.toString(),
        title: p.title,
        content: p.content,
        category: p.category,
        authorId: p.authorId,
        authorName: p.authorName,
        createdAt: p.createdAt.toISOString(),
        isHidden: p.isHidden,
        likes: p.likes || []
      };
    },
    delete: async (id: string) => {
      if (isFallbackActive()) {
        return fallbackDb.forumPosts.delete(id);
      }
      const mongo = await tryMongo();
      if (!mongo) return fallbackDb.forumPosts.delete(id);
      try {
        const res = await MongooseForumPost.findByIdAndDelete(id);
        await MongooseForumReply.deleteMany({ postId: id });
        return !!res;
      } catch {
        return false;
      }
    }
  },

  forumReplies: {
    findMany: async () => {
      if (isFallbackActive()) {
        return fallbackDb.forumReplies.findMany();
      }
      const mongo = await tryMongo();
      if (!mongo) return fallbackDb.forumReplies.findMany();
      const replies = await MongooseForumReply.find({}).sort({ createdAt: 1 });
      return replies.map(r => ({
        id: r._id.toString(),
        postId: r.postId,
        content: r.content,
        authorId: r.authorId,
        authorName: r.authorName,
        parentId: r.parentId,
        createdAt: r.createdAt.toISOString(),
        isHidden: r.isHidden
      }));
    },
    create: async (data: any) => {
      if (isFallbackActive()) {
        return fallbackDb.forumReplies.create(data);
      }
      const mongo = await tryMongo();
      if (!mongo) return fallbackDb.forumReplies.create(data);
      const r = await MongooseForumReply.create(data);
      return {
        id: r._id.toString(),
        postId: r.postId,
        content: r.content,
        authorId: r.authorId,
        authorName: r.authorName,
        parentId: r.parentId,
        createdAt: r.createdAt.toISOString(),
        isHidden: r.isHidden
      };
    },
    updateContent: async (id: string, content: string) => {
      if (isFallbackActive()) {
        return fallbackDb.forumReplies.updateContent(id, content);
      }
      const mongo = await tryMongo();
      if (!mongo) return fallbackDb.forumReplies.updateContent(id, content);
      const r = await MongooseForumReply.findByIdAndUpdate(id, { content }, { new: true });
      if (!r) return undefined;
      return {
        id: r._id.toString(),
        postId: r.postId,
        content: r.content,
        authorId: r.authorId,
        authorName: r.authorName,
        parentId: r.parentId,
        createdAt: r.createdAt.toISOString(),
        isHidden: r.isHidden
      };
    },
    updateVisibility: async (id: string, isHidden: boolean) => {
      if (isFallbackActive()) {
        return fallbackDb.forumReplies.updateVisibility(id, isHidden);
      }
      const mongo = await tryMongo();
      if (!mongo) return fallbackDb.forumReplies.updateVisibility(id, isHidden);
      const r = await MongooseForumReply.findByIdAndUpdate(id, { isHidden }, { new: true });
      if (!r) return undefined;
      return {
        id: r._id.toString(),
        postId: r.postId,
        content: r.content,
        authorId: r.authorId,
        authorName: r.authorName,
        parentId: r.parentId,
        createdAt: r.createdAt.toISOString(),
        isHidden: r.isHidden
      };
    },
    delete: async (id: string) => {
      if (isFallbackActive()) {
        return fallbackDb.forumReplies.delete(id);
      }
      const mongo = await tryMongo();
      if (!mongo) return fallbackDb.forumReplies.delete(id);
      try {
        const res = await MongooseForumReply.findByIdAndDelete(id);
        return !!res;
      } catch {
        return false;
      }
    }
  }
};
