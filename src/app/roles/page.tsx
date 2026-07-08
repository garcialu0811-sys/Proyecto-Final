'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { ShieldCheck, Search, Save, Users, ChevronLeft, ChevronRight } from 'lucide-react';
import { useToast } from '@/components/ui/ToastContext';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
}

export default function RolesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { showToast } = useToast();
  const currentUser = session?.user as any;
  const currentRole = currentUser?.role || 'CLIENTE';

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRoles, setSelectedRoles] = useState<{ [id: string]: string }>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/users');
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
        const rolesMap: { [id: string]: string } = {};
        data.forEach((u: User) => { rolesMap[u.id] = u.role; });
        setSelectedRoles(rolesMap);
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

  const handleRoleSelection = (userId: string, newRole: string) => {
    setSelectedRoles(prev => ({ ...prev, [userId]: newRole }));
  };

  const handleUpdateRole = async (userItem: User) => {
    const nextRole = selectedRoles[userItem.id];
    if (!nextRole) return;

    if (userItem.id === currentUser.id && nextRole !== 'ADMIN') {
      const confirmSelfDowngrade = confirm(
        'Estas a punto de quitarte el rol de Administrador. Perderas acceso a esta seccion. Continuar?'
      );
      if (!confirmSelfDowngrade) return;
    }

    setSavingId(userItem.id);
    try {
      const res = await fetch(`/api/users/${userItem.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: userItem.name, email: userItem.email, role: nextRole }),
      });
      if (res.ok) {
        showToast(`Rol actualizado a ${nextRole}.`, 'success');
        fetchUsers();
      } else {
        const data = await res.json();
        showToast(data.message || 'Error al actualizar.', 'error');
      }
    } catch {
      showToast('Error de red.', 'error');
    } finally {
      setSavingId(null);
    }
  };

  const filteredUsers = users.filter(u =>
    !search || u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase())
  );

  const roleStats = {
    ADMIN: users.filter(u => u.role === 'ADMIN').length,
    VENDEDOR: users.filter(u => u.role === 'VENDEDOR').length,
    CLIENTE: users.filter(u => u.role === 'CLIENTE').length,
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <ShieldCheck size={28} style={{ color: 'var(--accent)' }} />
            Roles y Permisos
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '4px' }}>
            Configura los niveles de permisos para los usuarios registrados.
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        {[
          { title: 'Administradores', value: roleStats.ADMIN, color: 'var(--danger)', bg: 'var(--danger-light)' },
          { title: 'Vendedores', value: roleStats.VENDEDOR, color: 'var(--accent)', bg: 'var(--accent-light)' },
          { title: 'Clientes', value: roleStats.CLIENTE, color: 'var(--success)', bg: 'var(--success-light)' },
        ].map((m, i) => (
          <div key={i} className="card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: m.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <ShieldCheck size={22} style={{ color: m.color }} />
            </div>
            <div>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>{m.title}</p>
              <p style={{ fontSize: '28px', fontWeight: 700, margin: '2px 0 0 0', color: 'var(--text-primary)' }}>{m.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="card" style={{ padding: '16px 20px', marginBottom: '20px' }}>
        <div style={{ position: 'relative', maxWidth: '400px' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-light)' }} />
          <input type="text" className="form-control" placeholder="Buscar usuario..." value={searchInput} onChange={e => { setSearchInput(e.target.value); setSearch(e.target.value); }} style={{ paddingLeft: '36px', height: '40px' }} />
        </div>
      </div>

      <div className="card" style={{ overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '80px', textAlign: 'center' }}>
            <div style={{ display: 'inline-block', width: '40px', height: '40px', border: '3px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
            <p style={{ marginTop: '16px', color: 'var(--text-secondary)' }}>Cargando roles...</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border)', textAlign: 'left' }}>
                  <th style={{ padding: '14px 20px', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Usuario</th>
                  <th style={{ padding: '14px 16px', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Email</th>
                  <th style={{ padding: '14px 16px', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Rol Actual</th>
                  <th style={{ padding: '14px 16px', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Asignar Nuevo Rol</th>
                  <th style={{ padding: '14px 16px', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'center' }}>Accion</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map(userItem => {
                  const tempRole = selectedRoles[userItem.id] || userItem.role;
                  const isModified = tempRole !== userItem.role;
                  return (
                    <tr key={userItem.id} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.15s' }}
                      onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-primary)'}
                      onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                      <td style={{ padding: '14px 20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: 'var(--accent-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontWeight: 700, fontSize: '13px', color: 'var(--accent)' }}>
                            {userItem.name.charAt(0).toUpperCase()}
                          </div>
                          <span style={{ fontWeight: 600, fontSize: '14px' }}>{userItem.name}</span>
                        </div>
                      </td>
                      <td style={{ padding: '14px 16px', fontSize: '14px', color: 'var(--text-secondary)' }}>{userItem.email}</td>
                      <td style={{ padding: '14px 16px' }}>
                        <span className={`role-tag ${userItem.role.toLowerCase()}`}>{userItem.role}</span>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <select className="form-control" value={tempRole} onChange={e => handleRoleSelection(userItem.id, e.target.value)} disabled={savingId === userItem.id} style={{ padding: '6px 10px', fontSize: '12px', maxWidth: '180px' }}>
                          <option value="CLIENTE">Cliente</option>
                          <option value="VENDEDOR">Vendedor</option>
                          <option value="ADMIN">Administrador</option>
                        </select>
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                        <button onClick={() => handleUpdateRole(userItem)} className="btn btn-primary" style={{ padding: '6px 14px', fontSize: '12px', gap: '4px', opacity: isModified ? 1 : 0.5 }} disabled={!isModified || savingId === userItem.id}>
                          <Save size={14} /> {savingId === userItem.id ? 'Guardando...' : 'Aplicar'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <style jsx global>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
