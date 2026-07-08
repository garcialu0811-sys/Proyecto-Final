'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  MessageSquare, Send, Trash2, EyeOff, Eye, PlusCircle, MessageCircle,
  Clock, User, ThumbsUp, Edit3, X, ChevronDown, ChevronRight,
  Search, Filter, Tag, Menu, ShoppingCart, ShoppingBag,
} from 'lucide-react';
import { useToast } from '@/components/ui/ToastContext';
import ClientSidebar from '@/components/store/ClientSidebar';

interface ForumPost {
  id: string;
  title: string;
  content: string;
  category: 'SUGERENCIA' | 'DUDA' | 'RESENA' | 'GENERAL';
  authorId: string;
  authorName: string;
  createdAt: string;
  isHidden: boolean;
  likes?: string[];
}

interface ForumReply {
  id: string;
  postId: string;
  content: string;
  authorId: string;
  authorName: string;
  parentId?: string;
  createdAt: string;
  isHidden: boolean;
}

export default function ForumPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { showToast } = useToast();
  const currentUser = session?.user as any;
  const role = currentUser?.role || 'CLIENTE';

  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [replies, setReplies] = useState<ForumReply[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [showAddPost, setShowAddPost] = useState(false);
  const [expandedPosts, setExpandedPosts] = useState<Set<string>>(new Set());

  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newCategory, setNewCategory] = useState<'SUGERENCIA' | 'DUDA' | 'RESENA' | 'GENERAL'>('DUDA');
  const [postLoading, setPostLoading] = useState(false);

  const [activeReplyPostId, setActiveReplyPostId] = useState<string | null>(null);
  const [replyToReplyId, setReplyToReplyId] = useState<string | null>(null);
  const [newReplyContent, setNewReplyContent] = useState('');
  const [replyLoading, setReplyLoading] = useState(false);

  const [editingReplyId, setEditingReplyId] = useState<string | null>(null);
  const [editReplyContent, setEditReplyContent] = useState('');
  const [editLoading, setEditLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const fetchForumData = useCallback(async () => {
    setLoading(true);
    try {
      const [postsRes, repliesRes] = await Promise.all([
        fetch('/api/forum/posts'),
        fetch('/api/forum/replies'),
      ]);
      if (postsRes.ok && repliesRes.ok) {
        setPosts(await postsRes.json());
        setReplies(await repliesRes.json());
      }
    } catch {
      showToast('Error al cargar foro.', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === 'unauthenticated') { router.push('/login'); return; }
    if (session) fetchForumData();
  }, [session, status]);

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle || !newContent) { showToast('Completa todos los campos.', 'warning'); return; }
    setPostLoading(true);
    try {
      const res = await fetch('/api/forum/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle, content: newContent, category: newCategory }),
      });
      if (res.ok) {
        showToast('Tema publicado.', 'success');
        setNewTitle(''); setNewContent(''); setShowAddPost(false);
        fetchForumData();
      } else {
        const data = await res.json();
        showToast(data.message || 'Error al publicar.', 'error');
      }
    } catch {
      showToast('Error de red.', 'error');
    } finally {
      setPostLoading(false);
    }
  };

  const handleCreateReply = async (e: React.FormEvent, postId: string) => {
    e.preventDefault();
    if (!newReplyContent.trim()) { showToast('Escribe una respuesta.', 'warning'); return; }
    setReplyLoading(true);
    try {
      const res = await fetch('/api/forum/replies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId, content: newReplyContent, parentId: replyToReplyId || undefined }),
      });
      if (res.ok) {
        showToast('Respuesta agregada.', 'success');
        setNewReplyContent(''); setActiveReplyPostId(null); setReplyToReplyId(null);
        fetchForumData();
      }
    } catch {
      showToast('Error de red.', 'error');
    } finally {
      setReplyLoading(false);
    }
  };

  const handleEditReply = async (replyId: string) => {
    if (!editReplyContent.trim()) return;
    setEditLoading(true);
    try {
      const res = await fetch(`/api/forum/replies/${replyId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: editReplyContent }),
      });
      if (res.ok) { showToast('Respuesta editada.', 'success'); setEditingReplyId(null); fetchForumData(); }
    } catch { showToast('Error de red.', 'error'); }
    finally { setEditLoading(false); }
  };

  const handleDeleteReply = async (replyId: string) => {
    if (!confirm('Eliminar esta respuesta?')) return;
    try {
      const res = await fetch(`/api/forum/replies/${replyId}`, { method: 'DELETE' });
      if (res.ok) { showToast('Respuesta eliminada.', 'success'); fetchForumData(); }
    } catch { showToast('Error de red.', 'error'); }
  };

  const handleTogglePostVisibility = async (postId: string, currentHidden: boolean) => {
    try {
      const res = await fetch(`/api/forum/posts/${postId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isHidden: !currentHidden }),
      });
      if (res.ok) { showToast(currentHidden ? 'Tema visible.' : 'Tema ocultado.', 'success'); fetchForumData(); }
    } catch { showToast('Error de red.', 'error'); }
  };

  const handleDeletePost = async (postId: string) => {
    if (!confirm('Eliminar este tema y todas sus respuestas?')) return;
    try {
      const res = await fetch(`/api/forum/posts/${postId}`, { method: 'DELETE' });
      if (res.ok) { showToast('Tema eliminado.', 'success'); fetchForumData(); }
    } catch { showToast('Error de red.', 'error'); }
  };

  const handleLike = async (postId: string) => {
    try {
      const res = await fetch(`/api/forum/posts/${postId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ like: true, userId: currentUser.id }),
      });
      if (res.ok) fetchForumData();
    } catch {}
  };

  const toggleExpand = (postId: string) => {
    setExpandedPosts(prev => {
      const next = new Set(prev);
      if (next.has(postId)) next.delete(postId);
      else next.add(postId);
      return next;
    });
  };

  const filteredPosts = posts.filter(post => {
    const matchCat = !categoryFilter || post.category === categoryFilter;
    const matchSearch = !searchTerm || post.title.toLowerCase().includes(searchTerm.toLowerCase()) || post.content.toLowerCase().includes(searchTerm.toLowerCase());
    return matchCat && matchSearch;
  });

  const ReplyItem = ({ reply, postId, depth = 0 }: { reply: ForumReply; postId: string; depth?: number }) => {
    const children = replies.filter(r => r.postId === postId && r.parentId === reply.id && !r.isHidden);
    const isAuthor = reply.authorId === currentUser?.id;
    const canEdit = isAuthor || role === 'ADMIN';

    return (
      <div style={{ marginLeft: depth * 20, borderLeft: depth > 0 ? '2px solid var(--border)' : 'none', paddingLeft: depth > 0 ? '12px' : '0' }}>
        <div className="reply-card" style={{ opacity: reply.isHidden ? 0.5 : 1, backgroundColor: 'var(--bg-primary)', borderRadius: '8px', padding: '12px', marginBottom: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <span style={{ fontWeight: 600, fontSize: '13px' }}>{reply.authorName}</span>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-light)' }}>{new Date(reply.createdAt).toLocaleString('es-GT')}</span>
              {canEdit && (
                <>
                  <button onClick={() => { setEditingReplyId(reply.id); setEditReplyContent(reply.content); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent)', display: 'flex' }} title="Editar"><Edit3 size={12} /></button>
                  <button onClick={() => handleDeleteReply(reply.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', display: 'flex' }} title="Eliminar"><Trash2 size={12} /></button>
                </>
              )}
            </div>
          </div>
          {editingReplyId === reply.id ? (
            <div>
              <textarea className="form-control" value={editReplyContent} onChange={e => setEditReplyContent(e.target.value)} rows={2} style={{ fontSize: '13px' }} />
              <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
                <button onClick={() => handleEditReply(reply.id)} className="btn btn-primary" style={{ padding: '4px 10px', fontSize: '11px' }} disabled={editLoading}>Guardar</button>
                <button onClick={() => setEditingReplyId(null)} className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: '11px' }}>Cancelar</button>
              </div>
            </div>
          ) : (
            <p style={{ fontSize: '13px', whiteSpace: 'pre-wrap', marginTop: '4px', color: 'var(--text-secondary)' }}>{reply.content}</p>
          )}
          {depth === 0 && (
            <button onClick={() => { setActiveReplyPostId(postId); setReplyToReplyId(reply.id); setNewReplyContent(''); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent)', fontSize: '11px', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <MessageCircle size={11} /> Responder
            </button>
          )}
        </div>
        {children.map(child => (
          <ReplyItem key={child.id} reply={child} postId={postId} depth={depth + 1} />
        ))}
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--bg-primary)' }}>
      <ClientSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div style={{ flex: 1, marginLeft: '260px', display: 'flex', flexDirection: 'column', minWidth: 0 }} className="main-area">
        <header style={{ height: '64px', backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', padding: '0 24px', gap: '20px', position: 'sticky', top: 0, zIndex: 100 }}>
          <button onClick={() => setSidebarOpen(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-primary)', display: 'none' }} className="hamburger-btn">
            <Menu size={22} />
          </button>
          <div style={{ flex: 1 }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexShrink: 0 }}>
            <button onClick={() => router.push('/store')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', fontWeight: 500, padding: '8px 12px', borderRadius: '8px' }}>
              <ShoppingBag size={18} /> Tienda
            </button>
            {session && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '34px', height: '34px', borderRadius: '50%', backgroundColor: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ color: '#fff', fontWeight: 600, fontSize: '13px' }}>{currentUser?.name?.charAt(0) || 'U'}</span>
                </div>
                <div style={{ lineHeight: 1.2 }}>
                  <p style={{ fontSize: '13px', fontWeight: 600 }}>{currentUser?.name}</p>
                  <p style={{ fontSize: '10px', color: 'var(--text-light)' }}>Cliente</p>
                </div>
              </div>
            )}
          </div>
        </header>

        <div style={{ flex: 1, padding: '24px', maxWidth: '1000px', width: '100%', margin: '0 auto' }}>
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <MessageSquare size={28} style={{ color: 'var(--accent)' }} />
            Foro de la Comunidad
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '4px' }}>
            Comparte ideas, resuelve dudas o escribe resenas.
          </p>
        </div>
        <button onClick={() => setShowAddPost(!showAddPost)} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', borderRadius: '8px', fontWeight: 600 }}>
          {showAddPost ? <><X size={18} /> Ver Discusiones</> : <><PlusCircle size={18} /> Nuevo Tema</>}
        </button>
      </div>

      {showAddPost ? (
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <div className="card" style={{ padding: '24px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <MessageCircle size={20} style={{ color: 'var(--accent)' }} />
              Publicar Nuevo Tema
            </h2>
            <form onSubmit={handleCreatePost}>
              <div className="form-group">
                <label className="form-label">Titulo *</label>
                <input type="text" className="form-control" placeholder="Titulo del tema..." value={newTitle} onChange={e => setNewTitle(e.target.value)} maxLength={100} disabled={postLoading} required />
              </div>
              <div className="form-group">
                <label className="form-label">Categoria *</label>
                <select className="form-control" value={newCategory} onChange={e => setNewCategory(e.target.value as any)} disabled={postLoading}>
                  <option value="DUDA">Duda</option>
                  <option value="SUGERENCIA">Sugerencia</option>
                  <option value="RESENA">Resena</option>
                  <option value="GENERAL">General</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Mensaje * (min. 20 caracteres)</label>
                <textarea className="form-control" rows={5} placeholder="Escribe tu mensaje..." value={newContent} onChange={e => setNewContent(e.target.value)} minLength={20} disabled={postLoading} required />
              </div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowAddPost(false)} className="btn btn-secondary" disabled={postLoading}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={postLoading} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Send size={14} /> Publicar
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : (
        <>
          <div className="card" style={{ padding: '16px 20px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
                <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-light)' }} />
                <input type="text" className="form-control" placeholder="Buscar temas..." value={searchInput} onChange={e => { setSearchInput(e.target.value); setSearchTerm(e.target.value); }} style={{ paddingLeft: '36px', height: '40px' }} />
              </div>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {['', 'DUDA', 'SUGERENCIA', 'RESENA', 'GENERAL'].map(cat => (
                  <button key={cat} onClick={() => setCategoryFilter(cat)} className={`btn ${categoryFilter === cat ? 'btn-primary' : 'btn-secondary'}`} style={{ padding: '6px 12px', fontSize: '12px', borderRadius: '50px' }}>
                    {cat === '' ? 'Todos' : cat.charAt(0) + cat.slice(1).toLowerCase()}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {loading ? (
            <div style={{ padding: '80px', textAlign: 'center' }}>
              <div style={{ display: 'inline-block', width: '40px', height: '40px', border: '3px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
              <p style={{ marginTop: '16px', color: 'var(--text-secondary)' }}>Cargando foro...</p>
            </div>
          ) : filteredPosts.length === 0 ? (
            <div className="card" style={{ padding: '80px', textAlign: 'center' }}>
              <MessageSquare size={48} style={{ color: 'var(--text-light)', margin: '0 auto 16px auto', display: 'block' }} />
              <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>No hay publicaciones</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Se el primero en iniciar un tema.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {filteredPosts.map(post => {
                const postReplies = replies.filter(r => r.postId === post.id && !r.isHidden);
                const likes = post.likes || [];
                const hasLiked = likes.includes(currentUser?.id);
                const isExpanded = expandedPosts.has(post.id);

                return (
                  <div key={post.id} className="card" style={{ opacity: post.isHidden ? 0.6 : 1, borderLeft: post.isHidden ? '4px solid var(--danger)' : '4px solid var(--accent)', padding: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span className={`forum-cat ${post.category.toLowerCase()}`}>{post.category}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px' }}>
                          <User size={13} /><span style={{ fontWeight: 500 }}>{post.authorName}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: 'var(--text-light)' }}>
                          <Clock size={13} /><span>{new Date(post.createdAt).toLocaleString('es-GT')}</span>
                        </div>
                      </div>
                      {role === 'ADMIN' && (
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <button onClick={() => handleTogglePostVisibility(post.id, post.isHidden)} style={{ width: '30px', height: '30px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: post.isHidden ? 'var(--success)' : 'var(--warning)' }} title={post.isHidden ? 'Mostrar' : 'Ocultar'}>
                            {post.isHidden ? <Eye size={14} /> : <EyeOff size={14} />}
                          </button>
                          <button onClick={() => handleDeletePost(post.id)} style={{ width: '30px', height: '30px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--danger)' }} title="Eliminar">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      )}
                    </div>

                    <h2 style={{ fontSize: '17px', fontWeight: 600, marginBottom: '8px' }}>{post.title}</h2>
                    <p style={{ fontSize: '14px', whiteSpace: 'pre-wrap', color: 'var(--text-secondary)' }}>{post.content}</p>

                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginTop: '16px', paddingTop: '12px', borderTop: '1px solid var(--border)' }}>
                      <button onClick={() => handleLike(post.id)} style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'none', border: 'none', cursor: 'pointer', color: hasLiked ? 'var(--accent)' : 'var(--text-secondary)', fontSize: '13px' }}>
                        <ThumbsUp size={14} fill={hasLiked ? 'var(--accent)' : 'none'} /> {likes.length > 0 ? likes.length : ''}
                      </button>
                      <button onClick={() => toggleExpand(post.id)} style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: '13px' }}>
                        {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        {postReplies.length} respuesta{postReplies.length !== 1 ? 's' : ''}
                      </button>
                    </div>

                    {isExpanded && (
                      <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
                        {postReplies.filter(r => !r.parentId).map(reply => (
                          <div key={reply.id} style={{ marginBottom: '12px' }}>
                            <ReplyItem reply={reply} postId={post.id} />
                          </div>
                        ))}

                        {activeReplyPostId === post.id ? (
                          <form onSubmit={e => handleCreateReply(e, post.id)} style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                            <input type="text" className="form-control" placeholder={replyToReplyId ? "Respuesta a respuesta..." : "Escribe tu respuesta..."} value={newReplyContent} onChange={e => setNewReplyContent(e.target.value)} disabled={replyLoading} required style={{ flex: 1 }} />
                            <button type="submit" className="btn btn-primary" style={{ padding: '8px 16px', display: 'flex', gap: '6px' }} disabled={replyLoading}>
                              <Send size={14} />
                            </button>
                            <button type="button" onClick={() => { setActiveReplyPostId(null); setReplyToReplyId(null); }} className="btn btn-secondary" style={{ padding: '8px 12px' }}>
                              <X size={14} />
                            </button>
                          </form>
                        ) : (
                          <button onClick={() => { setActiveReplyPostId(post.id); setReplyToReplyId(null); setNewReplyContent(''); }} className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <MessageCircle size={12} /> Escribir respuesta...
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        @media (max-width: 1024px) {
          .main-area { margin-left: 0 !important; }
          .hamburger-btn { display: flex !important; }
        }
      `}</style>
    </div>
  );
}
