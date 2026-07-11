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
      try {
        return await prisma.user.findUnique({ where: { email } });
      } catch {
        return fallbackDb.users.findUnique(email);
      }
    },
    findById: async (id: string) => {
      if (isFallbackActive() || !prisma) {
        return fallbackDb.users.findById(id);
      }
      try {
        return await prisma.user.findUnique({ where: { id } });
      } catch {
        return fallbackDb.users.findById(id);
      }
    },
    findMany: async (options?: any) => {
      if (isFallbackActive() || !prisma) {
        return fallbackDb.users.findMany();
      }
      try {
        return await prisma.user.findMany(options || { orderBy: { createdAt: 'desc' } });
      } catch {
        return fallbackDb.users.findMany();
      }
    },
    findFirst: async (options?: any) => {
      if (isFallbackActive() || !prisma) {
        return null;
      }
      try {
        return await prisma.user.findFirst(options || {});
      } catch (error) {
        console.error('Prisma user.findFirst failed:', error);
        return null;
      }
    },
    create: async (data: any) => {
      if (isFallbackActive() || !prisma) {
        return fallbackDb.users.create(data);
      }
      try {
        return await prisma.user.create({ data });
      } catch (error) {
        console.error('Prisma user create failed, using fallback:', error);
        return fallbackDb.users.create(data);
      }
    },
    update: async (id: string, data: any) => {
      if (isFallbackActive() || !prisma) {
        return fallbackDb.users.update(id, data);
      }
      try {
        return await prisma.user.update({ where: { id }, data });
      } catch {
        return fallbackDb.users.update(id, data);
      }
    },
    delete: async (id: string) => {
      if (isFallbackActive() || !prisma) {
        return fallbackDb.users.delete(id);
      }
      try {
        const res = await prisma.user.delete({ where: { id } });
        return !!res;
      } catch {
        return fallbackDb.users.delete(id);
      }
    }
  },

  roles: {
    findMany: async (includePermissions = false) => {
      if (isFallbackActive() || !prisma) return [];
      try {
        return await prisma.role.findMany({
          include: { permissions: includePermissions },
          orderBy: { createdAt: 'asc' },
        });
      } catch {
        return [];
      }
    },
    findUnique: async (id: string) => {
      if (isFallbackActive() || !prisma) return null;
      try {
        return await prisma.role.findUnique({
          where: { id },
          include: { permissions: true },
        });
      } catch {
        return null;
      }
    },
    findByName: async (name: string) => {
      if (isFallbackActive() || !prisma) return null;
      try {
        return await prisma.role.findUnique({
          where: { name },
          include: { permissions: true },
        });
      } catch {
        return null;
      }
    },
    create: async (data: any) => {
      if (isFallbackActive() || !prisma) return null;
      try {
        return await prisma.role.create({
          data: {
            name: data.name,
            displayName: data.displayName || data.name,
            description: data.description || '',
            icon: data.icon || null,
            color: data.color || null,
            isActive: data.isActive !== false,
            isSystem: data.isSystem || false,
            permissions: data.permissions ? {
              create: data.permissions.map((p: any) => ({
                module: p.module,
                action: p.action,
                isEnabled: p.isEnabled || false,
              })),
            } : undefined,
          },
          include: { permissions: true },
        });
      } catch {
        return null;
      }
    },
    update: async (id: string, data: any) => {
      if (isFallbackActive() || !prisma) return null;
      try {
        return await prisma.role.update({
          where: { id },
          data: {
            ...(data.name !== undefined && { name: data.name }),
            ...(data.displayName !== undefined && { displayName: data.displayName }),
            ...(data.description !== undefined && { description: data.description }),
            ...(data.icon !== undefined && { icon: data.icon }),
            ...(data.color !== undefined && { color: data.color }),
            ...(data.isActive !== undefined && { isActive: data.isActive }),
          },
          include: { permissions: true },
        });
      } catch {
        return null;
      }
    },
    updatePermissions: async (roleId: string, permissions: { module: string; action: string; isEnabled: boolean }[]) => {
      if (isFallbackActive() || !prisma) return null;
      try {
        await prisma.permission.deleteMany({ where: { roleId } });
        return await prisma.role.update({
          where: { id: roleId },
          data: {
            permissions: {
              create: permissions.map(p => ({
                module: p.module,
                action: p.action,
                isEnabled: p.isEnabled,
              })),
            },
          },
          include: { permissions: true },
        });
      } catch {
        return null;
      }
    },
    delete: async (id: string) => {
      if (isFallbackActive() || !prisma) return false;
      try {
        await prisma.role.delete({ where: { id } });
        return true;
      } catch {
        return false;
      }
    },
  },

  products: {
    findMany: async () => {
      if (isFallbackActive() || !prisma) {
        return fallbackDb.products.findMany();
      }
      try {
        const products = await prisma.product.findMany({ orderBy: { createdAt: 'desc' } });
        return products.map(p => ({
          id: p.id,
          name: p.name,
          description: p.description,
          price: p.price,
          stock: p.stock,
          minStock: p.minStock ?? 5,
          category: p.category,
          sku: p.sku || '',
          isActive: p.isActive,
          imageUrl: p.imageUrl || '',
          qrCode: p.qrCode || '',
          costPrice: p.costPrice ?? 0,
          location: (p.location as any) || { warehouse: 'Almacen Principal', aisle: '', shelf: '' },
          createdAt: p.createdAt.toISOString()
        }));
      } catch (error) {
        console.error('Prisma products.findMany failed:', error);
        return fallbackDb.products.findMany();
      }
    },
    findUnique: async (id: string) => {
      if (isFallbackActive() || !prisma) {
        return fallbackDb.products.findUnique(id);
      }
      try {
        const p = await prisma.product.findUnique({ where: { id } });
        if (!p) return undefined;
        return {
          id: p.id,
          name: p.name,
          description: p.description,
          price: p.price,
          stock: p.stock,
          minStock: p.minStock ?? 5,
          category: p.category,
          sku: p.sku || '',
          isActive: p.isActive,
          imageUrl: p.imageUrl || '',
          qrCode: p.qrCode || '',
          costPrice: p.costPrice ?? 0,
          location: (p.location as any) || { warehouse: 'Almacen Principal', aisle: '', shelf: '' },
          createdAt: p.createdAt.toISOString()
        };
      } catch {
        return undefined;
      }
    },
    findByQrCode: async (qrCode: string) => {
      if (isFallbackActive() || !prisma) {
        return fallbackDb.products.findByQrCode(qrCode);
      }
      try {
        const p = await prisma.product.findFirst({ where: { qrCode } });
        if (!p) return undefined;
        return {
          id: p.id,
          name: p.name,
          description: p.description,
          price: p.price,
          stock: p.stock,
          minStock: p.minStock ?? 5,
          category: p.category,
          sku: p.sku || '',
          isActive: p.isActive,
          imageUrl: p.imageUrl || '',
          qrCode: p.qrCode || '',
          costPrice: p.costPrice ?? 0,
          location: (p.location as any) || { warehouse: 'Almacen Principal', aisle: '', shelf: '' },
          createdAt: p.createdAt.toISOString()
        };
      } catch {
        return undefined;
      }
    },
    findBySku: async (sku: string) => {
      if (isFallbackActive() || !prisma) {
        return fallbackDb.products.findBySku(sku);
      }
      try {
        const p = await prisma.product.findFirst({ where: { sku } });
        if (!p) return undefined;
        return {
          id: p.id,
          name: p.name,
          description: p.description,
          price: p.price,
          stock: p.stock,
          minStock: p.minStock ?? 5,
          category: p.category,
          sku: p.sku || '',
          isActive: p.isActive,
          imageUrl: p.imageUrl || '',
          qrCode: p.qrCode || '',
          costPrice: p.costPrice ?? 0,
          location: (p.location as any) || { warehouse: 'Almacen Principal', aisle: '', shelf: '' },
          createdAt: p.createdAt.toISOString()
        };
      } catch {
        return undefined;
      }
    },
    findByName: async (name: string) => {
      if (isFallbackActive() || !prisma) {
        return fallbackDb.products.findByName(name);
      }
      try {
        const p = await prisma.product.findFirst({ where: { name } });
        if (!p) return undefined;
        return {
          id: p.id,
          name: p.name,
          description: p.description,
          price: p.price,
          stock: p.stock,
          minStock: p.minStock ?? 5,
          category: p.category,
          sku: p.sku || '',
          isActive: p.isActive,
          imageUrl: p.imageUrl || '',
          qrCode: p.qrCode || '',
          costPrice: p.costPrice ?? 0,
          location: (p.location as any) || { warehouse: 'Almacen Principal', aisle: '', shelf: '' },
          createdAt: p.createdAt.toISOString()
        };
      } catch {
        return undefined;
      }
    },
    create: async (data: any) => {
      if (isFallbackActive() || !prisma) {
        return fallbackDb.products.create(data);
      }
      try {
        const p = await prisma.product.create({
          data: {
            name: data.name,
            description: data.description,
            price: data.price,
            stock: data.stock,
            minStock: data.minStock ?? 5,
            category: data.category,
            sku: data.sku || null,
            imageUrl: data.imageUrl || '',
            qrCode: data.qrCode || '',
            isActive: data.isActive ?? true,
            costPrice: data.costPrice ?? 0,
            location: data.location || { warehouse: 'Almacen Principal', aisle: '', shelf: '' },
          }
        });
        return {
          id: p.id,
          name: p.name,
          description: p.description,
          price: p.price,
          stock: p.stock,
          minStock: p.minStock ?? 5,
          category: p.category,
          sku: p.sku || '',
          isActive: p.isActive,
          imageUrl: p.imageUrl || '',
          qrCode: p.qrCode || '',
          costPrice: p.costPrice ?? 0,
          location: (p.location as any) || { warehouse: 'Almacen Principal', aisle: '', shelf: '' },
          createdAt: p.createdAt.toISOString()
        };
      } catch (error) {
        console.error('Prisma products.create failed:', error);
        return fallbackDb.products.create(data);
      }
    },
    update: async (id: string, data: any) => {
      if (isFallbackActive() || !prisma) {
        return fallbackDb.products.update(id, data);
      }
      try {
        const p = await prisma.product.update({ where: { id }, data });
        return {
          id: p.id,
          name: p.name,
          description: p.description,
          price: p.price,
          stock: p.stock,
          minStock: p.minStock ?? 5,
          category: p.category,
          sku: p.sku || '',
          isActive: p.isActive,
          imageUrl: p.imageUrl || '',
          qrCode: p.qrCode || '',
          costPrice: p.costPrice ?? 0,
          location: (p.location as any) || { warehouse: 'Almacen Principal', aisle: '', shelf: '' },
          createdAt: p.createdAt.toISOString()
        };
      } catch {
        return undefined;
      }
    },
    delete: async (id: string) => {
      if (isFallbackActive() || !prisma) {
        return fallbackDb.products.delete(id);
      }
      try {
        await prisma.product.delete({ where: { id } });
        return true;
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
      try {
        return await prisma.sale.findMany({ orderBy: { createdAt: 'desc' } });
      } catch {
        return fallbackDb.sales.findMany();
      }
    },
    create: async (data: any) => {
      if (isFallbackActive() || !prisma) {
        return fallbackDb.sales.create(data);
      }
      try {
        return await prisma.sale.create({ data });
      } catch (error) {
        console.error('Prisma sale create failed, using fallback:', error);
        return fallbackDb.sales.create(data);
      }
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
