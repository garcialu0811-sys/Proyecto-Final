import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { dbClient } from '@/lib/db/dbClient';

const MODULES = [
  { key: 'dashboard', label: 'Dashboard', actions: ['view'] },
  { key: 'products', label: 'Productos', actions: ['view', 'create', 'edit', 'delete'] },
  { key: 'categories', label: 'Categorias', actions: ['view', 'create', 'edit', 'delete'] },
  { key: 'inventory', label: 'Inventario', actions: ['view', 'edit', 'export'] },
  { key: 'sales', label: 'Ventas', actions: ['view', 'create', 'edit', 'delete'] },
  { key: 'orders', label: 'Pedidos', actions: ['view', 'create', 'edit', 'delete'] },
  { key: 'deliveries', label: 'Entregas', actions: ['view', 'create', 'edit', 'delete'] },
  { key: 'users', label: 'Usuarios', actions: ['view', 'create', 'edit', 'delete', 'manage_roles'] },
  { key: 'forum', label: 'Foro', actions: ['view', 'create', 'edit', 'delete', 'moderate'] },
  { key: 'settings', label: 'Configuracion', actions: ['view', 'edit'] },
];

const DEFAULT_ROLE_PERMISSIONS: Record<string, Record<string, boolean>> = {
  ADMIN: {
    'dashboard:view': true, 'products:view': true, 'products:create': true, 'products:edit': true, 'products:delete': true,
    'categories:view': true, 'categories:create': true, 'categories:edit': true, 'categories:delete': true,
    'inventory:view': true, 'inventory:edit': true, 'inventory:export': true,
    'sales:view': true, 'sales:create': true, 'sales:edit': true, 'sales:delete': true,
    'orders:view': true, 'orders:create': true, 'orders:edit': true, 'orders:delete': true,
    'deliveries:view': true, 'deliveries:create': true, 'deliveries:edit': true, 'deliveries:delete': true,
    'users:view': true, 'users:create': true, 'users:edit': true, 'users:delete': true, 'users:manage_roles': true,
    'forum:view': true, 'forum:create': true, 'forum:edit': true, 'forum:delete': true, 'forum:moderate': true,
    'settings:view': true, 'settings:edit': true,
  },
  VENDEDOR: {
    'dashboard:view': true, 'products:view': true, 'products:create': true, 'products:edit': true, 'products:delete': false,
    'categories:view': true, 'categories:create': false, 'categories:edit': false, 'categories:delete': false,
    'inventory:view': true, 'inventory:edit': true, 'inventory:export': true,
    'sales:view': true, 'sales:create': true, 'sales:edit': true, 'sales:delete': false,
    'orders:view': true, 'orders:create': true, 'orders:edit': true, 'orders:delete': false,
    'deliveries:view': true, 'deliveries:create': true, 'deliveries:edit': true, 'deliveries:delete': false,
    'users:view': false, 'users:create': false, 'users:edit': false, 'users:delete': false, 'users:manage_roles': false,
    'forum:view': true, 'forum:create': true, 'forum:edit': true, 'forum:delete': false, 'forum:moderate': false,
    'settings:view': true, 'settings:edit': false,
  },

};

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ message: 'No autorizado.' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';

    let roles: any[] = [];
    try {
      roles = await dbClient.roles.findMany(true);
    } catch (e) {
      console.error('Error finding roles:', e);
    }

    if (!roles || roles.length === 0) {
      try {
        for (const [roleName, perms] of Object.entries(DEFAULT_ROLE_PERMISSIONS)) {
          const allPerms: { module: string; action: string; isEnabled: boolean }[] = [];
          for (const mod of MODULES) {
            for (const action of mod.actions) {
              const key = `${mod.key}:${action}`;
              allPerms.push({ module: mod.key, action, isEnabled: perms[key] || false });
            }
          }
          const descriptions: Record<string, string> = {
            ADMIN: 'Tiene acceso completo a todas las funciones y configuraciones del sistema.',
            VENDEDOR: 'Gestiona productos, ventas, pedidos y entregas. No tiene acceso a la configuracion del sistema.',
          };
          await dbClient.roles.create({
            name: roleName,
            displayName: roleName === 'ADMIN' ? 'Administrador' : 'Vendedor',
            description: descriptions[roleName] || '',
            isSystem: true,
            permissions: allPerms,
          });
        }
        roles = await dbClient.roles.findMany(true);
      } catch (e) {
        console.error('Error seeding roles:', e);
      }
    }

    let allUsers: any[] = [];
    try {
      allUsers = await dbClient.users.findMany();
    } catch {}

    const roleUserCounts: Record<string, number> = {};
    for (const u of allUsers) {
      const r = u.role || 'VENDEDOR';
      roleUserCounts[r] = (roleUserCounts[r] || 0) + 1;
    }

    const enrichedRoles = roles.map((r: any) => {
      const permCount = (r.permissions || []).filter((p: any) => p.isEnabled).length;
      const totalPerms = MODULES.reduce((sum, m) => sum + m.actions.length, 0);
      const userCount = roleUserCounts[r.name] || 0;

      let accessLevel: 'full' | 'partial' | 'limited' = 'limited';
      if (permCount >= totalPerms * 0.8) accessLevel = 'full';
      else if (permCount >= totalPerms * 0.4) accessLevel = 'partial';

      return {
        id: r.id,
        name: r.name,
        displayName: r.displayName || r.name,
        description: r.description || '',
        icon: r.icon,
        color: r.color,
        isActive: r.isActive,
        isSystem: r.isSystem,
        userCount,
        permissionCount: permCount,
        totalPermissions: totalPerms,
        accessLevel,
        permissions: r.permissions || [],
        createdAt: r.createdAt,
      };
    });

    if (search) {
      const s = search.toLowerCase();
      return NextResponse.json(enrichedRoles.filter(r =>
        r.name.toLowerCase().includes(s) || r.displayName.toLowerCase().includes(s) || r.description.toLowerCase().includes(s)
      ));
    }

    return NextResponse.json(enrichedRoles);
  } catch (error) {
    console.error('Error al obtener roles:', error);
    return NextResponse.json({ message: 'Error interno del servidor.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ message: 'No autorizado.' }, { status: 403 });
    }

    const body = await request.json();
    const { name, displayName, description, permissions } = body;

    if (!name) {
      return NextResponse.json({ message: 'El nombre es obligatorio.' }, { status: 400 });
    }

    const existing = await dbClient.roles.findByName(name);
    if (existing) {
      return NextResponse.json({ message: 'Ya existe un rol con ese nombre.' }, { status: 409 });
    }

    const allPerms: { module: string; action: string; isEnabled: boolean }[] = [];
    for (const mod of MODULES) {
      for (const action of mod.actions) {
        const key = `${mod.key}:${action}`;
        const isEnabled = permissions ? (permissions[key] || false) : false;
        allPerms.push({ module: mod.key, action, isEnabled });
      }
    }

    const role = await dbClient.roles.create({
      name: name.toUpperCase(),
      displayName: displayName || name,
      description: description || '',
      isSystem: false,
      permissions: allPerms,
    });

    if (!role) {
      return NextResponse.json({ message: 'Error al crear el rol.' }, { status: 500 });
    }

    return NextResponse.json({ role, message: 'Rol creado exitosamente.' }, { status: 201 });
  } catch (error) {
    console.error('Error al crear rol:', error);
    return NextResponse.json({ message: 'Error interno del servidor.' }, { status: 500 });
  }
}
