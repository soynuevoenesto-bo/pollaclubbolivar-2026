import { useEffect, useState } from 'react'
import { collection, getDocs, addDoc, doc, updateDoc, deleteDoc, setDoc, getDoc, serverTimestamp, query, orderBy } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../lib/AuthContext'
import { ALL_TEAMS, getTeamById, MATCH_LABELS, ROUND_OF_16_BRACKET, QUARTERFINALS_BRACKET, SEMIFINALS_BRACKET, THIRD_PLACE_BRACKET, FINAL_BRACKET } from '../lib/teams'
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

// Selector de equipo para registrar resultados cuando no se puede deducir el equipo automáticamente
function ResultTeamSelector({ matchId, side, onSelect, current }) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const filtered = ALL_TEAMS.filter(t => t.name.toLowerCase().includes(search.toLowerCase()))
  return (
    <div style={{ position: 'relative' }}>
      <button className="btn btn-sm btn-outline" onClick={() => setOpen(!open)}>
        Elegir equipo ▾
      </button>
      {open && (
        <div style={{ position: 'absolute', zIndex: 50, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, minWidth: 200, top: '100%', left: 0, marginTop: 4, boxShadow: '0 4px 16px rgba(0,0,0,0.12)' }}>
          <input
            className="form-input"
            style={{ borderRadius: '8px 8px 0 0' }}
            placeholder="Buscar..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            autoFocus
          />
          <div style={{ maxHeight: 200, overflowY: 'auto', padding: 4 }}>
            {filtered.map(t => (
              <button
                key={t.id}
                className={`team-option ${current === t.id ? 'selected' : ''}`}
                style={{ width: '100%', marginBottom: 2 }}
                onClick={() => { onSelect(matchId, t.id); setOpen(false); setSearch('') }}
              >
                <span className="flag">{t.flag}</span>
                <span>{t.name}</span>
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

  // --- Exportar CSV ---
  const exportCSV = async () => {
    if (!selectedPollaId) return showMsg('error', 'Selecciona una polla primero.')
    setLoading(true)
    try {
      // Cargar resultados oficiales
      const resSnap = await getDoc(doc(db, 'pollas', selectedPollaId, 'results', 'official'))
      const officialResults = resSnap.exists() ? resSnap.data() : {}

      // Cargar todos los picks
      const picksSnap = await getDocs(collection(db, 'pollas', selectedPollaId, 'picks'))

      // Construir lista de todos los matchIds en orden
      const allMatchIds = [
        ...matches.map(m => m.matchId),
        ...ROUND_OF_16_BRACKET.map(m => m.matchId),
        ...QUARTERFINALS_BRACKET.map(m => m.matchId),
        ...SEMIFINALS_BRACKET.map(m => m.matchId),
        ...THIRD_PLACE_BRACKET.map(m => m.matchId),
        ...FINAL_BRACKET.map(m => m.matchId),
      ]

      // Encabezados
      const headers = [
        'Usuario',
        'Puntos',
        'Aciertos',
        ...allMatchIds.map(id => MATCH_LABELS[id] || id),
      ]

      // Filas por usuario
      const rows = picksSnap.docs.map(d => {
        const data = d.data()
        const userPicks = data.picks || {}
        const correct = Object.entries(officialResults).filter(([mid, wid]) => userPicks[mid] === wid).length
        const points = correct * 3
        const pickCells = allMatchIds.map(mid => {
          const teamId = userPicks[mid]
          if (!teamId) return '—'
          const team = getTeamById(teamId)
          return team ? team.name : teamId
        })
        return [data.username || d.id, points, correct, ...pickCells]
      })

      // Ordenar por puntos desc
      rows.sort((a, b) => b[1] - a[1])

      // Construir CSV
      const escape = (val) => `"${String(val).replace(/"/g, '""')}"`
      const csvContent = [
        headers.map(escape).join(','),
        ...rows.map(r => r.map(escape).join(',')),
      ].join('\n')

      // Descargar
      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      const pollaName = pollas.find(p => p.id === selectedPollaId)?.name || 'polla'
      link.href = url
      link.download = `picks_${pollaName.replace(/\s+/g, '_')}.csv`
      link.click()
      URL.revokeObjectURL(url)
      showMsg('success', 'CSV descargado correctamente.')
    } catch (e) {
      console.error(e)
      showMsg('error', 'Error al exportar.')
    }
    setLoading(false)
  }

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
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: '1rem' }}>
                <p style={{ fontSize: '13px', color: 'var(--text-2)' }}>
                  Haz clic en el equipo ganador para registrar el resultado. Para octavos en adelante, selecciona el equipo ganador de la lista completa ya que los equipos se determinan en tiempo real según los pronósticos.
                </p>
                <button className="btn btn-gold" onClick={exportCSV} disabled={loading}>
                  ⬇ Exportar picks a CSV
                </button>
              </div>

              {/* Bloque reutilizable para una ronda */}
              {[
                {
                  title: '16avos de final',
                  rows: matches.map(m => ({
                    matchId: m.matchId,
                    home: getTeamById(m.homeTeamId),
                    away: getTeamById(m.awayTeamId),
                  }))
                },
                {
                  title: 'Octavos de final',
                  rows: ROUND_OF_16_BRACKET.map(m => ({
                    matchId: m.matchId,
                    home: results[m.homeFrom] ? getTeamById(results[m.homeFrom]) : null,
                    away: results[m.awayFrom] ? getTeamById(results[m.awayFrom]) : null,
                  }))
                },
                {
                  title: 'Cuartos de final',
                  rows: QUARTERFINALS_BRACKET.map(m => ({
                    matchId: m.matchId,
                    home: results[m.homeFrom] ? getTeamById(results[m.homeFrom]) : null,
                    away: results[m.awayFrom] ? getTeamById(results[m.awayFrom]) : null,
                  }))
                },
                {
                  title: 'Semifinales',
                  rows: SEMIFINALS_BRACKET.map(m => ({
                    matchId: m.matchId,
                    home: results[m.homeFrom] ? getTeamById(results[m.homeFrom]) : null,
                    away: results[m.awayFrom] ? getTeamById(results[m.awayFrom]) : null,
                  }))
                },
                {
                  title: '3er y 4to puesto',
                  rows: THIRD_PLACE_BRACKET.map(m => {
                    // Los equipos son los perdedores de las semis
                    const sf1winner = results['M101']
                    const sf2winner = results['M102']
                    const sf1home = results['M97'] ? getTeamById(results['M97']) : null
                    const sf1away = results['M98'] ? getTeamById(results['M98']) : null
                    const sf2home = results['M99'] ? getTeamById(results['M99']) : null
                    const sf2away = results['M100'] ? getTeamById(results['M100']) : null
                    const loser1 = sf1winner
                      ? (sf1winner === sf1home?.id ? sf1away : sf1home)
                      : null
                    const loser2 = sf2winner
                      ? (sf2winner === sf2home?.id ? sf2away : sf2home)
                      : null
                    return { matchId: m.matchId, home: loser1, away: loser2 }
                  })
                },
                {
                  title: 'Final',
                  rows: FINAL_BRACKET.map(m => ({
                    matchId: m.matchId,
                    home: results[m.homeFrom] ? getTeamById(results[m.homeFrom]) : null,
                    away: results[m.awayFrom] ? getTeamById(results[m.awayFrom]) : null,
                  }))
                },
              ].map(({ title, rows }) => (
                <div key={title} className="admin-section">
                  <div className="admin-section-title">{title}</div>
                  <div className="card" style={{ marginBottom: '1rem' }}>
                    <div className="table-wrap">
                      <table>
                        <thead><tr><th>Partido</th><th>Equipo A</th><th>Equipo B</th><th>Ganador registrado</th></tr></thead>
                        <tbody>
                          {rows.map(({ matchId, home, away }) => {
                            const current = results[matchId]
                            return (
                              <tr key={matchId}>
                                <td><span className="badge badge-gray">{MATCH_LABELS[matchId] || matchId}</span></td>
                                <td>
                                  {home ? (
                                    <button
                                      className={`btn btn-sm ${current === home.id ? 'btn-primary' : 'btn-outline'}`}
                                      onClick={() => setResult(matchId, home.id)}
                                    >
                                      {home.flag} {home.name}
                                    </button>
                                  ) : (
                                    <ResultTeamSelector matchId={matchId} side="home" onSelect={setResult} current={current} />
                                  )}
                                </td>
                                <td>
                                  {away ? (
                                    <button
                                      className={`btn btn-sm ${current === away.id ? 'btn-primary' : 'btn-outline'}`}
                                      onClick={() => setResult(matchId, away.id)}
                                    >
                                      {away.flag} {away.name}
                                    </button>
                                  ) : (
                                    <ResultTeamSelector matchId={matchId} side="away" onSelect={setResult} current={current} />
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
              ))}
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
