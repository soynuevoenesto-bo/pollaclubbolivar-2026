import { useEffect, useState } from 'react'
import { collection, getDocs, addDoc, doc, updateDoc, deleteDoc, setDoc, getDoc, serverTimestamp, query, orderBy } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../lib/AuthContext'
import { ALL_TEAMS, getTeamById, MATCH_LABELS } from '../lib/teams'
import { useNavigate } from 'react-router-dom'

// Team selector component
function TeamSelector({ value, onChange, label, excludeId }) {
  const teams = ALL_TEAMS.filter(t => t.id !== excludeId)
  const selected = value ? getTeamById(value) : null
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')

  const filtered = teams.filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase()) || t.group.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div>
      <label className="form-label">{label}</label>
      <button
        type="button"
        className="form-input"
        style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', textAlign: 'left', background: 'var(--surface)' }}
        onClick={() => setOpen(!open)}
      >
        {selected ? (
          <><span style={{ fontSize: 18 }}>{selected.flag}</span><span>{selected.name}</span></>
        ) : (
          <span style={{ color: 'var(--text-3)' }}>Seleccionar equipo...</span>
        )}
      </button>
      {open && (
        <div style={{ border: '1px solid var(--border)', borderRadius: 8, marginTop: 4, background: 'var(--surface)', zIndex: 10, position: 'relative' }}>
          <input
            className="form-input"
            style={{ borderRadius: '8px 8px 0 0', borderBottom: '1px solid var(--border)' }}
            placeholder="Buscar equipo..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            autoFocus
          />
          <div style={{ maxHeight: 240, overflowY: 'auto', padding: 4 }}>
            {filtered.map(t => (
              <button
                key={t.id}
                type="button"
                className="team-option"
                style={{ width: '100%', marginBottom: 2 }}
                onClick={() => { onChange(t.id); setOpen(false); setSearch('') }}
              >
                <span className="flag">{t.flag}</span>
                <span>{t.name}</span>
                <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-3)' }}>G-{t.group}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default function AdminPage() {
  const { isAdmin } = useAuth()
  const navigate = useNavigate()

  const [tab, setTab] = useState('pollas')
  const [pollas, setPollas] = useState([])
  const [users, setUsers] = useState([])
  const [selectedPollaId, setSelectedPollaId] = useState(null)
  const [matches, setMatches] = useState([])
  const [results, setResults] = useState({})
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState({ type: '', text: '' })

  // Polla form
  const [pollaName, setPollaName] = useState('')
  const [pollaCloses, setPollaCloses] = useState('')

  // Match form
  const [editMatch, setEditMatch] = useState(null)
  const [matchForm, setMatchForm] = useState({
    matchId: '',
    homeTeamId: '',
    awayTeamId: '',
    datetime: '',
    order: 0,
  })

  useEffect(() => {
    if (!isAdmin) navigate('/')
  }, [isAdmin])

  const showMsg = (type, text) => { setMsg({ type, text }); setTimeout(() => setMsg({ type: '', text: '' }), 4000) }

  const loadPollas = async () => {
    const snap = await getDocs(query(collection(db, 'pollas'), orderBy('createdAt', 'desc')))
    setPollas(snap.docs.map(d => ({ id: d.id, ...d.data() })))
  }

  const loadUsers = async () => {
    const snap = await getDocs(collection(db, 'users'))
    setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })))
  }

  const loadMatches = async (pollaId) => {
    if (!pollaId) return
    const snap = await getDocs(query(collection(db, 'pollas', pollaId, 'matches'), orderBy('order')))
    setMatches(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    const resSnap = await getDoc(doc(db, 'pollas', pollaId, 'results', 'official'))
    setResults(resSnap.exists() ? resSnap.data() : {})
  }

  useEffect(() => { loadPollas(); loadUsers() }, [])
  useEffect(() => { if (selectedPollaId) loadMatches(selectedPollaId) }, [selectedPollaId])

  // --- Polla CRUD ---
  const createPolla = async (e) => {
    e.preventDefault()
    if (!pollaName || !pollaCloses) return showMsg('error', 'Completa todos los campos.')
    setLoading(true)
    try {
      await addDoc(collection(db, 'pollas'), {
        name: pollaName,
        closesAt: new Date(pollaCloses),
        active: true,
        createdAt: serverTimestamp(),
      })
      setPollaName('')
      setPollaCloses('')
      await loadPollas()
      showMsg('success', 'Polla creada.')
    } catch { showMsg('error', 'Error al crear la polla.') }
    setLoading(false)
  }

  const togglePolla = async (polla) => {
    await updateDoc(doc(db, 'pollas', polla.id), { active: !polla.active })
    await loadPollas()
  }

  const deletePolla = async (id) => {
    if (!confirm('¿Eliminar esta polla? Esta acción no se puede deshacer.')) return
    await deleteDoc(doc(db, 'pollas', id))
    if (selectedPollaId === id) setSelectedPollaId(null)
    await loadPollas()
  }

  // --- Match CRUD ---
  const MATCH_IDS_16 = ['M73','M74','M75','M76','M77','M78','M79','M80','M81','M82','M83','M84','M85','M86','M87','M88']
  const usedMatchIds = matches.map(m => m.matchId)
  const availableMatchIds = MATCH_IDS_16.filter(id => !usedMatchIds.includes(id) || id === matchForm.matchId)

  const openNewMatch = () => {
    const nextId = availableMatchIds[0] || ''
    const nextOrder = matches.length
    setMatchForm({ matchId: nextId, homeTeamId: '', awayTeamId: '', datetime: '', order: nextOrder })
    setEditMatch('new')
  }

  const openEditMatch = (m) => {
    const dtStr = m.datetime ? new Date(m.datetime).toISOString().slice(0, 16) : ''
    setMatchForm({ matchId: m.matchId, homeTeamId: m.homeTeamId || '', awayTeamId: m.awayTeamId || '', datetime: dtStr, order: m.order || 0 })
    setEditMatch(m.id)
  }

  const saveMatch = async (e) => {
    e.preventDefault()
    if (!selectedPollaId) return showMsg('error', 'Selecciona una polla primero.')
    if (!matchForm.matchId || !matchForm.homeTeamId || !matchForm.awayTeamId) return showMsg('error', 'Completa todos los campos del partido.')
    setLoading(true)
    try {
      const data = {
        matchId: matchForm.matchId,
        homeTeamId: matchForm.homeTeamId,
        awayTeamId: matchForm.awayTeamId,
        datetime: matchForm.datetime ? new Date(matchForm.datetime) : null,
        order: Number(matchForm.order),
        round: '16avos',
      }
      if (editMatch === 'new') {
        await addDoc(collection(db, 'pollas', selectedPollaId, 'matches'), data)
      } else {
        await updateDoc(doc(db, 'pollas', selectedPollaId, 'matches', editMatch), data)
      }
      setEditMatch(null)
      await loadMatches(selectedPollaId)
      showMsg('success', 'Partido guardado.')
    } catch { showMsg('error', 'Error al guardar el partido.') }
    setLoading(false)
  }

  const deleteMatch = async (id) => {
    if (!confirm('¿Eliminar este partido?')) return
    await deleteDoc(doc(db, 'pollas', selectedPollaId, 'matches', id))
    await loadMatches(selectedPollaId)
  }

  // --- Results ---
  const setResult = async (matchId, teamId) => {
    const newResults = { ...results, [matchId]: teamId }
    await setDoc(doc(db, 'pollas', selectedPollaId, 'results', 'official'), newResults)
    setResults(newResults)
    showMsg('success', `Resultado de ${MATCH_LABELS[matchId]} guardado.`)
  }

  // --- Users ---
  const toggleAdmin = async (userId, current) => {
    await updateDoc(doc(db, 'users', userId), { isAdmin: !current })
    await loadUsers()
  }

  const deleteUser = async (userId) => {
    if (!confirm('¿Eliminar este usuario? Solo se elimina de Firestore, no de Authentication.')) return
    await deleteDoc(doc(db, 'users', userId))
    await loadUsers()
  }

  if (!isAdmin) return null

  return (
    <div>
      <h2 style={{ fontSize: '28px', marginBottom: '0.25rem' }}>Panel de administración</h2>
      <p style={{ fontSize: '13px', color: 'var(--text-3)', marginBottom: '1.5rem' }}>Solo visible para el administrador</p>

      {msg.text && <div className={`alert alert-${msg.type === 'error' ? 'error' : 'success'}`}>{msg.text}</div>}

      <div className="tabs">
        {['pollas', 'matches', 'results', 'users'].map(t => (
          <button key={t} className={`tab-btn ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
            {{ pollas: 'Pollas', matches: 'Partidos 16avos', results: 'Resultados', users: 'Usuarios' }[t]}
          </button>
        ))}
      </div>

      {/* ── POLLAS TAB ── */}
      {tab === 'pollas' && (
        <div>
          <div className="admin-section">
            <div className="admin-section-title">Crear nueva polla</div>
            <div className="card card-body" style={{ maxWidth: 500 }}>
              <form onSubmit={createPolla}>
                <div className="form-group">
                  <label className="form-label">Nombre de la polla</label>
                  <input className="form-input" value={pollaName} onChange={e => setPollaName(e.target.value)} placeholder="Mundial 2026 — Oficina" />
                </div>
                <div className="form-group">
                  <label className="form-label">Cierre de pronósticos (UTC-4)</label>
                  <input className="form-input" type="datetime-local" value={pollaCloses} onChange={e => setPollaCloses(e.target.value)} />
                </div>
                <button type="submit" className="btn btn-primary" disabled={loading}>Crear polla</button>
              </form>
            </div>
          </div>

          <div className="admin-section">
            <div className="admin-section-title">Pollas existentes</div>
            {pollas.length === 0 ? (
              <div className="empty-state"><div className="emoji">🏆</div><h3>No hay pollas</h3><p>Crea tu primera polla arriba.</p></div>
            ) : (
              <div className="card">
                <div className="table-wrap">
                  <table>
                    <thead><tr><th>Nombre</th><th>Cierra</th><th>Estado</th><th>Acciones</th></tr></thead>
                    <tbody>
                      {pollas.map(p => {
                        const closes = p.closesAt?.toDate ? p.closesAt.toDate() : new Date(p.closesAt)
                        return (
                          <tr key={p.id}>
                            <td style={{ fontWeight: 500 }}>{p.name}</td>
                            <td style={{ fontSize: 13, color: 'var(--text-2)' }}>
                              {closes.toLocaleString('es-CL', { timeZone: 'America/Caracas' })} (UTC-4)
                            </td>
                            <td>
                              <span className={`badge ${p.active ? 'badge-green' : 'badge-gray'}`}>
                                {p.active ? 'Activa' : 'Inactiva'}
                              </span>
                            </td>
                            <td>
                              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                <button className="btn btn-sm btn-outline" onClick={() => { setSelectedPollaId(p.id); setTab('matches') }}>
                                  Partidos
                                </button>
                                <button className="btn btn-sm btn-outline" onClick={() => togglePolla(p)}>
                                  {p.active ? 'Desactivar' : 'Activar'}
                                </button>
                                <button className="btn btn-sm btn-danger" onClick={() => deletePolla(p.id)}>Eliminar</button>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── MATCHES TAB ── */}
      {tab === 'matches' && (
        <div>
          {/* Polla selector */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label className="form-label" style={{ marginBottom: 6, display: 'block' }}>Polla</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {pollas.map(p => (
                <button key={p.id} className={`btn btn-sm ${selectedPollaId === p.id ? 'btn-primary' : 'btn-outline'}`} onClick={() => setSelectedPollaId(p.id)}>
                  {p.name}
                </button>
              ))}
            </div>
          </div>

          {!selectedPollaId ? (
            <div className="alert alert-info">Selecciona una polla para gestionar sus partidos.</div>
          ) : (
            <>
              <div className="admin-section">
                <div className="admin-section-title">Partidos de 16avos ({matches.length}/16)</div>

                {editMatch && (
                  <div className="card card-body" style={{ marginBottom: '1.5rem', maxWidth: 520 }}>
                    <h3 style={{ fontSize: '16px', marginBottom: '1rem' }}>{editMatch === 'new' ? 'Nuevo partido' : 'Editar partido'}</h3>
                    <form onSubmit={saveMatch}>
                      <div className="form-group">
                        <label className="form-label">ID de partido (según reglamento)</label>
                        <select
                          className="form-input"
                          value={matchForm.matchId}
                          onChange={e => setMatchForm(f => ({ ...f, matchId: e.target.value }))}
                        >
                          {availableMatchIds.map(id => (
                            <option key={id} value={id}>{id} — {MATCH_LABELS[id]}</option>
                          ))}
                        </select>
                      </div>
                      <div className="match-form-grid">
                        <TeamSelector
                          label="Equipo local (A)"
                          value={matchForm.homeTeamId}
                          onChange={v => setMatchForm(f => ({ ...f, homeTeamId: v }))}
                          excludeId={matchForm.awayTeamId}
                        />
                        <TeamSelector
                          label="Equipo visitante (B)"
                          value={matchForm.awayTeamId}
                          onChange={v => setMatchForm(f => ({ ...f, awayTeamId: v }))}
                          excludeId={matchForm.homeTeamId}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Fecha y hora (local, se mostrará en UTC-4)</label>
                        <input className="form-input" type="datetime-local" value={matchForm.datetime} onChange={e => setMatchForm(f => ({ ...f, datetime: e.target.value }))} />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Orden de aparición</label>
                        <input className="form-input" type="number" value={matchForm.order} onChange={e => setMatchForm(f => ({ ...f, order: e.target.value }))} min={0} />
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button type="submit" className="btn btn-primary" disabled={loading}>Guardar</button>
                        <button type="button" className="btn btn-outline" onClick={() => setEditMatch(null)}>Cancelar</button>
                      </div>
                    </form>
                  </div>
                )}

                <div style={{ marginBottom: '1rem' }}>
                  <button className="btn btn-primary btn-sm" onClick={openNewMatch} disabled={matches.length >= 16}>
                    + Agregar partido
                  </button>
                </div>

                {matches.length === 0 ? (
                  <div className="empty-state"><div className="emoji">⚽</div><h3>Sin partidos</h3><p>Agrega los 16 partidos de dieciseisavos de final.</p></div>
                ) : (
                  <div className="card">
                    <div className="table-wrap">
                      <table>
                        <thead><tr><th>#</th><th>ID</th><th>Local</th><th>Visitante</th><th>Fecha (UTC-4)</th><th>Acciones</th></tr></thead>
                        <tbody>
                          {matches.map((m, i) => {
                            const home = getTeamById(m.homeTeamId)
                            const away = getTeamById(m.awayTeamId)
                            const dt = m.datetime?.toDate ? m.datetime.toDate() : m.datetime ? new Date(m.datetime) : null
                            return (
                              <tr key={m.id}>
                                <td style={{ color: 'var(--text-3)', fontSize: 12 }}>{i + 1}</td>
                                <td><span className="badge badge-gray">{m.matchId}</span></td>
                                <td>
                                  {home ? <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ fontSize: 18 }}>{home.flag}</span><span style={{ fontSize: 13 }}>{home.name}</span></span> : '—'}
                                </td>
                                <td>
                                  {away ? <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ fontSize: 18 }}>{away.flag}</span><span style={{ fontSize: 13 }}>{away.name}</span></span> : '—'}
                                </td>
                                <td style={{ fontSize: 12, color: 'var(--text-2)' }}>
                                  {dt ? dt.toLocaleString('es-CL', { timeZone: 'America/Caracas', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}
                                </td>
                                <td>
                                  <div style={{ display: 'flex', gap: 6 }}>
                                    <button className="btn btn-sm btn-outline" onClick={() => openEditMatch(m)}>Editar</button>
                                    <button className="btn btn-sm btn-danger" onClick={() => deleteMatch(m.id)}>Borrar</button>
                                  </div>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── RESULTS TAB ── */}
      {tab === 'results' && (
        <div>
          <div style={{ marginBottom: '1.5rem' }}>
            <label className="form-label" style={{ marginBottom: 6, display: 'block' }}>Polla</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {pollas.map(p => (
                <button key={p.id} className={`btn btn-sm ${selectedPollaId === p.id ? 'btn-primary' : 'btn-outline'}`} onClick={() => setSelectedPollaId(p.id)}>
                  {p.name}
                </button>
              ))}
            </div>
          </div>

          {!selectedPollaId ? (
            <div className="alert alert-info">Selecciona una polla.</div>
          ) : matches.length === 0 ? (
            <div className="alert alert-info">Carga los partidos de 16avos primero.</div>
          ) : (
            <div>
              <p style={{ fontSize: '13px', color: 'var(--text-2)', marginBottom: '1rem' }}>
                Haz clic en el equipo ganador de cada partido para registrar el resultado. Esto actualiza los puntos de todos los participantes automáticamente.
              </p>
              <div className="card">
                <div className="table-wrap">
                  <table>
                    <thead><tr><th>Partido</th><th>Local</th><th>Visitante</th><th>Ganador registrado</th></tr></thead>
                    <tbody>
                      {matches.map(m => {
                        const home = getTeamById(m.homeTeamId)
                        const away = getTeamById(m.awayTeamId)
                        const current = results[m.matchId]
                        return (
                          <tr key={m.id}>
                            <td><span className="badge badge-gray">{m.matchId}</span></td>
                            <td>
                              {home && (
                                <button
                                  className={`btn btn-sm ${current === home.id ? 'btn-primary' : 'btn-outline'}`}
                                  onClick={() => setResult(m.matchId, home.id)}
                                >
                                  {home.flag} {home.name}
                                </button>
                              )}
                            </td>
                            <td>
                              {away && (
                                <button
                                  className={`btn btn-sm ${current === away.id ? 'btn-primary' : 'btn-outline'}`}
                                  onClick={() => setResult(m.matchId, away.id)}
                                >
                                  {away.flag} {away.name}
                                </button>
                              )}
                            </td>
                            <td>
                              {current ? (
                                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                  <span style={{ fontSize: 18 }}>{getTeamById(current)?.flag}</span>
                                  <span style={{ fontSize: 13, fontWeight: 500 }}>{getTeamById(current)?.name}</span>
                                  <span className="badge badge-green">✓</span>
                                </span>
                              ) : <span style={{ color: 'var(--text-3)', fontSize: 12 }}>Sin resultado</span>}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── USERS TAB ── */}
      {tab === 'users' && (
        <div>
          <div className="admin-section">
            <div className="admin-section-title">Usuarios registrados ({users.length})</div>
            {users.length === 0 ? (
              <div className="empty-state"><div className="emoji">👤</div><h3>Sin usuarios</h3></div>
            ) : (
              <div className="card">
                <div className="table-wrap">
                  <table>
                    <thead><tr><th>Usuario</th><th>Email interno</th><th>Rol</th><th>Acciones</th></tr></thead>
                    <tbody>
                      {users.map(u => (
                        <tr key={u.id}>
                          <td style={{ fontWeight: 500 }}>{u.username || u.id}</td>
                          <td style={{ fontSize: 12, color: 'var(--text-3)' }}>{u.email || '—'}</td>
                          <td>
                            <span className={`badge ${u.isAdmin ? 'badge-gold' : 'badge-gray'}`}>
                              {u.isAdmin ? 'Admin' : 'Usuario'}
                            </span>
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: 6 }}>
                              <button className="btn btn-sm btn-outline" onClick={() => toggleAdmin(u.id, u.isAdmin)}>
                                {u.isAdmin ? 'Quitar admin' : 'Hacer admin'}
                              </button>
                              <button className="btn btn-sm btn-danger" onClick={() => deleteUser(u.id)}>Eliminar</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
