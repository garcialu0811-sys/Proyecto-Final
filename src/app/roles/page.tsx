'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  ShieldCheck, Plus, Download, RefreshCw, Search, Pencil, Trash2, X, Save,
  Users, Lock, Shield, Crown, ShoppingBag, User, CheckCircle, Clock, XCircle,
  ChevronDown, MoreVertical, Info, AlertTriangle,
} from 'lucide-react';
import { useToast } from '@/components/ui/ToastContext';

interface Permission {
  id?: string;
  module: string;
  action: string;
  isEnabled: boolean;
}

interface RoleItem {
  id: string;
  name: string;
  displayName: string;
  description: string;
  icon?: string | null;
  color?: string | null;
  isActive: boolean;
  isSystem: boolean;
  userCount: number;
  permissionCount: number;
  totalPermissions: number;
  accessLevel: 'full' | 'partial' | 'limited';
  permissions: Permission[];
  createdAt: string;
}

const MODULES = [
  { key: 'dashboard', label: 'Dashboard', icon: 'grid', actions: ['view'] },
  { key: 'products', label: 'Productos', icon: 'package', actions: ['view', 'create', 'edit', 'delete'] },
  { key: 'categories', label: 'Categorias', icon: 'tag', actions: ['view', 'create', 'edit', 'delete'] },
  { key: 'inventory', label: 'Inventario', icon: 'box', actions: ['view', 'edit', 'export'] },
  { key: 'sales', label: 'Ventas', icon: 'dollar', actions: ['view', 'create', 'edit', 'delete'] },
  { key: 'orders', label: 'Pedidos', icon: 'file', actions: ['view', 'create', 'edit', 'delete'] },
  { key: 'deliveries', label: 'Entregas', icon: 'truck', actions: ['view', 'create', 'edit', 'delete'] },
  { key: 'users', label: 'Usuarios', icon: 'users', actions: ['view', 'create', 'edit', 'delete', 'manage_roles'] },
  { key: 'settings', label: 'Configuracion', icon: 'settings', actions: ['view', 'edit'] },
];

const ACTION_LABELS: Record<string, string> = {
  view: 'Ver', create: 'Crear', edit: 'Editar', delete: 'Eliminar',
  export: 'Exportar', manage_roles: 'Gestionar roles',
};

const ROLE_ICONS: Record<string, any> = {
  ADMIN: Crown, VENDEDOR: ShoppingBag,
};

const ROLE_COLORS: Record<string, string> = {
  ADMIN: '#EF4444', VENDEDOR: '#3B82F6',
};

const ACCESS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  full: { label: 'Acceso completo', color: '#059669', bg: '#D1FAE5', icon: CheckCircle },
  partial: { label: 'Acceso parcial', color: '#D97706', bg: '#FEF3C7', icon: Clock },
  limited: { label: 'Acceso limitado', color: '#DC2626', bg: '#FEE2E2', icon: XCircle },
};

export default function RolesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { showToast } = useToast();
  const currentUser = session?.user as any;

  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');

  const [modal, setModal] = useState<'create' | 'edit' | 'permissions' | 'delete' | null>(null);
  const [selectedRole, setSelectedRole] = useState<RoleItem | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const [formName, setFormName] = useState('');
  const [formDisplayName, setFormDisplayName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [permEdit, setPermEdit] = useState<Record<string, boolean>>({});

  const fetchRoles = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/roles');
      if (res.ok) {
        const data = await res.json();
        setRoles(data);
      }
    } catch {
      showToast('Error al obtener roles.', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === 'unauthenticated') { router.push('/login'); return; }
    if (session) {
      if ((session.user as any).role !== 'ADMIN') { showToast('Acceso denegado.', 'error'); router.push('/'); return; }
      fetchRoles();
    }
  }, [session, status]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (menuRef.current && !menuRef.current.contains(target) && !(target as HTMLElement).closest('.menu-btn')) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);

  const filteredRoles = roles.filter(r =>
    !search || r.name.toLowerCase().includes(search.toLowerCase()) ||
    r.displayName.toLowerCase().includes(search.toLowerCase()) ||
    r.description.toLowerCase().includes(search.toLowerCase())
  );

  const totalPermissions = roles.reduce((sum, r) => sum + r.permissionCount, 0);
  const totalUsers = roles.reduce((sum, r) => sum + r.userCount, 0);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName) { showToast('El nombre es obligatorio.', 'warning'); return; }
    setActionLoading(true);
    try {
      const res = await fetch('/api/roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: formName, displayName: formDisplayName, description: formDescription }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast('Rol creado exitosamente.', 'success');
        setModal(null);
        fetchRoles();
      } else {
        showToast(data.message || 'Error al crear.', 'error');
      }
    } catch {
      showToast('Error de red.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const openPermissions = (role: RoleItem) => {
    setSelectedRole(role);
    const permMap: Record<string, boolean> = {};
    for (const mod of MODULES) {
      for (const action of mod.actions) {
        const key = `${mod.key}:${action}`;
        const found = role.permissions.find(p => p.module === mod.key && p.action === action);
        permMap[key] = found ? found.isEnabled : false;
      }
    }
    setPermEdit(permMap);
    setModal('permissions');
  };

  const togglePerm = (key: string) => {
    setPermEdit(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSavePermissions = async () => {
    if (!selectedRole) return;
    setActionLoading(true);
    try {
      const permissions = Object.entries(permEdit).map(([key, isEnabled]) => {
        const [module, action] = key.split(':');
        return { module, action, isEnabled };
      });
      const res = await fetch(`/api/roles/${selectedRole.id}/permissions`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permissions }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast('Permisos actualizados.', 'success');
        setModal(null);
        fetchRoles();
      } else {
        showToast(data.message || 'Error al guardar.', 'error');
      }
    } catch {
      showToast('Error de red.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedRole) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/roles/${selectedRole.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok) {
        showToast('Rol eliminado.', 'success');
        setModal(null);
        fetchRoles();
      } else {
        showToast(data.message || 'Error al eliminar.', 'error');
      }
    } catch {
      showToast('Error de red.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleExport = () => {
    const headers = ['ID', 'Nombre', 'Descripcion', 'Usuarios', 'Estado', 'Permisos', 'Nivel'];
    const rows = filteredRoles.map(r => [
      r.id, r.name, r.description, r.userCount, r.isActive ? 'Activo' : 'Inactivo',
      r.permissionCount, r.accessLevel,
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `roles-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Roles exportados.', 'success');
  };

  return (
    <div>
      <div className="roles-header">
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '10px', margin: 0 }}>
            <ShieldCheck size={28} style={{ color: 'var(--accent)' }} />
            Roles
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '4px', margin: '4px 0 0 0' }}>
            Administra los roles del sistema y los permisos asociados a cada uno.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button onClick={handleExport} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 16px', borderRadius: '8px', fontWeight: 500 }}>
            <Download size={16} /> Exportar
          </button>
          <button onClick={() => { setFormName(''); setFormDisplayName(''); setFormDescription(''); setModal('create'); }} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 20px', borderRadius: '8px', fontWeight: 600 }}>
            <Plus size={16} /> Nuevo rol
          </button>
        </div>
      </div>

      <div className="stats-grid">
        {[
          { title: 'Total de roles', value: roles.length, sub: 'En el sistema', icon: <ShieldCheck size={24} style={{ color: '#6366F1' }} />, iconBg: '#EEF2FF' },
          { title: 'Roles activos', value: roles.filter(r => r.isActive).length, sub: roles.length > 0 ? `${((roles.filter(r => r.isActive).length / roles.length) * 100).toFixed(0)}% del total` : '0%', icon: <Shield size={24} style={{ color: '#10B981' }} />, iconBg: '#ECFDF5' },
          { title: 'Permisos asignados', value: totalPermissions, sub: 'En todos los roles', icon: <Lock size={24} style={{ color: '#F59E0B' }} />, iconBg: '#FFFBEB' },
          { title: 'Usuarios con rol', value: totalUsers, sub: 'Asignados a roles', icon: <Users size={24} style={{ color: '#8B5CF6' }} />, iconBg: '#F3E8FF' },
        ].map((m, i) => (
          <div key={i} className="stat-card">
            <div className="stat-icon" style={{ backgroundColor: m.iconBg }}>{m.icon}</div>
            <div>
              <p className="stat-title">{m.title}</p>
              <p className="stat-value">{m.value}</p>
              <p className="stat-sub">{m.sub}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="roles-content">
        <div className="roles-table-panel">
          <div className="table-header">
            <h3 style={{ fontSize: '16px', fontWeight: 600, margin: 0 }}>Lista de roles</h3>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <div style={{ position: 'relative' }}>
                <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-light)' }} />
                <input type="text" className="form-control" placeholder="Buscar roles..." value={searchInput} onChange={e => { setSearchInput(e.target.value); setSearch(e.target.value); }} style={{ paddingLeft: '32px', height: '36px', fontSize: '13px', width: '200px' }} />
              </div>
            </div>
          </div>

          {loading ? (
            <div style={{ padding: '40px 16px', textAlign: 'center' }}>
              <div className="spinner"></div>
              <p style={{ marginTop: '16px', color: 'var(--text-secondary)' }}>Cargando roles...</p>
            </div>
          ) : filteredRoles.length === 0 ? (
            <div style={{ padding: '40px 16px', textAlign: 'center' }}>
              <ShieldCheck size={40} style={{ color: 'var(--text-light)', margin: '0 auto 12px auto', display: 'block' }} />
              <p style={{ color: 'var(--text-secondary)' }}>No hay roles.</p>
            </div>
          ) : (
            <>
              <div style={{ overflowX: 'auto' }}>
                <table className="roles-table">
                  <thead>
                    <tr>
                      <th>Rol</th>
                      <th>Descripcion</th>
                      <th>Usuarios</th>
                      <th>Estado</th>
                      <th>Permisos</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRoles.map(r => {
                      const IconComp = ROLE_ICONS[r.name] || Shield;
                      const roleColor = ROLE_COLORS[r.name] || '#8B5CF6';
                      const access = ACCESS_CONFIG[r.accessLevel] || ACCESS_CONFIG.limited;
                      return (
                        <tr key={r.id}>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: `${roleColor}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                <IconComp size={20} style={{ color: roleColor }} />
                              </div>
                              <div>
                                <p style={{ fontWeight: 600, fontSize: '14px', margin: 0 }}>{r.displayName}</p>
                                {r.isSystem && <span className="system-badge">Sistema</span>}
                              </div>
                            </div>
                          </td>
                          <td style={{ fontSize: '13px', color: 'var(--text-secondary)', maxWidth: '300px' }}>{r.description}</td>
                          <td style={{ fontSize: '13px' }}><span style={{ fontWeight: 600 }}>{r.userCount}</span> usuarios</td>
                          <td><span className="status-badge" style={{ backgroundColor: r.isActive ? '#D1FAE5' : '#FEE2E2', color: r.isActive ? '#059669' : '#DC2626' }}>{r.isActive ? 'Activo' : 'Inactivo'}</span></td>
                          <td>
                            <div>
                              <span style={{ fontWeight: 600, fontSize: '13px' }}>{r.permissionCount} permisos</span>
                              <p style={{ fontSize: '12px', color: access.color, margin: '2px 0 0 0' }}>{access.label}</p>
                            </div>
                          </td>
                          <td>
                            <div style={{ position: 'relative' }} ref={openMenuId === r.id ? menuRef : undefined}>
                              <button onClick={e => { e.stopPropagation(); setOpenMenuId(openMenuId === r.id ? null : r.id); }} className="menu-btn">
                                <MoreVertical size={16} />
                              </button>
                              {openMenuId === r.id && (
                                <div className="dropdown-menu" onClick={e => e.stopPropagation()}>
                                  <button onClick={() => { openPermissions(r); setOpenMenuId(null); }}>
                                    <Pencil size={14} /> Editar permisos
                                  </button>
                                  {!r.isSystem && (
                                    <button onClick={() => { setSelectedRole(r); setModal('delete'); setOpenMenuId(null); }} className="danger">
                                      <Trash2 size={14} /> Eliminar
                                    </button>
                                  )}
                                  {r.isSystem && (
                                    <div style={{ padding: '8px 12px', fontSize: '12px', color: 'var(--text-light)', fontStyle: 'italic' }}>
                                      Rol del sistema
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', fontSize: '13px', color: 'var(--text-secondary)' }}>
                Mostrando {filteredRoles.length} de {roles.length} roles
              </div>
            </>
          )}
        </div>

        <div className="roles-side-panel">
          <div className="info-card">
            <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Info size={16} style={{ color: 'var(--accent)' }} /> Informacion sobre roles
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.6', marginBottom: '16px' }}>
              Los roles permiten controlar el acceso de los usuarios a las diferentes funciones del sistema. Cada rol tiene un conjunto de permisos especificos.
            </p>
            <h4 style={{ fontSize: '13px', fontWeight: 600, marginBottom: '8px' }}>Buenas practicas</h4>
            <ul style={{ fontSize: '12px', color: 'var(--text-secondary)', paddingLeft: '16px', lineHeight: '1.8', marginBottom: '16px' }}>
              <li>Asigna el rol minimo necesario a cada usuario.</li>
              <li>Revisa los permisos regularmente.</li>
              <li>Crea nuevos roles solo cuando sea necesario.</li>
            </ul>
            <div style={{ padding: '10px 12px', backgroundColor: '#FEF3C7', borderRadius: '8px', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
              <AlertTriangle size={14} style={{ color: '#D97706', flexShrink: 0, marginTop: '2px' }} />
              <p style={{ fontSize: '12px', color: '#92400E', margin: 0 }}>Los roles del sistema (Administrador y Vendedor) no pueden ser eliminados.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="permissions-summary">
        <h3 style={{ fontSize: '16px', fontWeight: 600, margin: '0 0 8px 0' }}>Resumen de permisos por rol</h3>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '0 0 20px 0' }}>Cantidad de permisos asignados a cada rol</p>
        <div className="bar-chart">
          {roles.map(r => {
            const pct = r.totalPermissions > 0 ? (r.permissionCount / r.totalPermissions) * 100 : 0;
            const access = ACCESS_CONFIG[r.accessLevel] || ACCESS_CONFIG.limited;
            const roleColor = ROLE_COLORS[r.name] || '#8B5CF6';
            return (
              <div key={r.id} className="bar-row">
                <span className="bar-label">{r.displayName}</span>
                <div className="bar-track">
                  <div className="bar-fill" style={{ width: `${pct}%`, backgroundColor: roleColor }}></div>
                </div>
                <span className="bar-count">{r.permissionCount} permisos</span>
                <span className="bar-level" style={{ color: access.color, backgroundColor: access.bg }}>{access.label}</span>
              </div>
            );
          })}
        </div>
        <div style={{ marginTop: '16px', padding: '12px', backgroundColor: 'var(--bg-primary)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Info size={14} /> Para gestionar los permisos de cada rol, selecciona un rol y haz clic en "Editar permisos".
          </p>
          <button onClick={() => { if (filteredRoles.length > 0) openPermissions(filteredRoles[0]); }} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', fontSize: '13px' }}>
            <Lock size={14} /> Gestionar permisos
          </button>
        </div>
      </div>

      {modal === 'create' && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal-content" style={{ maxWidth: '480px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 style={{ fontSize: '18px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}><Plus size={20} style={{ color: 'var(--accent)' }} /> Nuevo Rol</h2>
              <button className="modal-close" onClick={() => setModal(null)}><X size={20} /></button>
            </div>
            <form onSubmit={handleCreate}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Nombre del rol *</label>
                  <input type="text" className="form-control" value={formName} onChange={e => setFormName(e.target.value)} placeholder="Ej: Supervisor" required disabled={actionLoading} />
                </div>
                <div className="form-group">
                  <label className="form-label">Nombre para mostrar</label>
                  <input type="text" className="form-control" value={formDisplayName} onChange={e => setFormDisplayName(e.target.value)} placeholder="Ej: Supervisor General" disabled={actionLoading} />
                </div>
                <div className="form-group">
                  <label className="form-label">Descripcion</label>
                  <textarea className="form-control" value={formDescription} onChange={e => setFormDescription(e.target.value)} rows={3} placeholder="Describe las funciones de este rol..." disabled={actionLoading} style={{ resize: 'vertical' }} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
                <button type="button" onClick={() => setModal(null)} className="btn btn-secondary" disabled={actionLoading}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={actionLoading} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Save size={16} /> {actionLoading ? 'Creando...' : 'Crear rol'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {modal === 'permissions' && selectedRole && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal-content modal-permissions" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 style={{ fontSize: '18px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                <Pencil size={20} style={{ color: 'var(--accent)' }} /> Editar permisos - {selectedRole.displayName}
              </h2>
              <button className="modal-close" onClick={() => setModal(null)}><X size={20} /></button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '20px' }}>Selecciona los permisos que tendra este rol</p>
              <div className="permissions-grid">
                {MODULES.map(mod => (
                  <div key={mod.key} className="perm-module">
                    <h4 style={{ fontSize: '13px', fontWeight: 600, marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {mod.label}
                    </h4>
                    <div className="perm-actions">
                      {mod.actions.map(action => {
                        const key = `${mod.key}:${action}`;
                        return (
                          <label key={key} className="perm-checkbox">
                            <input type="checkbox" checked={permEdit[key] || false} onChange={() => togglePerm(key)} disabled={actionLoading} />
                            <span>{ACTION_LABELS[action] || action}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={() => setModal(null)} className="btn btn-secondary" disabled={actionLoading}>Cancelar</button>
              <button onClick={handleSavePermissions} className="btn btn-primary" disabled={actionLoading} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Save size={16} /> {actionLoading ? 'Guardando...' : 'Guardar permisos'}
              </button>
            </div>
          </div>
        </div>
      )}

      {modal === 'delete' && selectedRole && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal-content" style={{ maxWidth: '420px' }} onClick={e => e.stopPropagation()}>
            <div style={{ textAlign: 'center', padding: '24px' }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: '#FEE2E2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto' }}>
                <Trash2 size={28} style={{ color: '#DC2626' }} />
              </div>
              <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>Eliminar Rol</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '4px' }}>
                Estas seguro de eliminar el rol <strong>{selectedRole.displayName}</strong>?
              </p>
              <p style={{ color: 'var(--text-light)', fontSize: '12px' }}>Esta accion no se puede deshacer.</p>
            </div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', padding: '0 24px 24px 24px' }}>
              <button onClick={() => setModal(null)} className="btn btn-secondary" disabled={actionLoading} style={{ flex: 1 }}>Cancelar</button>
              <button onClick={handleDelete} className="btn" disabled={actionLoading} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', backgroundColor: '#DC2626', color: 'white', border: 'none', padding: '10px 16px', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>
                <Trash2 size={16} /> {actionLoading ? 'Eliminando...' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        .spinner { display: inline-block; width: 40px; height: 40px; border: 3px solid var(--border); border-top-color: var(--accent); border-radius: 50%; animation: spin 1s linear infinite; }

        .roles-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; flex-wrap: wrap; gap: 16px; }

        .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 24px; }
        @media (max-width: 1024px) { .stats-grid { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 640px) { .stats-grid { grid-template-columns: 1fr; } }

        .stat-card { background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 12px; padding: 20px; display: flex; align-items: center; gap: 16px; }
        .stat-icon { width: 48px; height: 48px; border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .stat-title { font-size: 13px; color: var(--text-secondary); margin: 0; }
        .stat-value { font-size: 28px; font-weight: 700; margin: 2px 0; color: var(--text-primary); }
        .stat-sub { font-size: 12px; color: var(--text-light); margin: 0; }

        .roles-content { display: grid; grid-template-columns: 1fr 340px; gap: 20px; align-items: start; margin-bottom: 24px; }
        @media (max-width: 1200px) { .roles-content { grid-template-columns: 1fr; } }

        .roles-table-panel { background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 12px; overflow: hidden; }
        .table-header { display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; border-bottom: 1px solid var(--border); flex-wrap: wrap; gap: 12px; }

        .roles-table { width: 100%; border-collapse: collapse; }
        .roles-table thead tr { border-bottom: 2px solid var(--border); }
        .roles-table th { padding: 12px 16px; font-size: 12px; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.5px; text-align: left; white-space: nowrap; }
        .roles-table td { padding: 14px 16px; border-bottom: 1px solid var(--border); font-size: 14px; vertical-align: middle; }
        .roles-table tbody tr { transition: background 0.15s; }
        .roles-table tbody tr:hover { background: var(--bg-primary); }

        .system-badge { display: inline-block; padding: 2px 8px; border-radius: 50px; font-size: 10px; font-weight: 600; backgroundColor: #E0E7FF; color: #4338CA; marginLeft: 6px; verticalAlign: middle; }
        .status-badge { display: inline-block; padding: 4px 12px; border-radius: 50px; font-size: 12px; font-weight: 600; }

        .menu-btn { width: 32px; height: 32px; border-radius: 8px; border: 1px solid var(--border); background: var(--bg-secondary); display: flex; align-items: center; justify-content: center; cursor: pointer; color: var(--text-secondary); transition: all 0.15s; }
        .menu-btn:hover { background: var(--bg-primary); border-color: var(--accent); color: var(--accent); }

        .dropdown-menu { position: absolute; right: 0; top: 100%; margin-top: 4px; background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 10px; box-shadow: 0 8px 24px rgba(0,0,0,0.12); z-index: 50; min-width: 180px; padding: 6px; }
        .dropdown-menu button { display: flex; align-items: center; gap: 8px; width: 100%; padding: 8px 12px; border: none; background: none; font-size: 13px; color: var(--text-primary); cursor: pointer; border-radius: 6px; text-align: left; transition: background 0.15s; }
        .dropdown-menu button:hover { background: var(--bg-primary); }
        .dropdown-menu button.danger { color: #DC2626; }
        .dropdown-menu button.danger:hover { background: #FEE2E2; }

        .roles-side-panel { position: sticky; top: 20px; }
        .info-card { background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 12px; padding: 20px; }

        .permissions-summary { background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 12px; padding: 24px; }
        .bar-chart { display: flex; flex-direction: column; gap: 12px; }
        .bar-row { display: grid; grid-template-columns: 120px 1fr 110px 120px; gap: 12px; align-items: center; }
        @media (max-width: 768px) { .bar-row { grid-template-columns: 1fr; } }
        .bar-label { font-size: 13px; font-weight: 500; }
        .bar-track { height: 10px; background: var(--border); border-radius: 5px; overflow: hidden; }
        .bar-fill { height: 100%; border-radius: 5px; transition: width 0.5s ease; }
        .bar-count { font-size: 13px; color: var(--text-secondary); text-align: right; }
        .bar-level { font-size: 11px; font-weight: 600; padding: 3px 10px; border-radius: 50px; text-align: center; white-space: nowrap; }

        .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 100; padding: 20px; }
        .modal-content { background: var(--bg-secondary); border-radius: 16px; width: 100%; max-height: 90vh; overflow-y: auto; box-shadow: 0 20px 60px rgba(0,0,0,0.2); }
        .modal-header { display: flex; justify-content: space-between; align-items: center; padding: 20px 24px; border-bottom: 1px solid var(--border); }
        .modal-close { background: none; border: none; cursor: pointer; color: var(--text-secondary); padding: 4px; border-radius: 6px; transition: all 0.15s; }
        .modal-close:hover { background: var(--bg-primary); color: var(--text-primary); }
        .modal-body { padding: 24px; }
        .modal-footer { display: flex; gap: 10px; justify-content: flex-end; padding: 16px 24px; border-top: 1px solid var(--border); }

        .modal-permissions { max-width: 700px; }
        .permissions-grid { display: flex; flex-direction: column; gap: 20px; }
        .perm-module { padding: 12px; background: var(--bg-primary); border-radius: 10px; border: 1px solid var(--border); }
        .perm-actions { display: flex; flex-wrap: wrap; gap: 12px; }
        .perm-checkbox { display: flex; align-items: center; gap: 6px; font-size: 13px; cursor: pointer; padding: 4px 8px; border-radius: 6px; transition: background 0.15s; }
        .perm-checkbox:hover { background: var(--bg-secondary); }
        .perm-checkbox input[type="checkbox"] { width: 16px; height: 16px; accent-color: var(--accent); cursor: pointer; }
      `}</style>
    </div>
  );
}
