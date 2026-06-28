import { useEffect, useState, useCallback } from 'react'
import { doc, getDoc, setDoc, collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../lib/AuthContext'
import { getTeamById, ROUND_OF_16_BRACKET, QUARTERFINALS_BRACKET, SEMIFINALS_BRACKET, FINAL_BRACKET, MATCH_LABELS } from '../lib/teams'

// Get team info from picks map
const getTeamFromPick = (matchId, picks) => {
  const teamId = picks[matchId]
  if (!teamId) return null
  return getTeamById(teamId)
}

// Get the team that won a given match in a given set of picks
const resolveWinner = (matchId, picks) => getTeamFromPick(matchId, picks)

// Slot component: a clickable team button in a match card
function MatchSlot({ team, matchId, opponentMatchId, picks, onPick, locked, isResult, actual }) {
  if (!team) {
    return (
      <div className="match-slot" style={{ cursor: 'default' }}>
        <span className="slot-tbd">Por definir</span>
      </div>
    )
  }
  const isSelected = picks[matchId] === team.id
  const isWinner = actual && actual === team.id
  const isCorrect = isResult && isWinner
  const isWrong = isResult && picks[matchId] === team.id && !isWinner

  let style = {}
  if (isCorrect) style = { background: 'var(--green)', color: '#fff' }
  else if (isWrong) style = { background: 'var(--red-pale)' }

  return (
    <button
      className={`match-slot${isSelected && !isResult ? ' selected' : ''}`}
      style={style}
      onClick={() => !locked && !isResult && onPick(matchId, team.id)}
      disabled={locked || isResult}
      title={locked ? 'Pronósticos cerrados' : ''}
    >
      <span className="slot-flag">{team.flag}</span>
      <span className="slot-name">{team.name}</span>
      {isSelected && !isResult && <span className="slot-check">✓</span>}
      {isCorrect && <span className="slot-check">✓</span>}
      {isWrong && <span style={{ fontSize: 12, marginLeft: 'auto', color: 'var(--red)' }}>✗</span>}
    </button>
  )
}

// A single match card
function MatchCard({ match, homeTeam, awayTeam, picks, onPick, locked, results, roundName }) {
  const actual = results?.[match.matchId]
  const isResult = !!actual

  const dateStr = match.datetime
    ? new Date(match.datetime).toLocaleString('es-CL', { timeZone: 'America/Caracas', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    : null

  return (
    <div className="match-card">
      <div className="match-number">{MATCH_LABELS[match.matchId] || match.matchId}</div>
      <MatchSlot team={homeTeam} matchId={match.matchId} picks={picks} onPick={onPick} locked={locked} isResult={isResult} actual={actual} />
      <MatchSlot team={awayTeam} matchId={match.matchId} picks={picks} onPick={onPick} locked={locked} isResult={isResult} actual={actual} />
      {dateStr && <div className="match-date">{dateStr} (UTC-4)</div>}
    </div>
  )
}

export default function BracketPage({ viewUserId = null }) {
  const { user, userData } = useAuth()
  const [polla, setPolla] = useState(null)
  const [matches16, setMatches16] = useState([])
  const [picks, setPicks] = useState({})
  const [savedPicks, setSavedPicks] = useState({})
  const [results, setResults] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [viewUser, setViewUser] = useState(null)
  const [pollaList, setPollaList] = useState([])
  const [selectedPollaId, setSelectedPollaId] = useState(null)

  const targetUserId = viewUserId || user?.uid
  const isOwnBracket = !viewUserId || viewUserId === user?.uid

  // Load active pollas
  useEffect(() => {
    const load = async () => {
      const snap = await getDocs(query(collection(db, 'pollas'), where('active', '==', true), orderBy('createdAt', 'desc')))
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      setPollaList(list)
      if (list.length > 0) setSelectedPollaId(list[0].id)
    }
    load()
  }, [])

  // Load polla, matches, picks, results
  useEffect(() => {
    if (!selectedPollaId || !targetUserId) return
    setLoading(true)
    const load = async () => {
      try {
        // Polla
        const pollaSnap = await getDoc(doc(db, 'pollas', selectedPollaId))
        if (!pollaSnap.exists()) return
        const pollaData = { id: pollaSnap.id, ...pollaSnap.data() }
        setPolla(pollaData)

        // 16avos matches
        const matchSnap = await getDocs(
          query(collection(db, 'pollas', selectedPollaId, 'matches'), orderBy('order'))
        )
        setMatches16(matchSnap.docs.map(d => ({ id: d.id, ...d.data() })))

        // Results
        const resultsSnap = await getDoc(doc(db, 'pollas', selectedPollaId, 'results', 'official'))
        if (resultsSnap.exists()) setResults(resultsSnap.data())

        // Picks for target user
        const picksSnap = await getDoc(doc(db, 'pollas', selectedPollaId, 'picks', targetUserId))
        if (picksSnap.exists()) {
          setPicks(picksSnap.data().picks || {})
          setSavedPicks(picksSnap.data().picks || {})
        } else {
          setPicks({})
          setSavedPicks({})
        }

        // If viewing another user
        if (viewUserId && viewUserId !== user?.uid) {
          const uSnap = await getDoc(doc(db, 'users', viewUserId))
          if (uSnap.exists()) setViewUser(uSnap.data())
        }
      } catch (e) {
        setError('Error cargando el bracket.')
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [selectedPollaId, targetUserId, viewUserId])

  const isClosed = polla ? new Date() >= new Date(polla.closesAt?.toDate?.() || polla.closesAt) : false
  const locked = isClosed || !isOwnBracket

  const handlePick = useCallback((matchId, teamId) => {
    setPicks(prev => ({ ...prev, [matchId]: teamId }))
    setSuccess('')
  }, [])

  const handleSave = async () => {
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      await setDoc(doc(db, 'pollas', selectedPollaId, 'picks', user.uid), {
        picks,
        userId: user.uid,
        username: userData?.username || 'Sin nombre',
        updatedAt: new Date(),
      })
      setSavedPicks(picks)
      setSuccess('¡Pronósticos guardados!')
      setTimeout(() => setSuccess(''), 3000)
    } catch (e) {
      setError('Error al guardar. Inténtalo de nuevo.')
    } finally {
      setSaving(false)
    }
  }

  // Build bracket matches from picks
  const buildAdvancedMatch = (matchDef) => {
    const homeTeamId = resolveWinner(matchDef.homeFrom, picks)?.id
    const awayTeamId = resolveWinner(matchDef.awayFrom, picks)?.id
    return {
      matchId: matchDef.matchId,
      homeFrom: matchDef.homeFrom,
      awayFrom: matchDef.awayFrom,
      homeTeam: homeTeamId ? getTeamById(homeTeamId) : null,
      awayTeam: awayTeamId ? getTeamById(awayTeamId) : null,
    }
  }

  const r16Matches = matches16.map(m => ({
    ...m,
    matchId: m.matchId || m.id,
    homeTeam: m.homeTeamId ? getTeamById(m.homeTeamId) : null,
    awayTeam: m.awayTeamId ? getTeamById(m.awayTeamId) : null,
  }))

  const r8Matches = ROUND_OF_16_BRACKET.map(buildAdvancedMatch)
  const qfMatches = QUARTERFINALS_BRACKET.map(buildAdvancedMatch)
  const sfMatches = SEMIFINALS_BRACKET.map(buildAdvancedMatch)
  const finalMatch = FINAL_BRACKET.map(buildAdvancedMatch)

  const champion = picks['FINAL'] ? getTeamById(picks['FINAL']) : null

  const hasUnsaved = JSON.stringify(picks) !== JSON.stringify(savedPicks)
  const totalPicks = Object.keys(picks).length
  const totalMatches = 16 + 8 + 4 + 2 + 1

  // Count correct picks
  const correctPicks = Object.entries(results).filter(([matchId, winnerId]) => picks[matchId] === winnerId).length
  const points = correctPicks * 3

  if (loading) return <div className="page-loading"><div className="spinner"></div></div>

  const titleName = viewUser ? `Pronósticos de ${viewUser.username}` : 'Mis pronósticos'

  return (
    <div>
      {/* Polla selector */}
      {pollaList.length > 1 && (
        <div style={{ marginBottom: '1rem', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {pollaList.map(p => (
            <button key={p.id} className={`btn btn-sm ${selectedPollaId === p.id ? 'btn-primary' : 'btn-outline'}`} onClick={() => setSelectedPollaId(p.id)}>
              {p.name}
            </button>
          ))}
        </div>
      )}

      {!polla && (
        <div className="empty-state">
          <div className="emoji">⚽</div>
          <h3>No hay polla activa</h3>
          <p>El administrador aún no ha creado ninguna polla.</p>
        </div>
      )}

      {polla && (
        <>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h2 style={{ fontSize: '26px', marginBottom: 4 }}>{titleName}</h2>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', color: 'var(--text-3)' }}>
                  {polla.name}
                </span>
                {Object.keys(results).length > 0 && (
                  <span className="points-pill">🏅 {points} pts ({correctPicks} aciertos)</span>
                )}
              </div>
            </div>
            {isOwnBracket && (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-3)' }}>{totalPicks}/{totalMatches} picks</span>
                {!locked && (
                  <button className="btn btn-gold" onClick={handleSave} disabled={saving || !hasUnsaved}>
                    {saving ? 'Guardando...' : hasUnsaved ? 'Guardar pronósticos' : 'Guardado ✓'}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Banners */}
          {isClosed && (
            <div className="closed-banner">
              🔒 Los pronósticos están cerrados. {isOwnBracket ? 'Ya puedes ver los pronósticos de los demás.' : ''}
            </div>
          )}
          {error && <div className="alert alert-error">{error}</div>}
          {success && <div className="alert alert-success">{success}</div>}
          {!locked && hasUnsaved && (
            <div className="alert alert-info" style={{ marginBottom: '1rem' }}>
              Tienes cambios sin guardar. Recuerda guardar antes de que cierren los pronósticos.
            </div>
          )}

          {/* Champion display */}
          {champion && (
            <div style={{ textAlign: 'center', marginBottom: '1.5rem', padding: '1rem', background: 'var(--gold-pale)', borderRadius: 10, border: '1px solid var(--gold-light)' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#8a6200', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>
                🏆 Tu campeón
              </div>
              <div style={{ fontSize: '28px', marginBottom: 4 }}>{champion.flag}</div>
              <div style={{ fontSize: '20px', fontWeight: 700, color: '#8a6200' }}>{champion.name}</div>
            </div>
          )}

          {/* Bracket */}
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <div className="card-header">
              <h3 style={{ fontSize: '16px' }}>Árbol de eliminación</h3>
              <span style={{ fontSize: '12px', color: 'var(--text-3)' }}>
                {locked ? 'Solo lectura' : 'Haz clic en un equipo para elegirlo como ganador'}
              </span>
            </div>
            <div className="card-body" style={{ padding: '1rem', overflowX: 'auto' }}>
              <div className="bracket-rounds">
                {/* 16avos */}
                {r16Matches.length > 0 ? (
                  <BracketRound title="16avos de final" matches={r16Matches} picks={picks} onPick={handlePick} locked={locked} results={results} />
                ) : (
                  <div style={{ minWidth: 200, padding: '2rem', textAlign: 'center', color: 'var(--text-3)', fontSize: '13px' }}>
                    El admin aún no ha cargado los partidos de 16avos.
                  </div>
                )}

                {/* 8vos */}
                <BracketRound title="Octavos" matches={r8Matches} picks={picks} onPick={handlePick} locked={locked} results={results} />

                {/* Cuartos */}
                <BracketRound title="Cuartos" matches={qfMatches} picks={picks} onPick={handlePick} locked={locked} results={results} />

                {/* Semis */}
                <BracketRound title="Semifinales" matches={sfMatches} picks={picks} onPick={handlePick} locked={locked} results={results} />

                {/* Final */}
                <BracketRound title="Final" matches={finalMatch} picks={picks} onPick={handlePick} locked={locked} results={results} />
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function BracketRound({ title, matches, picks, onPick, locked, results }) {
  return (
    <div className="bracket-round">
      <div className="round-header">{title}</div>
      <div className="round-matches">
        {matches.map(m => (
          <MatchCard
            key={m.matchId}
            match={m}
            homeTeam={m.homeTeam}
            awayTeam={m.awayTeam}
            picks={picks}
            onPick={onPick}
            locked={locked}
            results={results}
          />
        ))}
      </div>
    </div>
  )
}
