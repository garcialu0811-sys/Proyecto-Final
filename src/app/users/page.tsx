'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  Users, UserPlus, Pencil, Trash2, ToggleLeft, ToggleRight,
  Search, X, Save, ChevronLeft, ChevronRight, CheckCircle,
  ShieldAlert, Mail,
} from 'lucide-react';
import { useToast } from '@/components/ui/ToastContext';

interface UserItem {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
  isActive?: boolean;
}

interface Metrics {
  total: number;
  active: number;
  admins: number;
  vendors: number;
}

export default function UsersPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { showToast } = useToast();
  const currentUser = session?.user as any;
  const currentRole = currentUser?.role || 'CLIENTE';

  const [users, setUsers] = useState<UserItem[]>([]);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 0, hasNext: false, hasPrev: false });

  const [modal, setModal] = useState<'create' | 'edit' | 'delete' | null>(null);
  const [selectedUser, setSelectedUser] = useState<UserItem | null>(null);

  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPass, setFormPass] = useState('');
  const [formRole, setFormRole] = useState('CLIENTE');
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editRole, setEditRole] = useState('');

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/users');
      if (res.ok) {
        const data: UserItem[] = await res.json();
        setUsers(data);

        const active = data.filter(u => u.isActive !== false).length;
        const admins = data.filter(u => u.role === 'ADMIN').length;
        const vendors = data.filter(u => u.role === 'VENDEDOR').length;
        setMetrics({ total: data.length, active, admins, vendors });
      }
    } catch {
      showToast('Error al obtener usuarios.', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === 'unauthenticated') { router.push('/login'); return; }
    if (session) {
      if (currentRole !== 'ADMIN') { showToast('Acceso denegado.', 'error'); router.push('/'); return; }
      fetchUsers();
    }
  }, [session, status]);

  const openCreate = () => {
    setSelectedUser(null);
    setFormName(''); setFormEmail(''); setFormPass(''); setFormRole('CLIENTE');
    setModal('create');
  };

  const openEdit = (u: UserItem) => {
    setSelectedUser(u);
    setEditName(u.name); setEditEmail(u.email); setEditRole(u.role);
    setModal('edit');
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName || !formEmail || !formPass) { showToast('Completa todos los campos.', 'warning'); return; }
    setActionLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: formName, email: formEmail, password: formPass, role: formRole }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast('Usuario creado.', 'success');
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
    if (!selectedUser) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/users/${selectedUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName, email: editEmail, role: editRole }),
      });
      if (res.ok) {
        showToast('Usuario actualizado.', 'success');
        setModal(null);
        fetchUsers();
      } else {
        const data = await res.json();
        showToast(data.message || 'Error al actualizar.', 'error');
      }
    } catch {
      showToast('Error de conexion.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleActive = async (u: UserItem) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/users/${u.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: u.isActive === false, name: u.name, email: u.email, role: u.role }),
      });
      if (res.ok) {
        showToast(u.isActive === false ? 'Usuario activado.' : 'Usuario desactivado.', 'success');
        fetchUsers();
      }
    } catch {
      showToast('Error de conexion.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedUser) return;
    if (selectedUser.id === currentUser.id) { showToast('No puedes eliminar tu cuenta.', 'warning'); return; }
    setActionLoading(true);
    try {
      const res = await fetch(`/api/users/${selectedUser.id}`, { method: 'DELETE' });
      if (res.ok) { showToast('Usuario eliminado.', 'success'); setModal(null); fetchUsers(); }
      else { showToast('Error al eliminar.', 'error'); }
    } catch {
      showToast('Error de conexion.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const filteredUsers = users.filter(u => {
    const matchSearch = !search || u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase());
    const matchRole = !roleFilter || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const tp = pagination.totalPages;
    const cp = pagination.page;
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

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Users size={28} style={{ color: 'var(--accent)' }} />
            Usuarios
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '4px' }}>
            Administra cuentas, roles y estados de usuarios registrados.
          </p>
        </div>
        <button onClick={openCreate} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', borderRadius: '8px', fontWeight: 600 }}>
          <UserPlus size={18} />
          Nuevo usuario
        </button>
      </div>

      {metrics && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
          {[
            { title: 'Total Usuarios', value: metrics.total, icon: <Users size={22} style={{ color: 'var(--accent)' }} />, bg: 'var(--accent-light)' },
            { title: 'Activos', value: metrics.active, icon: <CheckCircle size={22} style={{ color: 'var(--success)' }} />, bg: 'var(--success-light)' },
            { title: 'Administradores', value: metrics.admins, icon: <ShieldAlert size={22} style={{ color: 'var(--danger)' }} />, bg: 'var(--danger-light)' },
            { title: 'Vendedores', value: metrics.vendors, icon: <Mail size={22} style={{ color: 'var(--info)' }} />, bg: 'var(--info-light)' },
          ].map((m, i) => (
            <div key={i} className="card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: m.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {m.icon}
              </div>
              <div>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>{m.title}</p>
                <p style={{ fontSize: '28px', fontWeight: 700, margin: '2px 0 0 0', color: 'var(--text-primary)' }}>{m.value}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="card" style={{ padding: '16px 20px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-light)' }} />
            <input type="text" className="form-control" placeholder="Buscar por nombre o email..." value={searchInput} onChange={e => setSearchInput(e.target.value)} style={{ paddingLeft: '36px', height: '40px' }} />
          </div>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {['', 'ADMIN', 'VENDEDOR', 'CLIENTE'].map(r => (
              <button key={r} onClick={() => setRoleFilter(r)} className={`btn ${roleFilter === r ? 'btn-primary' : 'btn-secondary'}`} style={{ padding: '6px 12px', fontSize: '12px', borderRadius: '50px' }}>
                {r === '' ? 'Todos' : r}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="card" style={{ overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '80px', textAlign: 'center' }}>
            <div style={{ display: 'inline-block', width: '40px', height: '40px', border: '3px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
            <p style={{ marginTop: '16px', color: 'var(--text-secondary)' }}>Cargando usuarios...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div style={{ padding: '80px', textAlign: 'center' }}>
            <Users size={48} style={{ color: 'var(--text-light)', margin: '0 auto 16px auto', display: 'block' }} />
            <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>No hay usuarios</h3>
            <p style={{ color: 'var(--text-secondary)' }}>No se encontraron usuarios con los filtros seleccionados.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border)', textAlign: 'left' }}>
                  <th style={{ padding: '14px 20px', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Usuario</th>
                  <th style={{ padding: '14px 16px', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Email</th>
                  <th style={{ padding: '14px 16px', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Rol</th>
                  <th style={{ padding: '14px 16px', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Estado</th>
                  <th style={{ padding: '14px 16px', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Registro</th>
                  <th style={{ padding: '14px 16px', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'center' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map(u => (
                  <tr key={u.id} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.15s', opacity: u.isActive === false ? 0.6 : 1 }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-primary)'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                    <td style={{ padding: '14px 20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'var(--accent-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontWeight: 700, fontSize: '14px', color: 'var(--accent)' }}>
                          {u.name.charAt(0).toUpperCase()}
                        </div>
                        <span style={{ fontWeight: 600, fontSize: '14px' }}>{u.name}</span>
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: '14px', color: 'var(--text-secondary)' }}>{u.email}</td>
                    <td style={{ padding: '14px 16px' }}>
                      <span className={`role-tag ${u.role.toLowerCase()}`}>{u.role}</span>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{ display: 'inline-block', padding: '4px 12px', borderRadius: '50px', fontSize: '12px', fontWeight: 600, backgroundColor: u.isActive === false ? 'var(--danger-light)' : 'var(--success-light)', color: u.isActive === false ? 'var(--danger)' : 'var(--success)' }}>
                        {u.isActive === false ? 'Inactivo' : 'Activo'}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                      {new Date(u.createdAt).toLocaleDateString('es-GT')}
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                        <button onClick={() => openEdit(u)} title="Editar" style={{ width: '34px', height: '34px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.15s', color: 'var(--accent)' }}
                          onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--accent-light)'; e.currentTarget.style.borderColor = 'var(--accent)'; }}
                          onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'; e.currentTarget.style.borderColor = 'var(--border)'; }}>
                          <Pencil size={15} />
                        </button>
                        <button onClick={() => handleToggleActive(u)} title={u.isActive === false ? 'Activar' : 'Desactivar'} style={{ width: '34px', height: '34px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.15s', color: u.isActive === false ? 'var(--success)' : 'var(--warning)' }}
                          onMouseEnter={e => { e.currentTarget.style.backgroundColor = u.isActive === false ? 'var(--success-light)' : 'var(--warning-light)'; }}
                          onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'; }}>
                          {u.isActive === false ? <ToggleRight size={15} /> : <ToggleLeft size={15} />}
                        </button>
                        <button onClick={() => { setSelectedUser(u); setModal('delete'); }} title="Eliminar" style={{ width: '34px', height: '34px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: u.id === currentUser.id ? 'not-allowed' : 'pointer', transition: 'all 0.15s', color: u.id === currentUser.id ? 'var(--text-light)' : 'var(--danger)', opacity: u.id === currentUser.id ? 0.4 : 1 }}
                          onMouseEnter={e => { if (u.id !== currentUser.id) { e.currentTarget.style.backgroundColor = 'var(--danger-light)'; e.currentTarget.style.borderColor = 'var(--danger)'; } }}
                          onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'; e.currentTarget.style.borderColor = 'var(--border)'; }}>
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modal === 'create' && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal-content" style={{ maxWidth: '480px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 style={{ fontSize: '18px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}><UserPlus size={20} style={{ color: 'var(--accent)' }} /> Nuevo Usuario</h2>
              <button className="modal-close" onClick={() => setModal(null)}><X size={20} /></button>
            </div>
            <form onSubmit={handleCreate}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Nombre *</label>
                  <input type="text" className="form-control" value={formName} onChange={e => setFormName(e.target.value)} placeholder="Nombre completo" required disabled={actionLoading} />
                </div>
                <div className="form-group">
                  <label className="form-label">Email *</label>
                  <input type="email" className="form-control" value={formEmail} onChange={e => setFormEmail(e.target.value)} placeholder="correo@ejemplo.com" required disabled={actionLoading} />
                </div>
                <div className="form-group">
                  <label className="form-label">Contrasena * (min. 6 caracteres)</label>
                  <input type="password" className="form-control" value={formPass} onChange={e => setFormPass(e.target.value)} minLength={6} required disabled={actionLoading} />
                </div>
                <div className="form-group">
                  <label className="form-label">Rol</label>
                  <select className="form-control" value={formRole} onChange={e => setFormRole(e.target.value)} disabled={actionLoading}>
                    <option value="CLIENTE">Cliente</option>
                    <option value="VENDEDOR">Vendedor</option>
                    <option value="ADMIN">Administrador</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
                <button type="button" onClick={() => setModal(null)} className="btn btn-secondary" disabled={actionLoading}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={actionLoading} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Save size={16} /> {actionLoading ? 'Creando...' : 'Crear Usuario'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {modal === 'edit' && selectedUser && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal-content" style={{ maxWidth: '480px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 style={{ fontSize: '18px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}><Pencil size={20} style={{ color: 'var(--accent)' }} /> Editar Usuario</h2>
              <button className="modal-close" onClick={() => setModal(null)}><X size={20} /></button>
            </div>
            <form onSubmit={handleEdit}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Nombre *</label>
                  <input type="text" className="form-control" value={editName} onChange={e => setEditName(e.target.value)} required disabled={actionLoading} />
                </div>
                <div className="form-group">
                  <label className="form-label">Email *</label>
                  <input type="email" className="form-control" value={editEmail} onChange={e => setEditEmail(e.target.value)} required disabled={actionLoading} />
                </div>
                <div className="form-group">
                  <label className="form-label">Rol</label>
                  <select className="form-control" value={editRole} onChange={e => setEditRole(e.target.value)} disabled={actionLoading}>
                    <option value="CLIENTE">Cliente</option>
                    <option value="VENDEDOR">Vendedor</option>
                    <option value="ADMIN">Administrador</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
                <button type="button" onClick={() => setModal(null)} className="btn btn-secondary" disabled={actionLoading}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={actionLoading} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Save size={16} /> {actionLoading ? 'Guardando...' : 'Actualizar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {modal === 'delete' && selectedUser && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal-content" style={{ maxWidth: '420px' }} onClick={e => e.stopPropagation()}>
            <div style={{ textAlign: 'center', padding: '24px' }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: 'var(--danger-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto' }}>
                <Trash2 size={28} style={{ color: 'var(--danger)' }} />
              </div>
              <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>Eliminar Usuario</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '8px' }}>
                Estas seguro de eliminar a <strong>{selectedUser.name}</strong>?
              </p>
              <p style={{ color: 'var(--text-light)', fontSize: '12px' }}>Esta accion no se puede deshacer.</p>
            </div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', padding: '0 24px 24px 24px' }}>
              <button onClick={() => setModal(null)} className="btn btn-secondary" disabled={actionLoading} style={{ flex: 1 }}>Cancelar</button>
              <button onClick={handleDelete} className="btn btn-danger" disabled={actionLoading} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                <Trash2 size={16} /> {actionLoading ? 'Eliminando...' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
