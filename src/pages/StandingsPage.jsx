import { useEffect, useState } from 'react'
import { collection, getDocs, query, where, orderBy, doc, getDoc } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../lib/AuthContext'
import { getTeamById } from '../lib/teams'
import BracketPage from './BracketPage'

export default function StandingsPage() {
  const { user } = useAuth()
  const [pollaList, setPollaList] = useState([])
  const [selectedPollaId, setSelectedPollaId] = useState(null)
  const [standings, setStandings] = useState([])
  const [results, setResults] = useState({})
  const [loading, setLoading] = useState(true)
  const [isClosed, setIsClosed] = useState(false)
  const [viewingUserId, setViewingUserId] = useState(null)
  const [viewingUserName, setViewingUserName] = useState('')

  useEffect(() => {
    const load = async () => {
      const snap = await getDocs(query(collection(db, 'pollas'), where('active', '==', true), orderBy('createdAt', 'desc')))
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      setPollaList(list)
      if (list.length > 0) setSelectedPollaId(list[0].id)
    }
    load()
  }, [])

  useEffect(() => {
    if (!selectedPollaId) return
    setLoading(true)
    const load = async () => {
      try {
        const pollaSnap = await getDoc(doc(db, 'pollas', selectedPollaId))
        if (!pollaSnap.exists()) return
        const pollaData = pollaSnap.data()
        const closed = new Date() >= new Date(pollaData.closesAt?.toDate?.() || pollaData.closesAt)
        setIsClosed(closed)

        // Results
        const resultsSnap = await getDoc(doc(db, 'pollas', selectedPollaId, 'results', 'official'))
        const resData = resultsSnap.exists() ? resultsSnap.data() : {}
        setResults(resData)

        // All picks
        const picksSnap = await getDocs(collection(db, 'pollas', selectedPollaId, 'picks'))
        const rows = picksSnap.docs.map(d => {
          const data = d.data()
          const userPicks = data.picks || {}
          const correct = Object.entries(resData).filter(([mid, wid]) => userPicks[mid] === wid).length
          const champion = userPicks['FINAL'] ? getTeamById(userPicks['FINAL']) : null
          return {
            userId: d.id,
            username: data.username || d.id,
            points: correct * 3,
            correct,
            totalPicks: Object.keys(userPicks).length,
            champion,
          }
        })
        rows.sort((a, b) => b.points - a.points || b.totalPicks - a.totalPicks)
        setStandings(rows)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [selectedPollaId])

  const handleViewUser = (userId, username) => {
    setViewingUserId(userId)
    setViewingUserName(username)
  }

  if (viewingUserId) {
    return (
      <div>
        <button className="btn btn-outline btn-sm" style={{ marginBottom: '1.5rem' }} onClick={() => setViewingUserId(null)}>
          ← Volver a la tabla
        </button>
        <BracketPage viewUserId={viewingUserId} />
      </div>
    )
  }

  if (loading) return <div className="page-loading"><div className="spinner"></div></div>

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '26px', marginBottom: 4 }}>Tabla de posiciones</h2>
        <p style={{ fontSize: '13px', color: 'var(--text-3)' }}>3 puntos por cada acierto</p>
      </div>

      {pollaList.length > 1 && (
        <div style={{ marginBottom: '1rem', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {pollaList.map(p => (
            <button key={p.id} className={`btn btn-sm ${selectedPollaId === p.id ? 'btn-primary' : 'btn-outline'}`} onClick={() => setSelectedPollaId(p.id)}>
              {p.name}
            </button>
          ))}
        </div>
      )}

      {!isClosed && (
        <div className="closed-banner">
          🔒 Los pronósticos aún no han cerrado. La tabla y los pronósticos de los demás estarán disponibles cuando cierren.
        </div>
      )}

      {standings.length === 0 ? (
        <div className="empty-state">
          <div className="emoji">📊</div>
          <h3>Nadie ha apostado aún</h3>
          <p>Sé el primero en ingresar tus pronósticos.</p>
        </div>
      ) : (
        <div className="card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th style={{ width: 40 }}>#</th>
                  <th>Jugador</th>
                  <th>Campeón elegido</th>
                  <th style={{ textAlign: 'center' }}>Picks</th>
                  <th style={{ textAlign: 'center' }}>Aciertos</th>
                  <th style={{ textAlign: 'right' }}>Puntos</th>
                </tr>
              </thead>
              <tbody>
                {standings.map((row, i) => {
                  const isMe = row.userId === user?.uid
                  const canClick = isClosed && row.userId !== user?.uid
                  return (
                    <tr key={row.userId} className={isMe ? 'standings-row-self' : ''}>
                      <td className={`standings-pos ${i < 3 ? 'top' : ''}`}>
                        {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
                      </td>
                      <td>
                        {canClick ? (
                          <button
                            className="btn btn-sm btn-outline"
                            onClick={() => handleViewUser(row.userId, row.username)}
                            style={{ fontWeight: isMe ? 600 : 400 }}
                          >
                            {row.username}
                          </button>
                        ) : (
                          <span style={{ fontWeight: isMe ? 600 : 400 }}>
                            {row.username} {isMe && <span className="badge badge-green" style={{ marginLeft: 4 }}>tú</span>}
                          </span>
                        )}
                      </td>
                      <td>
                        {row.champion ? (
                          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontSize: 18 }}>{row.champion.flag}</span>
                            <span style={{ fontSize: 13 }}>{row.champion.name}</span>
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-3)', fontSize: 13 }}>—</span>
                        )}
                      </td>
                      <td style={{ textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>
                        {row.totalPicks}/31
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span className="badge badge-green">{row.correct}</span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <span className="points-pill">{row.points} pts</span>
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
  )
}
