'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  Users, UserPlus, Pencil, Trash2, Search, X, Save, ChevronLeft, ChevronRight,
  Download, RefreshCw, ChevronDown, MoreVertical, Phone, Mail, CheckCircle,
  Shield, ShoppingBag, UserCheck, Filter, ArrowUpDown,
} from 'lucide-react';
import { useToast } from '@/components/ui/ToastContext';

interface UserItem {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  isActive: boolean;
  lastLogin?: string | null;
  createdAt: string;
  image?: string | null;
}

interface Stats {
  total: number;
  active: number;
  admins: number;
  sellers: number;
  clients: number;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

const ROLE_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  ADMIN: { label: 'Administrador', color: '#EF4444', bg: '#FEE2E2' },
  VENDEDOR: { label: 'Vendedor', color: '#3B82F6', bg: '#DBEAFE' },

};

const PERMISSIONS: Record<string, string[]> = {
  ADMIN: ['Gestionar ventas', 'Crear pedidos', 'Ver inventario', 'Gestionar clientes', 'Administrar usuarios', 'Configuracion del sistema'],
  VENDEDOR: ['Gestionar ventas', 'Crear pedidos', 'Ver inventario', 'Gestionar clientes'],

};

function timeAgo(dateStr: string | null | undefined): string {
  if (!dateStr) return 'Nunca';
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffMin < 1) return 'Ahora mismo';
  if (diffMin < 60) return `Hace ${diffMin} min`;
  if (diffHr < 24) return `Hace ${diffHr}h`;
  if (diffDay === 1) return 'Ayer';
  if (diffDay < 30) return `Hace ${diffDay} dias`;
  return date.toLocaleDateString('es-GT', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatLastLogin(dateStr: string | null | undefined): string {
  if (!dateStr) return 'Nunca';
  const now = new Date();
  const date = new Date(dateStr);
  const isToday = date.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();

  const time = date.toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit' });
  if (isToday) return `Hoy, ${time}`;
  if (isYesterday) return `Ayer, ${time}`;
  return `${date.toLocaleDateString('es-GT', { day: 'numeric', month: 'short' })}, ${time}`;
}

export default function UsersPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { showToast } = useToast();
  const currentUser = session?.user as any;

  const [users, setUsers] = useState<UserItem[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 10, total: 0, totalPages: 0, hasNext: false, hasPrev: false });
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [limit] = useState(10);

  const [selectedUser, setSelectedUser] = useState<UserItem | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const [modal, setModal] = useState<'create' | 'edit' | 'delete' | 'role' | null>(null);
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formRole, setFormRole] = useState('VENDEDOR');
  const [formIsActive, setFormIsActive] = useState(true);
  const [editId, setEditId] = useState('');
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editRole, setEditRole] = useState('');
  const [editIsActive, setEditIsActive] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<UserItem | null>(null);
  const [roleTarget, setRoleTarget] = useState<UserItem | null>(null);
  const [roleValue, setRoleValue] = useState('');

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        search,
        role: roleFilter,
        status: statusFilter,
      });
      const res = await fetch(`/api/users?${params}`);
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
        setStats(data.stats || null);
        setPagination(data.pagination || { page: 1, limit: 10, total: 0, totalPages: 0, hasNext: false, hasPrev: false });
        if (data.users?.length > 0 && !selectedUser) {
          setSelectedUser(data.users[0]);
        }
      }
    } catch {
      showToast('Error al obtener usuarios.', 'error');
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, roleFilter, statusFilter]);

  useEffect(() => {
    if (status === 'unauthenticated') { router.push('/login'); return; }
    if (session) {
      if ((session.user as any).role !== 'ADMIN') { showToast('Acceso denegado.', 'error'); router.push('/'); return; }
      fetchUsers();
    }
  }, [session, status, fetchUsers]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpenMenuId(null);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => { setSearch(searchInput); setPage(1); }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName || !formEmail || !formPassword) { showToast('Completa los campos obligatorios.', 'warning'); return; }
    setActionLoading(true);
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: formName, email: formEmail, password: formPassword, phone: formPhone, role: formRole, isActive: formIsActive }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast('Usuario creado exitosamente.', 'success');
        setModal(null);
        fetchUsers();
      } else {
        showToast(data.message || 'Error al crear.', 'error');
      }
    } catch {
      showToast('Error de red.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editId) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/users/${editId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName, email: editEmail, phone: editPhone, role: editRole, isActive: editIsActive }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast('Usuario actualizado.', 'success');
        setModal(null);
        fetchUsers();
      } else {
        showToast(data.message || 'Error al actualizar.', 'error');
      }
    } catch {
      showToast('Error de red.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleStatus = async (u: UserItem) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/users/${u.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !u.isActive }),
      });
      if (res.ok) {
        showToast(u.isActive ? 'Usuario desactivado.' : 'Usuario activado.', 'success');
        fetchUsers();
      }
    } catch {
      showToast('Error de red.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleChangeRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roleTarget || !roleValue) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/users/${roleTarget.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: roleValue }),
      });
      if (res.ok) {
        showToast(`Rol cambiado a ${ROLE_CONFIG[roleValue]?.label || roleValue}.`, 'success');
        setModal(null);
        fetchUsers();
      }
    } catch {
      showToast('Error de red.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/users/${deleteTarget.id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('Usuario eliminado.', 'success');
        setModal(null);
        setSelectedUser(null);
        fetchUsers();
      } else {
        const data = await res.json();
        showToast(data.message || 'Error al eliminar.', 'error');
      }
    } catch {
      showToast('Error de red.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleExport = () => {
    const headers = ['ID', 'Nombre', 'Email', 'Telefono', 'Rol', 'Estado', 'Ultimo acceso', 'Fecha registro'];
    const rows = users.map(u => [
      u.id, u.name, u.email, u.phone || '', u.role,
      u.isActive ? 'Activo' : 'Inactivo',
      u.lastLogin || 'Nunca',
      new Date(u.createdAt).toISOString(),
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `usuarios-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Usuarios exportados.', 'success');
  };

  const getPageNumbers = (): (number | string)[] => {
    const pages: (number | string)[] = [];
    const tp = pagination.totalPages;
    const cp = page;
    if (tp <= 5) { for (let i = 1; i <= tp; i++) pages.push(i); }
    else {
      pages.push(1);
      if (cp > 3) pages.push('...');
      for (let i = Math.max(2, cp - 1); i <= Math.min(tp - 1, cp + 1); i++) pages.push(i);
      if (cp < tp - 2) pages.push('...');
      pages.push(tp);
    }
    return pages;
  };

  const getInitials = (name: string) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const start = (page - 1) * limit + 1;
  const end = Math.min(page * limit, pagination.total);

  return (
    <div>
      <div className="users-header">
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '10px', margin: 0 }}>
            <Users size={28} style={{ color: 'var(--accent)' }} />
            Usuarios
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '4px', margin: '4px 0 0 0' }}>
            Gestiona los usuarios y permisos del sistema.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button onClick={handleExport} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 16px', borderRadius: '8px', fontWeight: 500 }}>
            <Download size={16} /> Exportar
          </button>
          <button onClick={() => { setFormName(''); setFormEmail(''); setFormPassword(''); setFormPhone(''); setFormRole('VENDEDOR'); setFormIsActive(true); setModal('create'); }} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 20px', borderRadius: '8px', fontWeight: 600 }}>
            <UserPlus size={16} /> Nuevo usuario
          </button>
        </div>
      </div>

      {stats && (
        <div className="stats-grid">
          {[
            { title: 'Total de usuarios', value: stats.total, sub: 'Ver todos', icon: <Users size={24} style={{ color: '#6366F1' }} />, iconBg: '#EEF2FF' },
            { title: 'Usuarios activos', value: stats.active, sub: stats.total > 0 ? `${((stats.active / stats.total) * 100).toFixed(1)}% del total` : '0%', icon: <UserCheck size={24} style={{ color: '#10B981' }} />, iconBg: '#ECFDF5' },
            { title: 'Administradores', value: stats.admins, sub: stats.total > 0 ? `${((stats.admins / stats.total) * 100).toFixed(1)}% del total` : '0%', icon: <Shield size={24} style={{ color: '#8B5CF6' }} />, iconBg: '#F5F3FF' },
            { title: 'Vendedores', value: stats.sellers, sub: stats.total > 0 ? `${((stats.sellers / stats.total) * 100).toFixed(1)}% del total` : '0%', icon: <ShoppingBag size={24} style={{ color: '#F59E0B' }} />, iconBg: '#FFFBEB' },
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
      )}

      <div className="filters-bar">
        <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-light)' }} />
          <input type="text" className="form-control" placeholder="Buscar usuarios..." value={searchInput} onChange={e => setSearchInput(e.target.value)} style={{ paddingLeft: '36px', height: '40px', width: '100%' }} />
        </div>
        <select className="form-control filter-select" value={roleFilter} onChange={e => { setRoleFilter(e.target.value); setPage(1); }}>
          <option value="all">Todos los roles</option>
          <option value="ADMIN">Administrador</option>
          <option value="VENDEDOR">Vendedor</option>

        </select>
        <select className="form-control filter-select" value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}>
          <option value="all">Todos los estados</option>
          <option value="active">Activos</option>
          <option value="inactive">Inactivos</option>
        </select>
        <button className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 16px', borderRadius: '8px', height: '40px' }}>
          <Filter size={14} /> Filtros
        </button>
      </div>

      <div className="users-content">
        <div className="users-table-panel">
          {loading ? (
            <div style={{ padding: '40px 16px', textAlign: 'center' }}>
              <div className="spinner"></div>
              <p style={{ marginTop: '16px', color: 'var(--text-secondary)' }}>Cargando usuarios...</p>
            </div>
          ) : users.length === 0 ? (
            <div style={{ padding: '40px 16px', textAlign: 'center' }}>
              <Users size={48} style={{ color: 'var(--text-light)', margin: '0 auto 16px auto', display: 'block' }} />
              <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>No hay usuarios</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>No se encontraron usuarios con los filtros aplicados.</p>
            </div>
          ) : (
            <>
              <div style={{ overflowX: 'auto' }}>
                <table className="users-table">
                  <thead>
                    <tr>
                      <th><span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>Usuario <ArrowUpDown size={12} /></span></th>
                      <th><span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>Correo electronico <ArrowUpDown size={12} /></span></th>
                      <th><span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>Rol <ArrowUpDown size={12} /></span></th>
                      <th><span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>Estado <ArrowUpDown size={12} /></span></th>
                      <th><span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>Ultimo acceso <ArrowUpDown size={12} /></span></th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(u => (
                      <tr key={u.id} onClick={() => setSelectedUser(u)} style={{ cursor: 'pointer', backgroundColor: selectedUser?.id === u.id ? 'var(--accent-light)' : undefined, opacity: u.isActive ? 1 : 0.6 }}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div className="user-avatar" style={{ backgroundColor: ROLE_CONFIG[u.role]?.bg || '#E5E7EB', color: ROLE_CONFIG[u.role]?.color || '#6B7280' }}>
                              {u.image ? <img src={u.image} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} /> : getInitials(u.name)}
                            </div>
                            <span style={{ fontWeight: 600, fontSize: '14px' }}>{u.name}</span>
                          </div>
                        </td>
                        <td style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>{u.email}</td>
                        <td><span className="role-badge" style={{ backgroundColor: ROLE_CONFIG[u.role]?.bg, color: ROLE_CONFIG[u.role]?.color }}>{ROLE_CONFIG[u.role]?.label || u.role}</span></td>
                        <td><span className="status-badge" style={{ backgroundColor: u.isActive ? '#D1FAE5' : '#FEE2E2', color: u.isActive ? '#059669' : '#DC2626' }}>{u.isActive ? 'Activo' : 'Inactivo'}</span></td>
                        <td style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{formatLastLogin(u.lastLogin)}</td>
                        <td>
                          <div style={{ position: 'relative' }} ref={openMenuId === u.id ? menuRef : undefined}>
                            <button onClick={e => { e.stopPropagation(); setOpenMenuId(openMenuId === u.id ? null : u.id); }} className="menu-btn">
                              <MoreVertical size={16} />
                            </button>
                            {openMenuId === u.id && (
                              <div className="dropdown-menu" onClick={e => e.stopPropagation()}>
                                <button onClick={() => { setEditId(u.id); setEditName(u.name); setEditEmail(u.email); setEditPhone(u.phone || ''); setEditRole(u.role); setEditIsActive(u.isActive); setModal('edit'); setOpenMenuId(null); }}>
                                  <Pencil size={14} /> Editar
                                </button>
                                <button onClick={() => { setRoleTarget(u); setRoleValue(u.role); setModal('role'); setOpenMenuId(null); }}>
                                  <Shield size={14} /> Cambiar rol
                                </button>
                                {u.id !== currentUser?.id ? (
                                  <button onClick={() => { handleToggleStatus(u); setOpenMenuId(null); }} style={{ color: u.isActive ? 'var(--warning)' : 'var(--success)' }}>
                                    {u.isActive ? <><X size={14} /> Desactivar</> : <><CheckCircle size={14} /> Activar</>}
                                  </button>
                                ) : null}
                                {u.id !== currentUser?.id && (
                                  <button onClick={() => { setDeleteTarget(u); setModal('delete'); setOpenMenuId(null); }} className="danger">
                                    <Trash2 size={14} /> Eliminar
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="table-footer">
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                  Mostrando {start} a {end} de {pagination.total} usuarios
                </span>
                <div className="pagination">
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={!pagination.hasPrev} className="page-btn"><ChevronLeft size={16} /></button>
                  {getPageNumbers().map((p, i) => (
                    typeof p === 'number' ? (
                      <button key={i} onClick={() => setPage(p)} className={`page-btn ${page === p ? 'active' : ''}`}>{p}</button>
                    ) : (
                      <span key={i} className="page-dots">{p}</span>
                    )
                  ))}
                  <button onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))} disabled={!pagination.hasNext} className="page-btn"><ChevronRight size={16} /></button>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="detail-panel">
          {selectedUser ? (
            <div>
              <div className="detail-header">
                <h3 style={{ fontSize: '16px', fontWeight: 600, margin: 0 }}>Detalle del usuario</h3>
              </div>

              <div className="detail-user-info">
                <div className="detail-avatar" style={{ backgroundColor: ROLE_CONFIG[selectedUser.role]?.bg, color: ROLE_CONFIG[selectedUser.role]?.color }}>
                  {selectedUser.image ? <img src={selectedUser.image} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} /> : getInitials(selectedUser.name)}
                </div>
                <div>
                  <p style={{ fontWeight: 700, fontSize: '16px', margin: 0 }}>{selectedUser.name}</p>
                  <p style={{ fontSize: '13px', color: ROLE_CONFIG[selectedUser.role]?.color, fontWeight: 500, margin: '2px 0 0 0' }}>{ROLE_CONFIG[selectedUser.role]?.label}</p>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '2px 0 0 0', display: 'flex', alignItems: 'center', gap: '4px' }}><Mail size={12} /> {selectedUser.email}</p>
                  {selectedUser.phone && <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '2px 0 0 0', display: 'flex', alignItems: 'center', gap: '4px' }}><Phone size={12} /> +502 {selectedUser.phone}</p>}
                  <span className="status-badge" style={{ backgroundColor: selectedUser.isActive ? '#D1FAE5' : '#FEE2E2', color: selectedUser.isActive ? '#059669' : '#DC2626', marginTop: '6px', display: 'inline-flex' }}>{selectedUser.isActive ? 'Activo' : 'Inactivo'}</span>
                </div>
              </div>

              <div className="detail-section">
                <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>Informacion general</h4>
                <div className="info-table">
                  <div className="info-row"><span className="info-label">ID de usuario</span><span className="info-value" style={{ fontFamily: 'monospace', fontSize: '12px' }}>USR-{selectedUser.id.slice(-4).toUpperCase()}</span></div>
                  <div className="info-row"><span className="info-label">Fecha de registro</span><span className="info-value">{new Date(selectedUser.createdAt).toLocaleDateString('es-GT', { day: 'numeric', month: 'short', year: 'numeric' })}, {new Date(selectedUser.createdAt).toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit' })}</span></div>
                  <div className="info-row"><span className="info-label">Ultimo acceso</span><span className="info-value">{formatLastLogin(selectedUser.lastLogin)}</span></div>
                  <div className="info-row"><span className="info-label">Estado</span><span className="status-badge" style={{ backgroundColor: selectedUser.isActive ? '#D1FAE5' : '#FEE2E2', color: selectedUser.isActive ? '#059669' : '#DC2626' }}>{selectedUser.isActive ? 'Activo' : 'Inactivo'}</span></div>
                </div>
              </div>

              <div className="detail-section">
                <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>Permisos y rol</h4>
                <div className="info-table">
                  <div className="info-row">
                    <span className="info-label">Rol asignado</span>
                    <span className="role-badge" style={{ backgroundColor: ROLE_CONFIG[selectedUser.role]?.bg, color: ROLE_CONFIG[selectedUser.role]?.color }}>{ROLE_CONFIG[selectedUser.role]?.label}</span>
                  </div>
                </div>
                <div style={{ marginTop: '12px' }}>
                  <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>Permisos principales</p>
                  {(PERMISSIONS[selectedUser.role] || []).map((perm, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 0', fontSize: '13px' }}>
                      <CheckCircle size={14} style={{ color: '#10B981', flexShrink: 0 }} />
                      <span>{perm}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="detail-section">
                <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>Acciones rapidas</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <button onClick={() => { setEditId(selectedUser.id); setEditName(selectedUser.name); setEditEmail(selectedUser.email); setEditPhone(selectedUser.phone || ''); setEditRole(selectedUser.role); setEditIsActive(selectedUser.isActive); setModal('edit'); }} className="btn btn-secondary" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '10px' }}>
                    <Pencil size={14} /> Editar usuario
                  </button>
                  {selectedUser.id !== currentUser?.id ? (
                    <button onClick={() => handleToggleStatus(selectedUser)} className="btn btn-secondary" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '10px', color: selectedUser.isActive ? 'var(--warning)' : 'var(--success)', borderColor: selectedUser.isActive ? 'var(--warning)' : 'var(--success)' }}>
                      {selectedUser.isActive ? <><X size={14} /> Desactivar usuario</> : <><CheckCircle size={14} /> Activar usuario</>}
                    </button>
                  ) : (
                    <div style={{ width: '100%', padding: '10px', textAlign: 'center', fontSize: '12px', color: 'var(--text-light)', fontStyle: 'italic', border: '1px dashed var(--border)', borderRadius: '8px' }}>
                      No puedes desactivar tu propia cuenta
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
              <Users size={40} style={{ margin: '0 auto 12px auto', display: 'block', color: 'var(--text-light)' }} />
              <p>Selecciona un usuario para ver su detalle</p>
            </div>
          )}
        </div>
      </div>

      {modal === 'create' && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal-content" style={{ maxWidth: '480px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 style={{ fontSize: '18px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}><UserPlus size={20} style={{ color: 'var(--accent)' }} /> Nuevo Usuario</h2>
              <button className="modal-close" onClick={() => setModal(null)}><X size={20} /></button>
            </div>
            <form onSubmit={handleCreate}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Nombre completo *</label>
                  <input type="text" className="form-control" value={formName} onChange={e => setFormName(e.target.value)} placeholder="Nombre completo" required disabled={actionLoading} />
                </div>
                <div className="form-group">
                  <label className="form-label">Correo electronico *</label>
                  <input type="email" className="form-control" value={formEmail} onChange={e => setFormEmail(e.target.value)} placeholder="correo@ejemplo.com" required disabled={actionLoading} />
                </div>
                <div className="form-group">
                  <label className="form-label">Contrasena * (min. 6 caracteres)</label>
                  <input type="password" className="form-control" value={formPassword} onChange={e => setFormPassword(e.target.value)} minLength={6} required disabled={actionLoading} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="form-group">
                    <label className="form-label">Telefono</label>
                    <input type="text" className="form-control" value={formPhone} onChange={e => setFormPhone(e.target.value)} placeholder="5555-1234" disabled={actionLoading} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Rol</label>
                    <select className="form-control" value={formRole} onChange={e => setFormRole(e.target.value)} disabled={actionLoading}>
                      <option value="VENDEDOR">Vendedor</option>
                      <option value="ADMIN">Administrador</option>
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Estado</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button type="button" onClick={() => setFormIsActive(!formIsActive)} style={{ width: '44px', height: '24px', borderRadius: '12px', border: 'none', backgroundColor: formIsActive ? '#10B981' : '#D1D5DB', position: 'relative', cursor: 'pointer', transition: 'background 0.2s' }}>
                      <div style={{ width: '20px', height: '20px', borderRadius: '50%', backgroundColor: 'white', position: 'absolute', top: '2px', left: formIsActive ? '22px' : '2px', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
                    </button>
                    <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{formIsActive ? 'Activo' : 'Inactivo'}</span>
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
                <button type="button" onClick={() => setModal(null)} className="btn btn-secondary" disabled={actionLoading}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={actionLoading} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Save size={16} /> {actionLoading ? 'Creando...' : 'Crear usuario'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {modal === 'edit' && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal-content" style={{ maxWidth: '480px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 style={{ fontSize: '18px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}><Pencil size={20} style={{ color: 'var(--accent)' }} /> Editar Usuario</h2>
              <button className="modal-close" onClick={() => setModal(null)}><X size={20} /></button>
            </div>
            <form onSubmit={handleEdit}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Nombre completo *</label>
                  <input type="text" className="form-control" value={editName} onChange={e => setEditName(e.target.value)} required disabled={actionLoading} />
                </div>
                <div className="form-group">
                  <label className="form-label">Correo electronico *</label>
                  <input type="email" className="form-control" value={editEmail} onChange={e => setEditEmail(e.target.value)} required disabled={actionLoading} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="form-group">
                    <label className="form-label">Telefono</label>
                    <input type="text" className="form-control" value={editPhone} onChange={e => setEditPhone(e.target.value)} disabled={actionLoading} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Rol</label>
                    <select className="form-control" value={editRole} onChange={e => setEditRole(e.target.value)} disabled={actionLoading}>
                      <option value="VENDEDOR">Vendedor</option>
                      <option value="ADMIN">Administrador</option>
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Estado</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button type="button" onClick={() => setEditIsActive(!editIsActive)} style={{ width: '44px', height: '24px', borderRadius: '12px', border: 'none', backgroundColor: editIsActive ? '#10B981' : '#D1D5DB', position: 'relative', cursor: 'pointer', transition: 'background 0.2s' }}>
                      <div style={{ width: '20px', height: '20px', borderRadius: '50%', backgroundColor: 'white', position: 'absolute', top: '2px', left: editIsActive ? '22px' : '2px', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
                    </button>
                    <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{editIsActive ? 'Activo' : 'Inactivo'}</span>
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
                <button type="button" onClick={() => setModal(null)} className="btn btn-secondary" disabled={actionLoading}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={actionLoading} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Save size={16} /> {actionLoading ? 'Guardando...' : 'Actualizar usuario'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {modal === 'role' && roleTarget && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal-content" style={{ maxWidth: '400px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 style={{ fontSize: '18px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}><Shield size={20} style={{ color: 'var(--accent)' }} /> Cambiar Rol</h2>
              <button className="modal-close" onClick={() => setModal(null)}><X size={20} /></button>
            </div>
            <form onSubmit={handleChangeRole}>
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '16px' }}>
                Cambiar rol de <strong>{roleTarget.name}</strong> a:
              </p>
              <div className="form-group">
                <select className="form-control" value={roleValue} onChange={e => setRoleValue(e.target.value)} disabled={actionLoading}>
        
                  <option value="VENDEDOR">Vendedor</option>
                  <option value="ADMIN">Administrador</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
                <button type="button" onClick={() => setModal(null)} className="btn btn-secondary" disabled={actionLoading}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={actionLoading} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Save size={16} /> {actionLoading ? 'Cambiando...' : 'Cambiar rol'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {modal === 'delete' && deleteTarget && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal-content" style={{ maxWidth: '420px' }} onClick={e => e.stopPropagation()}>
            <div style={{ textAlign: 'center', padding: '24px' }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: '#FEE2E2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto' }}>
                <Trash2 size={28} style={{ color: '#DC2626' }} />
              </div>
              <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>Eliminar Usuario</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '4px' }}>
                Estas seguro de eliminar a <strong>{deleteTarget.name}</strong>?
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

        .users-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; flex-wrap: wrap; gap: 16px; }

        .stats-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 16px; margin-bottom: 24px; }
        @media (max-width: 1024px) { .stats-grid { grid-template-columns: repeat(3, 1fr); } }
        @media (max-width: 640px) { .stats-grid { grid-template-columns: repeat(2, 1fr); } }

        .stat-card { background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 12px; padding: 20px; display: flex; align-items: center; gap: 16px; }
        .stat-icon { width: 48px; height: 48px; border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .stat-title { font-size: 13px; color: var(--text-secondary); margin: 0; }
        .stat-value { font-size: 28px; font-weight: 700; margin: 2px 0; color: var(--text-primary); }
        .stat-sub { font-size: 12px; color: var(--text-light); margin: 0; }

        .filters-bar { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; margin-bottom: 20px; background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 12px; padding: 12px 16px; }
        .filter-select { width: auto; min-width: 160px; height: 40px; padding: 0 12px; }

        .users-content { display: grid; grid-template-columns: 1fr 380px; gap: 20px; align-items: start; }
        @media (max-width: 1200px) { .users-content { grid-template-columns: 1fr; } }

        .users-table-panel { background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 12px; overflow: hidden; }

        .users-table { width: 100%; border-collapse: collapse; }
        .users-table thead tr { border-bottom: 2px solid var(--border); }
        .users-table th { padding: 14px 16px; font-size: 12px; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.5px; text-align: left; white-space: nowrap; }
        .users-table td { padding: 14px 16px; border-bottom: 1px solid var(--border); font-size: 14px; }
        .users-table tbody tr { transition: background 0.15s; }
        .users-table tbody tr:hover { background: var(--bg-primary); }

        .user-avatar { width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; font-weight: 700; font-size: 14px; }

        .role-badge { display: inline-block; padding: 4px 12px; border-radius: 50px; font-size: 12px; font-weight: 600; white-space: nowrap; }
        .status-badge { display: inline-block; padding: 4px 12px; border-radius: 50px; font-size: 12px; font-weight: 600; white-space: nowrap; }

        .menu-btn { width: 32px; height: 32px; border-radius: 8px; border: 1px solid var(--border); background: var(--bg-secondary); display: flex; align-items: center; justify-content: center; cursor: pointer; color: var(--text-secondary); transition: all 0.15s; }
        .menu-btn:hover { background: var(--bg-primary); border-color: var(--accent); color: var(--accent); }

        .dropdown-menu { position: absolute; right: 0; top: 100%; margin-top: 4px; background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 10px; box-shadow: 0 8px 24px rgba(0,0,0,0.12); z-index: 50; min-width: 180px; padding: 6px; }
        .dropdown-menu button { display: flex; align-items: center; gap: 8px; width: 100%; padding: 8px 12px; border: none; background: none; font-size: 13px; color: var(--text-primary); cursor: pointer; border-radius: 6px; text-align: left; transition: background 0.15s; }
        .dropdown-menu button:hover { background: var(--bg-primary); }
        .dropdown-menu button.danger { color: #DC2626; }
        .dropdown-menu button.danger:hover { background: #FEE2E2; }

        .table-footer { display: flex; justify-content: space-between; align-items: center; padding: 14px 16px; border-top: 1px solid var(--border); flex-wrap: wrap; gap: 12px; }
        .pagination { display: flex; gap: 4px; align-items: center; }
        .page-btn { width: 32px; height: 32px; border-radius: 8px; border: 1px solid var(--border); background: var(--bg-secondary); display: flex; align-items: center; justify-content: center; cursor: pointer; font-size: 13px; font-weight: 500; color: var(--text-primary); transition: all 0.15s; }
        .page-btn:hover:not(:disabled) { border-color: var(--accent); color: var(--accent); }
        .page-btn.active { background: var(--accent); color: white; border-color: var(--accent); }
        .page-btn:disabled { opacity: 0.4; cursor: not-allowed; }
        .page-dots { width: 32px; text-align: center; color: var(--text-light); font-size: 13px; }

        .detail-panel { background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 12px; overflow: hidden; position: sticky; top: 20px; }
        .detail-header { padding: 16px 20px; border-bottom: 1px solid var(--border); }
        .detail-user-info { padding: 20px; display: flex; gap: 16px; align-items: flex-start; border-bottom: 1px solid var(--border); }
        .detail-avatar { width: 64px; height: 64px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; font-weight: 700; font-size: 20px; }
        .detail-section { padding: 16px 20px; border-bottom: 1px solid var(--border); }
        .detail-section:last-child { border-bottom: none; }

        .info-table { display: flex; flex-direction: column; gap: 0; }
        .info-row { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid var(--border); }
        .info-row:last-child { border-bottom: none; }
        .info-label { font-size: 13px; color: var(--text-secondary); }
        .info-value { font-size: 13px; font-weight: 500; text-align: right; }

        @media (max-width: 768px) {
          .users-content { grid-template-columns: 1fr; }
          .detail-panel { position: static; }
          .users-table { font-size: 13px; }
          .users-table th:nth-child(5), .users-table td:nth-child(5) { display: none; }
        }
      `}</style>
    </div>
  );
}
