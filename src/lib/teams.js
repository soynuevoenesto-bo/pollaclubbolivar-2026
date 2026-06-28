// Los 48 equipos del Mundial 2026, organizados por grupo
// pos: posición usada en los cruces del reglamento (ej: "1A" = primero del grupo A)
export const ALL_TEAMS = [
  // Grupo A
  { id: "mexico",       name: "México",           flag: "🇲🇽", group: "A" },
  { id: "corea",        name: "Rep. de Corea",    flag: "🇰🇷", group: "A" },
  { id: "sudafrica",    name: "Sudáfrica",         flag: "🇿🇦", group: "A" },
  { id: "haiti",        name: "Haití",             flag: "🇭🇹", group: "A" },
  // Grupo B
  { id: "canada",       name: "Canadá",            flag: "🇨🇦", group: "B" },
  { id: "suiza",        name: "Suiza",             flag: "🇨🇭", group: "B" },
  { id: "bosnia",       name: "Bosnia-Herz.",      flag: "🇧🇦", group: "B" },
  { id: "catar",        name: "Catar",             flag: "🇶🇦", group: "B" },
  // Grupo C
  { id: "brasil",       name: "Brasil",            flag: "🇧🇷", group: "C" },
  { id: "marruecos",    name: "Marruecos",         flag: "🇲🇦", group: "C" },
  { id: "escocia",      name: "Escocia",           flag: "🏴󠁧󠁢󠁳󠁣󠁴󠁿", group: "C" },
  { id: "haiti_c",      name: "Haití",             flag: "🇭🇹", group: "C" },
  // Grupo D
  { id: "eeuu",         name: "Estados Unidos",    flag: "🇺🇸", group: "D" },
  { id: "paraguay",     name: "Paraguay",          flag: "🇵🇾", group: "D" },
  { id: "australia",    name: "Australia",         flag: "🇦🇺", group: "D" },
  { id: "turquia",      name: "Turquía",           flag: "🇹🇷", group: "D" },
  // Grupo E
  { id: "alemania",     name: "Alemania",          flag: "🇩🇪", group: "E" },
  { id: "ecuador",      name: "Ecuador",           flag: "🇪🇨", group: "E" },
  { id: "costa_marfil", name: "Costa de Marfil",   flag: "🇨🇮", group: "E" },
  { id: "curazao",      name: "Curazao",           flag: "🇨🇼", group: "E" },
  // Grupo F
  { id: "paises_bajos", name: "Países Bajos",      flag: "🇳🇱", group: "F" },
  { id: "japon",        name: "Japón",             flag: "🇯🇵", group: "F" },
  { id: "suecia",       name: "Suecia",            flag: "🇸🇪", group: "F" },
  { id: "tunez",        name: "Túnez",             flag: "🇹🇳", group: "F" },
  // Grupo G
  { id: "belgica",      name: "Bélgica",           flag: "🇧🇪", group: "G" },
  { id: "egipto",       name: "Egipto",            flag: "🇪🇬", group: "G" },
  { id: "iran",         name: "Irán",              flag: "🇮🇷", group: "G" },
  { id: "nueva_zelanda",name: "Nueva Zelanda",     flag: "🇳🇿", group: "G" },
  // Grupo H
  { id: "espana",       name: "España",            flag: "🇪🇸", group: "H" },
  { id: "cabo_verde",   name: "Cabo Verde",        flag: "🇨🇻", group: "H" },
  { id: "arabia_saudi", name: "Arabia Saudí",      flag: "🇸🇦", group: "H" },
  { id: "uruguay",      name: "Uruguay",           flag: "🇺🇾", group: "H" },
  // Grupo I
  { id: "francia",      name: "Francia",           flag: "🇫🇷", group: "I" },
  { id: "senegal",      name: "Senegal",           flag: "🇸🇳", group: "I" },
  { id: "noruega",      name: "Noruega",           flag: "🇳🇴", group: "I" },
  { id: "irak",         name: "Irak",              flag: "🇮🇶", group: "I" },
  // Grupo J
  { id: "argentina",    name: "Argentina",         flag: "🇦🇷", group: "J" },
  { id: "austria",      name: "Austria",           flag: "🇦🇹", group: "J" },
  { id: "argelia",      name: "Argelia",           flag: "🇩🇿", group: "J" },
  { id: "jordania",     name: "Jordania",          flag: "🇯🇴", group: "J" },
  // Grupo K
  { id: "portugal",     name: "Portugal",          flag: "🇵🇹", group: "K" },
  { id: "colombia",     name: "Colombia",          flag: "🇨🇴", group: "K" },
  { id: "uzbekistan",   name: "Uzbekistán",        flag: "🇺🇿", group: "K" },
  { id: "rd_congo",     name: "RD Congo",          flag: "🇨🇩", group: "K" },
  // Grupo L
  { id: "inglaterra",   name: "Inglaterra",        flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", group: "L" },
  { id: "ghana",        name: "Ghana",             flag: "🇬🇭", group: "L" },
  { id: "croacia",      name: "Croacia",           flag: "🇭🇷", group: "L" },
  { id: "panama",       name: "Panamá",            flag: "🇵🇦", group: "L" },
]

export const getTeamById = (id) => ALL_TEAMS.find(t => t.id === id) || null

// Estructura de cruces de 8vos según reglamento FIFA (M89-M96)
// Cada partido referencia los IDs de los partidos de 16avos (M73-M88)
// M73=match1, M74=match2, ..., M88=match16
export const ROUND_OF_16_BRACKET = [
  // Octavos: ganadores de 16avos se cruzan según reglamento
  { matchId: "M89", homeFrom: "M74", awayFrom: "M77" }, // partido 2 vs partido 5
  { matchId: "M90", homeFrom: "M73", awayFrom: "M75" }, // partido 1 vs partido 3
  { matchId: "M91", homeFrom: "M76", awayFrom: "M78" }, // partido 4 vs partido 6
  { matchId: "M92", homeFrom: "M79", awayFrom: "M80" }, // partido 7 vs partido 8
  { matchId: "M93", homeFrom: "M83", awayFrom: "M84" }, // partido 11 vs partido 12
  { matchId: "M94", homeFrom: "M81", awayFrom: "M82" }, // partido 9 vs partido 10
  { matchId: "M95", homeFrom: "M86", awayFrom: "M88" }, // partido 14 vs partido 16
  { matchId: "M96", homeFrom: "M85", awayFrom: "M87" }, // partido 13 vs partido 15
]

// Cuartos de final según reglamento FIFA art. 12.8
// M97 (A): W89 vs W90
// M98 (B): W93 vs W94
// M99 (C): W91 vs W92
// M100 (D): W95 vs W96
export const QUARTERFINALS_BRACKET = [
  { matchId: "M97",  homeFrom: "M89", awayFrom: "M90" }, // (17) vs (18)
  { matchId: "M98",  homeFrom: "M93", awayFrom: "M94" }, // (21) vs (22)
  { matchId: "M99",  homeFrom: "M91", awayFrom: "M92" }, // (19) vs (20)
  { matchId: "M100", homeFrom: "M95", awayFrom: "M96" }, // (23) vs (24)
]

// Semifinales según reglamento FIFA art. 12.9
// M101 (SF1): W97 vs W98
// M102 (SF2): W99 vs W100
export const SEMIFINALS_BRACKET = [
  { matchId: "M101", homeFrom: "M97",  awayFrom: "M98"  }, // (A) vs (B)
  { matchId: "M102", homeFrom: "M99",  awayFrom: "M100" }, // (C) vs (D)
]

// Final según reglamento FIFA art. 12.11
// M104: W101 vs W102
export const FINAL_BRACKET = [
  { matchId: "M104", homeFrom: "M101", awayFrom: "M102" },
]

// Mapeo de matchId a nombre legible
export const MATCH_LABELS = {
  M73: "Partido 1",  M74: "Partido 2",  M75: "Partido 3",  M76: "Partido 4",
  M77: "Partido 5",  M78: "Partido 6",  M79: "Partido 7",  M80: "Partido 8",
  M81: "Partido 9",  M82: "Partido 10", M83: "Partido 11", M84: "Partido 12",
  M85: "Partido 13", M86: "Partido 14", M87: "Partido 15", M88: "Partido 16",
  M89: "Octavos 1",  M90: "Octavos 2",  M91: "Octavos 3",  M92: "Octavos 4",
  M93: "Octavos 5",  M94: "Octavos 6",  M95: "Octavos 7",  M96: "Octavos 8",
  M97:  "Cuartos A", M98:  "Cuartos B", M99:  "Cuartos C", M100: "Cuartos D",
  M101: "Semifinal 1", M102: "Semifinal 2",
  M104: "Gran Final",
}
