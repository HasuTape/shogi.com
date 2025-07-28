const kanji = {
  FU: "歩", KY: "香", KE: "桂", GI: "銀", KI: "金",
  KA: "角", HI: "飛", OU: "王",
  TO: "と", NY: "杏", NK: "圭", NG: "全", UM: "馬", RY: "竜",
  // Chess pieces
  PAWN: "♟", ROOK: "♜", KNIGHT: "♞", BISHOP: "♝", QUEEN: "♛", KING: "♚",
  // Duck
  DUCK: "🦆",
  // Special modes
  BOMB: "💣", TOXIC: "☠️"
};

let board = Array(9).fill(null).map(() => Array(9).fill(null));
let selected = null;
let playerCaptured = [];
let botCaptured = [];
let currentPlayer = "player";
let gameHistory = [];
let moveCount = 0;
let gameEnded = false;
let drawOffered = false;
let gameMode = "bot"; // "bot" or "friend"
let gameVariant = "standard"; // "standard", "return", "nodrop", "chess", "duck", "kamikaze", "toxic"
let duckPosition = null; // For duck shogi
let pendingDuckMove = false; // For duck shogi turn management
let enPassantTarget = null; // For chess en passant

const boardEl = document.getElementById("board");
const playerCapturedEl = document.getElementById("player-captured");
const botCapturedEl = document.getElementById("bot-captured");
const playerCapturedTitle = document.getElementById("player-captured-title");
const botCapturedTitle = document.getElementById("bot-captured-title");
const turnInfoEl = document.getElementById("turn-info");
const checkInfoEl = document.getElementById("check-info");
const nifuWarningEl = document.getElementById("nifu-warning");
const resignBtn = document.getElementById("resignBtn");
const drawBtn = document.getElementById("drawBtn");
const newGameBtn = document.getElementById("newGameBtn");
const gameModeSelect = document.getElementById("gameMode");
const gameVariantSelect = document.getElementById("gameVariant");
const botLevelSelect = document.getElementById("botLevel");
const botLevelContainer = document.getElementById("bot-level-container");

// Initialize bot level options (1-50)
function initBotLevels() {
  botLevelSelect.innerHTML = "";
  for (let i = 1; i <= 50; i++) {
    const option = document.createElement("option");
    option.value = i;
    if (i === 1) {
      option.textContent = `${i} (Random)`;
    } else if (i === 50) {
      option.textContent = `${i} (Master)`;
    } else if (i <= 10) {
      option.textContent = `${i} (Beginner)`;
    } else if (i <= 20) {
      option.textContent = `${i} (Novice)`;
    } else if (i <= 30) {
      option.textContent = `${i} (Intermediate)`;
    } else if (i <= 40) {
      option.textContent = `${i} (Advanced)`;
    } else {
      option.textContent = `${i} (Expert)`;
    }
    botLevelSelect.appendChild(option);
  }
  botLevelSelect.value = "15"; // Default to intermediate level
}

// Game mode change handler
gameModeSelect.addEventListener('change', function() {
  gameMode = this.value;
  updateGameModeUI();
  resetGame();
});

// Game variant change handler
gameVariantSelect.addEventListener('change', function() {
  gameVariant = this.value;
  updateVariantUI();
  resetGame();
});

function updateGameModeUI() {
  if (gameMode === "friend") {
    botLevelContainer.style.display = "none";
    playerCapturedTitle.textContent = "Player 1's Captured Pieces";
    botCapturedTitle.textContent = "Player 2's Captured Pieces";
  } else {
    botLevelContainer.style.display = "block";
    playerCapturedTitle.textContent = "Your Captured Pieces";
    botCapturedTitle.textContent = "Bot's Captured Pieces";
  }
}

function updateVariantUI() {
  const capturedContainer = document.getElementById("captured-container");
  
  if (gameVariant === "nodrop" || gameVariant === "chess") {
    capturedContainer.style.display = "none";
  } else {
    capturedContainer.style.display = "flex";
  }
  
  // Update captured pieces titles based on variant
  if (gameVariant === "return") {
    if (gameMode === "friend") {
      playerCapturedTitle.textContent = "Player 1's Return Pieces";
      botCapturedTitle.textContent = "Player 2's Return Pieces";
    } else {
      playerCapturedTitle.textContent = "Your Return Pieces";
      botCapturedTitle.textContent = "Bot's Return Pieces";
    }
  } else {
    updateGameModeUI(); // Reset to normal titles
  }
}

function initBoard() {
  // Clear board
  board = Array(9).fill(null).map(() => Array(9).fill(null));
  duckPosition = null;
  pendingDuckMove = false;
  enPassantTarget = null;
  
  if (gameVariant === "chess") {
    initChessBoard();
  } else if (gameVariant === "duck") {
    initDuckShogiBoard();
  } else {
    initStandardShogiBoard();
  }
  
  renderBoard();
  renderCaptured();
  updateGameInfo();
}

function initStandardShogiBoard() {
  const setup = [
    ["KY", "KE", "GI", "KI", "OU", "KI", "GI", "KE", "KY"],
    [null, "HI", null, null, null, null, null, "KA", null],
    ["FU", "FU", "FU", "FU", "FU", "FU", "FU", "FU", "FU"]
  ];
  
  // Bot/Player 2 pieces (top)
  for (let y = 0; y < 3; y++) {
    for (let x = 0; x < 9; x++) {
      const type = setup[y][x];
      if (type) board[y][x] = { type, char: kanji[type], owner: "bot" };
    }
  }
  
  // Player 1 pieces (bottom)
  for (let y = 0; y < 3; y++) {
    for (let x = 0; x < 9; x++) {
      const type = setup[y][x];
      if (type) board[8 - y][8 - x] = { type, char: kanji[type], owner: "player" };
    }
  }
}

function initChessBoard() {
  // Chess mode: shogi setup without gold pieces (KI) and with chess knights (KE)
  const chessSetup = [
    [null, "KE", null, null, "OU", null, null, "KE", null],
    [null, "HI", null, null, null, null, null, "KA", null],
    ["FU", "FU", "FU", "FU", "FU", "FU", "FU", "FU", "FU"]
  ];
  
  // Bot/Player 2 pieces (top)
  for (let y = 0; y < 3; y++) {
    for (let x = 0; x < 9; x++) {
      const type = chessSetup[y][x];
      if (type) board[y][x] = { type, char: kanji[type], owner: "bot" };
    }
  }
  
  // Player 1 pieces (bottom)
  for (let y = 0; y < 3; y++) {
    for (let x = 0; x < 9; x++) {
      const type = chessSetup[y][x];
      if (type) board[8 - y][8 - x] = { type, char: kanji[type], owner: "player" };
    }
  }
}

function initDuckShogiBoard() {
  initStandardShogiBoard();
  // Place duck in center
  duckPosition = { x: 4, y: 4 };
  board[4][4] = { type: "DUCK", char: kanji["DUCK"], owner: "duck" };
}

function renderBoard() {
  boardEl.innerHTML = "";
  const validMoves = selected && !selected.drop && !selected.isDuck ? getValidMovesForPiece(selected) : [];
  
  for (let y = 0; y < 9; y++) {
    for (let x = 0; x < 9; x++) {
      const cell = document.createElement("div");
      cell.className = "cell";
      cell.dataset.x = x;
      cell.dataset.y = y;
      
      if (selected && selected.x === x && selected.y === y && !selected.drop) {
        cell.classList.add("highlight");
      }
      
      // Show valid moves for regular pieces
      if (validMoves.some(move => move.x === x && move.y === y)) {
        cell.classList.add("valid-move");
      }
      
      // Show valid duck moves (anywhere that's empty)
      if (selected && selected.isDuck && board[y][x] === null && (x !== selected.x || y !== selected.y)) {
        cell.classList.add("valid-move");
      }
      
      // En passant not used in chess mode (uses normal shogi rules)
      
      const piece = board[y][x];
      if (piece) {
        const pieceEl = document.createElement("div");
        let className = "piece " + piece.owner;
        
        // Add special classes for bomb and toxic pieces
        if (piece.type === "BOMB") {
          className += " bomb";
        } else if (piece.type === "TOXIC") {
          className += " toxic";
        }
        
        pieceEl.className = className;
        pieceEl.textContent = piece.char;
        
        // Show turns left for special pieces
        if (piece.turnsLeft !== undefined) {
          const turnsEl = document.createElement("div");
          turnsEl.className = "turns-left";
          turnsEl.textContent = piece.turnsLeft;
          turnsEl.style.position = "absolute";
          turnsEl.style.top = "2px";
          turnsEl.style.right = "2px";
          turnsEl.style.fontSize = "8px";
          turnsEl.style.fontWeight = "bold";
          turnsEl.style.color = "#fff";
          turnsEl.style.background = "rgba(0,0,0,0.7)";
          turnsEl.style.borderRadius = "50%";
          turnsEl.style.width = "12px";
          turnsEl.style.height = "12px";
          turnsEl.style.display = "flex";
          turnsEl.style.alignItems = "center";
          turnsEl.style.justifyContent = "center";
          pieceEl.appendChild(turnsEl);
        }
        
        cell.appendChild(pieceEl);
      }
      
      cell.onclick = onCellClick;
      boardEl.appendChild(cell);
    }
  }
}

function renderCaptured() {
  // Player captured pieces
  playerCapturedEl.innerHTML = "";
  const playerCounts = {};
  playerCaptured.forEach(type => {
    playerCounts[type] = (playerCounts[type] || 0) + 1;
  });
  
  Object.entries(playerCounts).forEach(([type, count]) => {
    const dropZone = document.createElement("div");
    dropZone.className = "drop-zone";
    if (selected && selected.drop && selected.type === type) {
      dropZone.classList.add("selected");
    }
    dropZone.textContent = kanji[type] + (count > 1 ? ` (${count})` : "");
    dropZone.onclick = () => {
      if (currentPlayer === "player") {
        selected = { drop: true, type };
        renderBoard();
        renderCaptured();
      }
    };
    playerCapturedEl.appendChild(dropZone);
  });

  // Bot/Player 2 captured pieces
  botCapturedEl.innerHTML = "";
  const botCounts = {};
  botCaptured.forEach(type => {
    botCounts[type] = (botCounts[type] || 0) + 1;
  });
  
  Object.entries(botCounts).forEach(([type, count]) => {
    const dropZone = document.createElement("div");
    dropZone.className = "drop-zone";
    if (gameMode === "friend" && currentPlayer === "bot" && selected && selected.drop && selected.type === type) {
      dropZone.classList.add("selected");
    }
    dropZone.textContent = kanji[type] + (count > 1 ? ` (${count})` : "");
    
    if (gameMode === "friend") {
      dropZone.onclick = () => {
        if (currentPlayer === "bot") {
          selected = { drop: true, type };
          renderBoard();
          renderCaptured();
        }
      };
      dropZone.style.cursor = currentPlayer === "bot" ? "pointer" : "default";
      dropZone.style.opacity = currentPlayer === "bot" ? "1" : "0.7";
    } else {
      dropZone.style.cursor = "default";
      dropZone.style.opacity = "0.7";
    }
    
    botCapturedEl.appendChild(dropZone);
  });
}

function updateGameInfo() {
  if (gameVariant === "duck" && pendingDuckMove) {
    turnInfoEl.textContent = "Move the duck!";
    turnInfoEl.className = "turn-indicator";
  } else if (gameMode === "friend") {
    if (currentPlayer === "player") {
      turnInfoEl.textContent = "Player 1's turn";
      turnInfoEl.className = "turn-indicator";
    } else {
      turnInfoEl.textContent = "Player 2's turn";
      turnInfoEl.className = "turn-indicator";
    }
  } else {
    if (currentPlayer === "player") {
      turnInfoEl.textContent = "Your turn";
      turnInfoEl.className = "turn-indicator";
    } else {
      turnInfoEl.textContent = "Bot's turn";
      turnInfoEl.className = "turn-indicator";
    }
  }
  
  const playerInCheck = isInCheck("player");
  const botInCheck = isInCheck("bot");
  
  if (playerInCheck || botInCheck) {
    checkInfoEl.style.display = "block";
    if (gameMode === "friend") {
      checkInfoEl.textContent = playerInCheck ? "Player 1 is in check!" : "Player 2 is in check!";
    } else {
      checkInfoEl.textContent = playerInCheck ? "You are in check!" : "Bot is in check!";
    }
  } else {
    checkInfoEl.style.display = "none";
  }
}

function demote(type) {
  const map = { TO: "FU", NY: "KY", NK: "KE", NG: "GI", UM: "KA", RY: "HI" };
  return map[type] || type;
}

function isInCheck(owner, b = board) {
  const enemy = owner === "player" ? "bot" : "player";
  let kingPos = null;
  
  for (let y = 0; y < 9; y++) {
    for (let x = 0; x < 9; x++) {
      const p = b[y][x];
      if (p && p.type === "OU" && p.owner === owner) {
        kingPos = { x, y };
        break;
      }
    }
    if (kingPos) break;
  }
  
  if (!kingPos) return true;
  
  for (let y = 0; y < 9; y++) {
    for (let x = 0; x < 9; x++) {
      const p = b[y][x];
      if (p && p.owner === enemy) {
        if (validMove({ x, y }, kingPos, enemy, b)) return true;
      }
    }
  }
  
  return false;
}

function cloneBoard(b) {
  return b.map(row => row.map(cell => cell ? { ...cell } : null));
}

function validChessMove(piece, from, to, dx, dy, b) {
  const up = piece.owner === "player" ? -1 : 1;
  const startRank = piece.owner === "player" ? 6 : 1;
  
  switch (piece.type) {
    case "FU": // Pawn - moves like chess pawn
      // Move forward one square
      if (dx === 0 && dy === up && !b[to.y][to.x]) return true;
      
      // Move forward two squares from starting position
      if (dx === 0 && dy === (up * 2) && from.y === startRank && !b[to.y][to.x] && !b[from.y + up][from.x]) return true;
      
      // Capture diagonally
      if (Math.abs(dx) === 1 && dy === up && b[to.y][to.x] && b[to.y][to.x].owner !== piece.owner) return true;
      
      // En passant capture
      if (Math.abs(dx) === 1 && dy === up && !b[to.y][to.x] && enPassantTarget && 
          enPassantTarget.x === to.x && enPassantTarget.y === to.y) return true;
      
      return false;
      
    case "HI": // Rook - moves like chess rook
      return validLine(from, to, dx, dy, b, false);
      
    case "KA": // Bishop - moves like chess bishop
      return validLine(from, to, dx, dy, b, true);
      
    case "KI": // Gold General - moves like chess queen
      return validLine(from, to, dx, dy, b, true) || validLine(from, to, dx, dy, b, false);
      
    case "OU": // King - moves like chess king
      return Math.abs(dx) <= 1 && Math.abs(dy) <= 1 && (dx !== 0 || dy !== 0);
      
    default:
      return false;
  }
}

function validMove(from, to, owner, b = board) {
  // Bounds check - chess mode uses full 9x9 board like normal shogi
  if (to.x < 0 || to.x >= 9 || to.y < 0 || to.y >= 9) return false;
  
  if (from.drop) {
    if (gameVariant === "nodrop" || gameVariant === "chess") return false;
    return isValidDrop(from.type, to, owner, b);
  }
  
  const p = b[from.y][from.x];
  if (!p || p.owner !== owner) return false;
  
  // For special pieces (TOXIC, BOMB), use their promoted type for movement
  const pieceType = ((p.type === "TOXIC" || p.type === "BOMB") && p.promotedType) ? p.promotedType : p.type;
  if (b[to.y][to.x] && b[to.y][to.x].owner === owner) return false;
  
  // Duck can't be captured
  if (b[to.y][to.x] && b[to.y][to.x].type === "DUCK") return false;
  
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const up = owner === "player" ? -1 : 1;
  
  // Special chess mode movement
  if (gameVariant === "chess") {
    if (pieceType === "KE") {
      // Chess knight moves in L-shape: 2 squares in one direction, 1 in perpendicular
      return (Math.abs(dx) === 2 && Math.abs(dy) === 1) || (Math.abs(dx) === 1 && Math.abs(dy) === 2);
    }
    
    if (pieceType === "FU") {
      // Chess pawn: moves forward, captures diagonally
      const targetPiece = b[to.y][to.x];
      
      // Move forward one square (no piece there)
      if (dx === 0 && dy === up && !targetPiece) {
        return true;
      }
      
      // Capture diagonally (piece there and it's enemy)
      if (Math.abs(dx) === 1 && dy === up && targetPiece && targetPiece.owner !== owner) {
        return true;
      }
      
      return false;
    }
  }

  switch (pieceType) {
    case "FU": // Pawn (normal shogi mode)
      return dx === 0 && dy === up;
      
    case "KY": // Lance
      if (dx !== 0) return false;
      if (dy * up <= 0) return false; // Must move forward
      for (let i = 1; i < Math.abs(dy); i++) {
        const stepY = from.y + i * up;
        if (b[stepY][from.x]) return false;
      }
      return true;
      
    case "KE": // Knight
      return Math.abs(dx) === 1 && dy === 2 * up;
      
    case "GI": // Silver General
      return (
        (Math.abs(dx) === 1 && dy === up) ||  // diagonal forward
        (Math.abs(dx) === 1 && dy === -up) || // diagonal backward
        (dx === 0 && dy === up)               // straight forward
      );
      
    case "KI": // Gold General
      return (
        (dx === 0 && dy === up) ||             // forward
        (Math.abs(dx) === 1 && dy === 0) ||    // sideways
        (dx === 0 && dy === -up) ||            // backward
        (Math.abs(dx) === 1 && dy === up)      // diagonal forward
      );
      
    case "OU": // King
      return Math.abs(dx) <= 1 && Math.abs(dy) <= 1 && (dx !== 0 || dy !== 0);
      
    case "KA": // Bishop
      return validLine(from, to, dx, dy, b, true);
      
    case "HI": // Rook
      return validLine(from, to, dx, dy, b, false);
      
    case "UM": // Promoted Bishop
      return validLine(from, to, dx, dy, b, true) || (Math.abs(dx) <= 1 && Math.abs(dy) <= 1 && (dx !== 0 || dy !== 0));
      
    case "RY": // Promoted Rook
      return validLine(from, to, dx, dy, b, false) || (Math.abs(dx) <= 1 && Math.abs(dy) <= 1 && (dx !== 0 || dy !== 0));
      
    case "TO": // Promoted Pawn (moves like Gold)
    case "NY": // Promoted Lance
    case "NK": // Promoted Knight
    case "NG": // Promoted Silver
      return (
        (dx === 0 && dy === up) ||
        (Math.abs(dx) === 1 && dy === 0) ||
        (dx === 0 && dy === -up) ||
        (Math.abs(dx) === 1 && dy === up)
      );
      
    case "BOMB": // Bomb - moves like king
    case "TOXIC": // Toxic - moves like king
      return Math.abs(dx) <= 1 && Math.abs(dy) <= 1 && (dx !== 0 || dy !== 0);
      
    default:
      return false;
  }
}

function checkNifu(pieceType, to, owner, b = board) {
  if (pieceType !== "FU") return { valid: true };
  
  for (let y = 0; y < 9; y++) {
    const piece = b[y][to.x];
    if (piece && piece.type === "FU" && piece.owner === owner) {
      return { 
        valid: false, 
        message: `Cannot place two pawns in the same column (Nifu rule violation)` 
      };
    }
  }
  return { valid: true };
}

function isValidDrop(pieceType, to, owner, b = board, showWarning = false) {
  // Can't drop on occupied square
  if (b[to.y][to.x]) return false;
  
  // Nifu rule: Can't drop pawn in column that already has unpromoted pawn
  if (pieceType === "FU") {
    const nifuCheck = checkNifu(pieceType, to, owner, b);
    if (!nifuCheck.valid) {
      if (showWarning && ((gameMode === "bot" && owner === "player") || gameMode === "friend")) {
        showNifuWarning(nifuCheck.message);
      }
      return false;
    }
    
    // Uchifuzume rule: Can't drop pawn for immediate checkmate
    const tempBoard = cloneBoard(b);
    tempBoard[to.y][to.x] = { type: "FU", char: kanji["FU"], owner };
    
    if (isInCheck(owner === "player" ? "bot" : "player", tempBoard)) {
      const enemy = owner === "player" ? "bot" : "player";
      if (isCheckmate(enemy, tempBoard)) {
        if (showWarning && ((gameMode === "bot" && owner === "player") || gameMode === "friend")) {
          showNifuWarning("Cannot drop pawn for immediate checkmate (Uchifuzume rule)");
        }
        return false;
      }
    }
  }
  
  // Can't drop pieces where they can't move
  if (pieceType === "FU" || pieceType === "KY") {
    const lastRow = owner === "player" ? 0 : 8;
    if (to.y === lastRow) return false;
  }
  
  if (pieceType === "KE") {
    const lastTwoRows = owner === "player" ? [0, 1] : [7, 8];
    if (lastTwoRows.includes(to.y)) return false;
  }
  
  return true;
}

function showNifuWarning(message) {
  nifuWarningEl.textContent = message;
  nifuWarningEl.style.display = "block";
  setTimeout(() => {
    nifuWarningEl.style.display = "none";
  }, 3000);
}

function validLine(from, to, dx, dy, b, diagonal) {
  if (diagonal ? Math.abs(dx) !== Math.abs(dy) : (dx !== 0 && dy !== 0)) return false;
  if (dx === 0 && dy === 0) return false;
  
  const sx = dx === 0 ? 0 : dx > 0 ? 1 : -1;
  const sy = dy === 0 ? 0 : dy > 0 ? 1 : -1;
  const dist = Math.max(Math.abs(dx), Math.abs(dy));
  
  for (let i = 1; i < dist; i++) {
    if (b[from.y + i * sy][from.x + i * sx]) return false;
  }
  
  return true;
}

function mustPromote(piece, fromY, toY) {
  const promotionZone = piece.owner === "player" ? [0, 1, 2] : [6, 7, 8];
  
  if (piece.type === "FU" && toY === (piece.owner === "player" ? 0 : 8)) {
    return true; // Pawn must promote on last rank
  }
  
  if (piece.type === "KY" && toY === (piece.owner === "player" ? 0 : 8)) {
    return true; // Lance must promote on last rank
  }
  
  if (piece.type === "KE") {
    const lastTwoRows = piece.owner === "player" ? [0, 1] : [7, 8];
    if (lastTwoRows.includes(toY)) return true; // Knight must promote on last two ranks
  }
  
  return false;
}

function canPromote(piece, fromY, toY) {
  const promotionZone = piece.owner === "player" ? [0, 1, 2] : [6, 7, 8];
  return (promotionZone.includes(fromY) || promotionZone.includes(toY)) && 
         ["FU", "KY", "KE", "GI", "KA", "HI"].includes(piece.type);
}

function promote(piece) {
  const map = {
    FU: "TO", KY: "NY", KE: "NK", GI: "NG", KA: "UM", HI: "RY"
  };
  const promotedType = map[piece.type];
  if (promotedType) {
    return { ...piece, type: promotedType, char: kanji[promotedType] };
  }
  return piece;
}

function getValidMovesForPiece(from) {
  const moves = [];
  const owner = currentPlayer;
  
  for (let y = 0; y < 9; y++) {
    for (let x = 0; x < 9; x++) {
      if (validMove(from, { x, y }, owner)) {
        const clone = cloneBoard(board);
        if (from.drop) {
          clone[y][x] = { type: from.type, char: kanji[from.type], owner };
        } else {
          const piece = clone[from.y][from.x];
          clone[y][x] = piece;
          clone[from.y][from.x] = null;
        }
        
        if (!isInCheck(owner, clone)) {
          moves.push({ x, y });
        }
      }
    }
  }
  
  return moves;
}

function getAllLegalMoves(owner, b = board) {
  const moves = [];
  
  // Regular piece moves
  for (let y = 0; y < 9; y++) {
    for (let x = 0; x < 9; x++) {
      const piece = b[y][x];
      if (piece && piece.owner === owner) {
        for (let ny = 0; ny < 9; ny++) {
          for (let nx = 0; nx < 9; nx++) {
            if (validMove({ x, y }, { x: nx, y: ny }, owner, b)) {
              const clone = cloneBoard(b);
              clone[ny][nx] = clone[y][x];
              clone[y][x] = null;
              if (!isInCheck(owner, clone)) {
                moves.push({ from: { x, y }, to: { x: nx, y: ny }, type: "move" });
              }
            }
          }
        }
      }
    }
  }
  
  // Drop moves
  const capturedPieces = owner === "player" ? playerCaptured : botCaptured;
  const uniquePieces = [...new Set(capturedPieces)];
  
  uniquePieces.forEach(pieceType => {
    for (let y = 0; y < 9; y++) {
      for (let x = 0; x < 9; x++) {
        if (isValidDrop(pieceType, { x, y }, owner, b)) {
          const clone = cloneBoard(b);
          clone[y][x] = { type: pieceType, char: kanji[pieceType], owner };
          if (!isInCheck(owner, clone)) {
            moves.push({ from: { drop: true, type: pieceType }, to: { x, y }, type: "drop" });
          }
        }
      }
    }
  });
  
  return moves;
}

function isCheckmate(owner, b = board) {
  if (!isInCheck(owner, b)) return false;
  return getAllLegalMoves(owner, b).length === 0;
}

function isStalemate(owner, b = board) {
  if (isInCheck(owner, b)) return false;
  return getAllLegalMoves(owner, b).length === 0;
}

function recordMove(move) {
  const boardState = board.map(row => row.map(cell => cell ? { ...cell } : null));
  gameHistory.push({
    move,
    board: boardState,
    playerCaptured: [...playerCaptured],
    botCaptured: [...botCaptured],
    moveCount
  });
  moveCount++;
}

function onCellClick(e) {
  if (gameEnded) return;
  
  // In friend mode, allow both players to play
  // In bot mode, only allow player moves
  if (gameMode === "bot" && currentPlayer !== "player" && !pendingDuckMove) return;
  
  const x = parseInt(e.currentTarget.dataset.x);
  const y = parseInt(e.currentTarget.dataset.y);
  
  // Duck shogi: handle duck movement
  if (gameVariant === "duck" && pendingDuckMove && selected && selected.isDuck) {
    if (board[y][x] === null && isValidDuckMove(duckPosition, { x, y })) {
      // Move duck
      board[duckPosition.y][duckPosition.x] = null;
      board[y][x] = { type: "DUCK", char: kanji["DUCK"], owner: "duck" };
      duckPosition = { x, y };
      pendingDuckMove = false;
      selected = null; // Clear selection
      
      switchPlayer();
      renderBoard();
      renderCaptured();
      updateGameInfo();
      
      const enemy = currentPlayer === "player" ? "bot" : "player";
      if (isCheckmate(enemy)) {
        const winner = gameMode === "friend" ? 
          (currentPlayer === "player" ? "Player 2" : "Player 1") :
          (currentPlayer === "player" ? "You" : "Bot");
        endGame(`Checkmate! ${winner} wins!`);
        return;
      }
      
      if (gameMode === "bot" && currentPlayer === "bot") {
        setTimeout(botMove, 500);
      }
      return;
    }
    return; // Invalid duck move, do nothing
  }

  if (selected && selected.drop) {
    if (isValidDrop(selected.type, { x, y }, currentPlayer, board, true)) {
      const tempBoard = cloneBoard(board);
      tempBoard[y][x] = { type: selected.type, char: kanji[selected.type], owner: currentPlayer };
      if (!isInCheck(currentPlayer, tempBoard)) {
        board[y][x] = { type: selected.type, char: kanji[selected.type], owner: currentPlayer };
        
        if (currentPlayer === "player") {
          playerCaptured.splice(playerCaptured.indexOf(selected.type), 1);
        } else {
          botCaptured.splice(botCaptured.indexOf(selected.type), 1);
        }
        
        recordMove({ from: { drop: true, type: selected.type }, to: { x, y } });
        
        selected = null;
        switchPlayer();
        renderBoard();
        renderCaptured();
        updateGameInfo();
        
        const enemy = currentPlayer === "player" ? "bot" : "player";
        if (isCheckmate(enemy)) {
          const winner = gameMode === "friend" ? 
            (currentPlayer === "player" ? "Player 2" : "Player 1") :
            (currentPlayer === "player" ? "You" : "Bot");
          endGame(`Checkmate! ${winner} wins!`);
          return;
        }
        
        if (gameMode === "bot" && currentPlayer === "bot") {
          setTimeout(botMove, 500);
        }
        return;
      }
    }
    selected = null;
    renderBoard();
    renderCaptured();
  } else if (selected) {
    if (validMove(selected, { x, y }, currentPlayer)) {
      const clone = cloneBoard(board);
      const piece = clone[selected.y][selected.x];
      clone[y][x] = piece;
      clone[selected.y][selected.x] = null;
      
      if (!isInCheck(currentPlayer, clone)) {
        let target = board[y][x];
        
        if (target && target.owner !== currentPlayer && target.type !== "DUCK") {
          handleCapture(target, currentPlayer);
        }
        
        let moved = board[selected.y][selected.x];
        
        if (gameVariant === "chess") {
          // Chess mode: only pawns can promote, only on last rank
          if (moved.type === "FU" && (y === 0 || y === 8)) {
            moved = promoteChessPawn(moved);
          }
        } else if (gameVariant === "kamikaze") {
          if (mustPromote(moved, selected.y, y)) {
            moved = promoteToKamikaze(moved);
          } else if (canPromote(moved, selected.y, y)) {
            if (confirm("Promote to bomb?")) moved = promoteToKamikaze(moved);
          }
        } else if (gameVariant === "toxic") {
          // Toxic promotion is forced when possible
          if (mustPromote(moved, selected.y, y) || canPromote(moved, selected.y, y)) {
            moved = promoteToToxic(moved);
          }
        } else {
          if (mustPromote(moved, selected.y, y)) {
            moved = promote(moved);
          } else if (canPromote(moved, selected.y, y)) {
            if (confirm("Promote piece?")) moved = promote(moved);
          }
        }
        
        board[y][x] = moved;
        board[selected.y][selected.x] = null;
        
        recordMove({ from: selected, to: { x, y } });
        
        selected = null;
        
        // Duck shogi: after moving, player must move the duck
        if (gameVariant === "duck") {
          pendingDuckMove = true;
          selected = { x: duckPosition.x, y: duckPosition.y, isDuck: true }; // Auto-select duck
          updateGameInfo();
          renderBoard();
          return; // Don't switch players yet
        }
        
        switchPlayer();
        
        // Handle special pieces countdown after each turn
        if (gameVariant === "kamikaze" || gameVariant === "toxic") {
          handleSpecialPiecesCountdown();
        }
        
        renderBoard();
        renderCaptured();
        updateGameInfo();
        
        const enemy = currentPlayer === "player" ? "bot" : "player";
        if (isCheckmate(enemy)) {
          const winner = gameMode === "friend" ? 
            (currentPlayer === "player" ? "Player 2" : "Player 1") :
            (currentPlayer === "player" ? "You" : "Bot");
          endGame(`Checkmate! ${winner} wins!`);
          return;
        }
        
        if (gameMode === "bot" && currentPlayer === "bot") {
          setTimeout(botMove, 500);
        }
      }
    } else {
      selected = null;
      renderBoard();
    }
  } else if (board[y][x] && board[y][x].owner === currentPlayer) {
    selected = { x, y };
    renderBoard();
  }
}

function switchPlayer() {
  currentPlayer = currentPlayer === "player" ? "bot" : "player";
}

function handleCapture(capturedPiece, capturingPlayer) {
  // Special pieces (BOMB, TOXIC) can't be captured to hand - they're destroyed
  if (capturedPiece.type === "BOMB" || capturedPiece.type === "TOXIC") {
    return; // Just destroy the piece, don't add to hand
  }
  
  if (gameVariant === "chess" || gameVariant === "nodrop") {
    // Pieces are just removed from the board
    return;
  } else if (gameVariant === "return") {
    // Return variant: captured piece goes to opponent's hand
    const demotedType = demote(capturedPiece.originalType || capturedPiece.type);
    if (capturingPlayer === "player") {
      botCaptured.push(demotedType);
    } else {
      playerCaptured.push(demotedType);
    }
  } else {
    // Standard shogi: captured piece goes to capturer's hand
    const demotedType = demote(capturedPiece.originalType || capturedPiece.type);
    if (capturingPlayer === "player") {
      playerCaptured.push(demotedType);
    } else {
      botCaptured.push(demotedType);
    }
  }
}

function promoteChessPawn(piece) {
  const choice = prompt("Choose promotion piece:\n1. Rook (HI)\n2. Bishop (KA)\n3. Knight (KE)", "1");
  
  let promotedType = "HI"; // Default to Rook
  if (choice === "2") promotedType = "KA"; // Bishop
  else if (choice === "3") promotedType = "KE"; // Knight
  
  return { ...piece, type: promotedType, char: kanji[promotedType] };
}

function isValidDuckMove(from, to) {
  if (!from || !to) return false;
  
  // Duck can move anywhere on the board (as long as it's not the same position)
  return from.x !== to.x || from.y !== to.y;
}

function promoteToKamikaze(piece) {
  // If piece can be promoted normally, promote it first, then make it toxic
  let promotedPiece = piece;
  
  // Check if piece has a normal promotion
  const promotionMap = { 
    FU: "TO", KY: "NY", KE: "NK", GI: "NG", KA: "UM", HI: "RY" 
  };
  
  if (promotionMap[piece.type]) {
    // Piece has normal promotion - promote it first
    promotedPiece = {
      ...piece,
      type: promotionMap[piece.type],
      char: kanji[promotionMap[piece.type]]
    };
  }
  // If no promotion exists (KI, OU, already promoted pieces), keep as is
  
  return { 
    ...promotedPiece, 
    type: "BOMB", 
    char: kanji["BOMB"], 
    turnsLeft: 5,
    originalType: piece.type, // Keep original type for demotion
    promotedType: promotedPiece.type // Keep promoted type for movement
  };
}

function promoteToToxic(piece) {
  // If piece can be promoted normally, promote it first, then make it toxic
  let promotedPiece = piece;
  
  // Check if piece has a normal promotion
  const promotionMap = { 
    FU: "TO", KY: "NY", KE: "NK", GI: "NG", KA: "UM", HI: "RY" 
  };
  
  if (promotionMap[piece.type]) {
    // Piece has normal promotion - promote it first
    promotedPiece = {
      ...piece,
      type: promotionMap[piece.type],
      char: kanji[promotionMap[piece.type]]
    };
  }
  // If no promotion exists (KI, OU, already promoted pieces), keep as is
  
  return { 
    ...promotedPiece, 
    type: "TOXIC", 
    char: kanji["TOXIC"], 
    turnsLeft: 5,
    originalType: piece.type, // Keep original type for demotion
    promotedType: promotedPiece.type // Keep promoted type for movement
  };
}

function explodeBomb(x, y, chainReaction = false) {
  const destroyedPieces = [];
  const chainBombs = [];
  let kingDestroyed = false;
  
  // Explode in 3x3 area around the bomb
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const nx = x + dx;
      const ny = y + dy;
      
      if (nx >= 0 && nx < 9 && ny >= 0 && ny < 9) {
        const piece = board[ny][nx];
        if (piece && piece.type !== "DUCK") {
          // Check if king is destroyed
          if (piece.type === "OU") {
            kingDestroyed = true;
            gameEnded = true;
            setTimeout(() => {
              const winner = piece.owner === "player" ? "Bot" : "Player";
              alert(`${winner} wins! King destroyed by bomb explosion!`);
            }, 100);
          }
          
          // Check if this piece is another bomb (for chain reaction)
          if (piece.type === "BOMB" && (nx !== x || ny !== y)) {
            chainBombs.push({ x: nx, y: ny });
          }
          
          destroyedPieces.push({ piece, owner: piece.owner });
          board[ny][nx] = null;
        }
      }
    }
  }
  
  // Add destroyed pieces to their owners' hands (except special pieces)
  destroyedPieces.forEach(({ piece, owner }) => {
    // Special pieces (BOMB, TOXIC) can't be captured to hand - they're destroyed
    if (piece.type !== "BOMB" && piece.type !== "TOXIC") {
      const demotedType = demote(piece.originalType || piece.type);
      if (owner === "player") {
        playerCaptured.push(demotedType);
      } else {
        botCaptured.push(demotedType);
      }
    }
  });
  
  // Trigger chain reactions
  chainBombs.forEach(({ x: bx, y: by }) => {
    explodeBomb(bx, by, true);
  });
  
  return destroyedPieces.length;
}

function handleSpecialPiecesCountdown() {
  const piecesToProcess = [];
  
  // First pass: decrease countdown for all special pieces
  for (let y = 0; y < 9; y++) {
    for (let x = 0; x < 9; x++) {
      const piece = board[y][x];
      if (piece && (piece.type === "BOMB" || piece.type === "TOXIC")) {
        piece.turnsLeft--;
        
        if (piece.turnsLeft <= 0) {
          piecesToProcess.push({ piece, x, y });
        }
      }
    }
  }
  
  // Second pass: handle explosions/deaths
  piecesToProcess.forEach(({ piece, x, y }) => {
    if (piece.type === "BOMB") {
      explodeBomb(x, y);
    } else if (piece.type === "TOXIC") {
      // Toxic piece dies
      const demotedType = demote(piece.originalType || "FU");
      if (piece.owner === "player") {
        playerCaptured.push(demotedType);
      } else {
        botCaptured.push(demotedType);
      }
      board[y][x] = null;
    }
  });
}

function getFastBestMove(moves, level) {
  // Fast evaluation without minimax for lower levels
  let bestScore = -Infinity;
  let bestMoves = [];
  
  const pieceValues = { 
    FU: 100, KY: 300, KE: 300, GI: 500, KI: 500, 
    KA: 700, HI: 800, OU: 10000,
    TO: 150, NY: 350, NK: 350, NG: 550, UM: 900, RY: 1000
  };
  
  moves.forEach(move => {
    let score = Math.random() * 10; // Small random factor
    
    // Prioritize captures
    if (move.type === "move" && board[move.to.y][move.to.x]) {
      const capturedPiece = board[move.to.y][move.to.x];
      if (capturedPiece.owner === "player") {
        score += (pieceValues[capturedPiece.type] || 100) / 10;
      }
    }
    
    // Center control bonus (light)
    if (level >= 5) {
      const centerDistance = Math.abs(move.to.x - 4) + Math.abs(move.to.y - 4);
      score += (8 - centerDistance) * 0.5;
    }
    
    // Avoid moving king to edges
    if (level >= 10 && move.type === "move") {
      const piece = board[move.from.y][move.from.x];
      if (piece && piece.type === "OU") {
        if (move.to.x === 0 || move.to.x === 8 || move.to.y === 0 || move.to.y === 8) {
          score -= 20;
        }
      }
    }
    
    if (score > bestScore) {
      bestScore = score;
      bestMoves = [move];
    } else if (Math.abs(score - bestScore) < 1) {
      bestMoves.push(move);
    }
  });
  
  return bestMoves[Math.floor(Math.random() * bestMoves.length)];
}

function findTacticalMove(moves, level) {
  // Look for immediate checkmate
  for (const move of moves) {
    const clone = cloneBoard(board);
    executeMoveonBoard(move, "bot", clone);
    if (isCheckmate("player", clone)) {
      return move;
    }
  }
  
  // Look for moves that give check and lead to material gain
  const checkMoves = moves.filter(move => {
    const clone = cloneBoard(board);
    executeMoveonBoard(move, "bot", clone);
    return isInCheck("player", clone);
  });
  
  if (checkMoves.length > 0) {
    // Evaluate check moves more deeply
    let bestCheckMove = null;
    let bestScore = -Infinity;
    
    for (const move of checkMoves.slice(0, 5)) { // Limit to avoid lag
      const clone = cloneBoard(board);
      executeMoveonBoard(move, "bot", clone);
      const score = evaluatePosition(clone, level);
      
      if (score > bestScore) {
        bestScore = score;
        bestCheckMove = move;
      }
    }
    
    // Only return check move if it's significantly better
    const currentScore = evaluatePosition(board, level);
    if (bestScore > currentScore + 200) {
      return bestCheckMove;
    }
  }
  
  // Look for captures that win material
  const captureMoves = moves.filter(move => 
    move.type === "move" && board[move.to.y][move.to.x] && board[move.to.y][move.to.x].owner === "player"
  );
  
  if (captureMoves.length > 0) {
    const pieceValues = { FU: 100, KY: 350, KE: 350, GI: 550, KI: 600, KA: 850, HI: 950, OU: 15000 };
    
    let bestCapture = null;
    let bestValue = 0;
    
    for (const move of captureMoves) {
      const capturedValue = pieceValues[board[move.to.y][move.to.x].type] || 100;
      const attackerValue = pieceValues[board[move.from.y][move.from.x].type] || 100;
      
      // Simple capture evaluation - is the captured piece worth more?
      if (capturedValue >= attackerValue * 0.8) {
        if (capturedValue > bestValue) {
          bestValue = capturedValue;
          bestCapture = move;
        }
      }
    }
    
    if (bestCapture && bestValue >= 350) { // Only take good captures
      return bestCapture;
    }
  }
  
  return null; // No immediate tactical move found
}

function botMove() {
  if (currentPlayer !== "bot" || gameEnded || gameMode === "friend") return;
  
  const moves = getAllLegalMoves("bot");
  
  if (moves.length === 0) {
    if (isInCheck("bot")) {
      endGame("Checkmate! You win!");
    } else {
      endGame("Stalemate! It's a draw!");
    }
    return;
  }
  
  const botLevel = parseInt(botLevelSelect.value);
  let selectedMove;
  
  if (botLevel === 1) {
    // Level 1: Pure random
    selectedMove = moves[Math.floor(Math.random() * moves.length)];
  } else if (botLevel <= 15) {
    // Levels 2-15: Fast evaluation with capture preference
    selectedMove = getFastBestMove(moves, botLevel);
  } else if (botLevel <= 25) {
    // Levels 16-25: Light minimax (depth 1-2)
    const depth = botLevel <= 20 ? 1 : 2;
    selectedMove = getBestMoveWithMinimax(moves, depth, botLevel);
  } else if (botLevel <= 35) {
    // Levels 26-35: Medium depth (2-3)
    const depth = botLevel <= 30 ? 2 : 3;
    selectedMove = getBestMoveWithMinimax(moves, depth, botLevel);
  } else if (botLevel <= 45) {
    // Levels 36-45: Deep search (3-4)
    const depth = botLevel <= 40 ? 3 : 4;
    selectedMove = getBestMoveWithMinimax(moves, depth, botLevel);
  } else {
    // Levels 46-50: Master level (4-5 depth) with tactical patterns
    const depth = botLevel <= 48 ? 4 : 5;
    
    // Check for immediate tactical opportunities first
    const tacticalMove = findTacticalMove(moves, botLevel);
    if (tacticalMove) {
      selectedMove = tacticalMove;
    } else {
      selectedMove = getBestMoveWithMinimax(moves, depth, botLevel);
    }
  }
  
  executeMove(selectedMove, "bot");
  
  currentPlayer = "player";
  renderBoard();
  renderCaptured();
  updateGameInfo();
  
  if (isCheckmate("player")) {
    endGame("Checkmate! Bot wins!");
  } else if (isStalemate("player")) {
    endGame("Stalemate! It's a draw!");
  }
}

function getBestMoveWithMinimax(moves, depth, level) {
  let bestScore = -Infinity;
  let bestMoves = [];
  
  // Advanced move ordering for better alpha-beta pruning
  const sortedMoves = moves.sort((a, b) => {
    let scoreA = 0, scoreB = 0;
    
    // Prioritize captures by piece value
    if (a.type === "move" && board[a.to.y][a.to.x]) {
      const pieceValues = { FU: 1, KY: 3, KE: 3, GI: 5, KI: 5, KA: 7, HI: 8, OU: 100 };
      scoreA += (pieceValues[board[a.to.y][a.to.x].type] || 1) * 100;
    }
    if (b.type === "move" && board[b.to.y][b.to.x]) {
      const pieceValues = { FU: 1, KY: 3, KE: 3, GI: 5, KI: 5, KA: 7, HI: 8, OU: 100 };
      scoreB += (pieceValues[board[b.to.y][b.to.x].type] || 1) * 100;
    }
    
    // Prioritize checks
    const cloneA = cloneBoard(board);
    executeMoveonBoard(a, "bot", cloneA);
    if (isInCheck("player", cloneA)) scoreA += 50;
    
    const cloneB = cloneBoard(board);
    executeMoveonBoard(b, "bot", cloneB);
    if (isInCheck("player", cloneB)) scoreB += 50;
    
    return scoreB - scoreA;
  });
  
  // Evaluate more moves at higher levels
  const maxMoves = Math.min(sortedMoves.length, 
    level >= 45 ? 30 : 
    level >= 35 ? 25 : 
    level >= 25 ? 20 : 15
  );
  const movesToEvaluate = sortedMoves.slice(0, maxMoves);
  
  movesToEvaluate.forEach(move => {
    const clone = cloneBoard(board);
    executeMoveonBoard(move, "bot", clone);
    
    const score = minimax(clone, depth - 1, false, -Infinity, Infinity, level);
    
    if (score > bestScore) {
      bestScore = score;
      bestMoves = [move];
    } else if (score === bestScore) {
      bestMoves.push(move);
    }
  });
  
  // Reduce randomness significantly at higher levels
  const randomFactor = level >= 40 ? 0.02 : level >= 30 ? 0.05 : Math.max(0.05, (51 - level) * 0.01);
  if (Math.random() < randomFactor && moves.length > 0) {
    return moves[Math.floor(Math.random() * moves.length)];
  }
  
  return bestMoves[Math.floor(Math.random() * bestMoves.length)];
}

function minimax(board, depth, isMaximizing, alpha, beta, level) {
  if (depth === 0) {
    return evaluatePosition(board, level);
  }
  
  const currentOwner = isMaximizing ? "bot" : "player";
  const moves = getAllLegalMoves(currentOwner, board);
  
  if (moves.length === 0) {
    if (isInCheck(currentOwner, board)) {
      return isMaximizing ? -10000 : 10000; // Checkmate
    }
    return 0; // Stalemate
  }
  
  if (isMaximizing) {
    let maxEval = -Infinity;
    for (const move of moves) {
      const clone = cloneBoard(board);
      executeMoveonBoard(move, "bot", clone);
      const eval = minimax(clone, depth - 1, false, alpha, beta, level);
      maxEval = Math.max(maxEval, eval);
      alpha = Math.max(alpha, eval);
      if (beta <= alpha) break; // Alpha-beta pruning
    }
    return maxEval;
  } else {
    let minEval = Infinity;
    for (const move of moves) {
      const clone = cloneBoard(board);
      executeMoveonBoard(move, "player", clone);
      const eval = minimax(clone, depth - 1, true, alpha, beta, level);
      minEval = Math.min(minEval, eval);
      beta = Math.min(beta, eval);
      if (beta <= alpha) break; // Alpha-beta pruning
    }
    return minEval;
  }
}

function evaluatePosition(board, level) {
  let score = 0;
  
  const pieceValues = { 
    FU: 100, KY: 350, KE: 350, GI: 550, KI: 600, 
    KA: 850, HI: 950, OU: 15000,
    TO: 200, NY: 400, NK: 400, NG: 650, UM: 1200, RY: 1400
  };
  
  let botKingPos = null, playerKingPos = null;
  let botPieces = [], playerPieces = [];
  
  // Collect piece positions and find kings
  for (let y = 0; y < 9; y++) {
    for (let x = 0; x < 9; x++) {
      const piece = board[y][x];
      if (piece) {
        if (piece.type === "OU") {
          if (piece.owner === "bot") botKingPos = {x, y};
          else playerKingPos = {x, y};
        }
        
        if (piece.owner === "bot") botPieces.push({...piece, x, y});
        else playerPieces.push({...piece, x, y});
      }
    }
  }
  
  // Material evaluation with position bonuses
  for (let y = 0; y < 9; y++) {
    for (let x = 0; x < 9; x++) {
      const piece = board[y][x];
      if (piece) {
        let value = pieceValues[piece.type] || 100;
        
        // Position-specific bonuses
        if (level >= 16) {
          // Piece-specific positional bonuses
          if (piece.type === "FU") {
            // Pawns are stronger when advanced
            const advancement = piece.owner === "bot" ? y : (8 - y);
            value += advancement * 15;
          }
          
          if (piece.type === "KA" || piece.type === "UM") {
            // Bishops prefer diagonals and center
            const centerDistance = Math.abs(x - 4) + Math.abs(y - 4);
            value += (8 - centerDistance) * 20;
          }
          
          if (piece.type === "HI" || piece.type === "RY") {
            // Rooks prefer open files and ranks
            let openFile = true, openRank = true;
            for (let i = 0; i < 9; i++) {
              if (i !== y && board[i][x] && board[i][x].type === "FU") openFile = false;
              if (i !== x && board[y][i] && board[y][i].type === "FU") openRank = false;
            }
            if (openFile) value += 100;
            if (openRank) value += 100;
          }
          
          if (piece.type === "KI" || piece.type === "GI" || piece.type === "NG") {
            // Generals prefer to be near the king for defense
            const kingPos = piece.owner === "bot" ? botKingPos : playerKingPos;
            if (kingPos) {
              const kingDistance = Math.abs(x - kingPos.x) + Math.abs(y - kingPos.y);
              if (kingDistance <= 2) value += 80;
            }
          }
        }
        
        // Advanced evaluation for higher levels
        if (level >= 25) {
          // Piece mobility (very important in shogi)
          const mobility = getAllLegalMovesForPiece({x, y}, piece.owner, board).length;
          value += mobility * 8;
          
          // Attack/defense evaluation
          if (piece.owner === "bot") {
            // Bonus for attacking enemy pieces
            for (const enemyPiece of playerPieces) {
              if (validMove({x, y}, {x: enemyPiece.x, y: enemyPiece.y}, "bot", board)) {
                value += (pieceValues[enemyPiece.type] || 100) * 0.1;
              }
            }
          } else {
            // Penalty for being attacked
            for (const botPiece of botPieces) {
              if (validMove({x: botPiece.x, y: botPiece.y}, {x, y}, "bot", board)) {
                value -= (pieceValues[piece.type] || 100) * 0.1;
              }
            }
          }
        }
        
        // Master level evaluation
        if (level >= 40) {
          // King safety evaluation
          if (piece.type === "OU") {
            let safetyScore = 0;
            
            // Penalty for exposed king
            const edges = (x === 0 || x === 8 ? 1 : 0) + (y === 0 || y === 8 ? 1 : 0);
            safetyScore -= edges * 150;
            
            // Bonus for pieces defending the king
            let defenders = 0;
            for (let dx = -1; dx <= 1; dx++) {
              for (let dy = -1; dy <= 1; dy++) {
                const nx = x + dx, ny = y + dy;
                if (nx >= 0 && nx < 9 && ny >= 0 && ny < 9) {
                  const defender = board[ny][nx];
                  if (defender && defender.owner === piece.owner && defender.type !== "OU") {
                    defenders++;
                  }
                }
              }
            }
            safetyScore += defenders * 100;
            
            // Penalty for being in check
            if (isInCheck(piece.owner, board)) {
              safetyScore -= 500;
            }
            
            value += safetyScore;
          }
          
          // Promotion zone control
          const promotionZone = piece.owner === "bot" ? [6, 7, 8] : [0, 1, 2];
          if (promotionZone.includes(y)) {
            value += 50;
          }
        }
        
        if (piece.owner === "bot") {
          score += value;
        } else {
          score -= value;
        }
      }
    }
  }
  
  // Captured pieces evaluation (hand pieces are very valuable in shogi)
  playerCaptured.forEach(type => {
    score -= (pieceValues[type] || 100) * 0.8; // Increased from 0.5
  });
  
  botCaptured.forEach(type => {
    score += (pieceValues[type] || 100) * 0.8; // Increased from 0.5
  });
  
  // Tempo bonus (slight advantage for having the move)
  if (level >= 30) {
    score += 25;
  }
  
  return score;
}

function getAllLegalMovesForPiece(pos, owner, board) {
  const moves = [];
  for (let y = 0; y < 9; y++) {
    for (let x = 0; x < 9; x++) {
      if (validMove(pos, { x, y }, owner, board)) {
        const clone = cloneBoard(board);
        clone[y][x] = clone[pos.y][pos.x];
        clone[pos.y][pos.x] = null;
        if (!isInCheck(owner, clone)) {
          moves.push({ x, y });
        }
      }
    }
  }
  return moves;
}

function executeMoveonBoard(move, owner, board) {
  if (move.type === "drop") {
    board[move.to.y][move.to.x] = { 
      type: move.from.type, 
      char: kanji[move.from.type], 
      owner 
    };
  } else {
    let piece = board[move.from.y][move.from.x];
    
    if (mustPromote(piece, move.from.y, move.to.y)) {
      piece = promote(piece);
    } else if (canPromote(piece, move.from.y, move.to.y)) {
      if (owner === "bot" && Math.random() < 0.8) {
        piece = promote(piece);
      }
    }
    
    board[move.to.y][move.to.x] = piece;
    board[move.from.y][move.from.x] = null;
  }
}

function executeMove(move, owner) {
  if (move.type === "drop") {
    board[move.to.y][move.to.x] = { 
      type: move.from.type, 
      char: kanji[move.from.type], 
      owner 
    };
    
    if (owner === "bot") {
      botCaptured.splice(botCaptured.indexOf(move.from.type), 1);
    }
  } else {
    let piece = board[move.from.y][move.from.x];
    let target = board[move.to.y][move.to.x];
    
    if (target && target.owner !== owner) {
      if (owner === "bot") {
        botCaptured.push(demote(target.type));
      } else {
        playerCaptured.push(demote(target.type));
      }
    }
    
    if (mustPromote(piece, move.from.y, move.to.y)) {
      piece = promote(piece);
    } else if (canPromote(piece, move.from.y, move.to.y)) {
      if (owner === "bot" && Math.random() < 0.8) {
        piece = promote(piece);
      }
    }
    
    board[move.to.y][move.to.x] = piece;
    board[move.from.y][move.from.x] = null;
  }
  
  recordMove(move);
}

function endGame(message) {
  gameEnded = true;
  setTimeout(() => {
    showGameOverDialog(message);
  }, 100);
}

function showGameOverDialog(message) {
  const overlay = document.createElement('div');
  overlay.className = 'game-over';
  
  const content = document.createElement('div');
  content.className = 'game-over-content';
  
  const title = document.createElement('h2');
  title.textContent = 'Game Over';
  
  const messageEl = document.createElement('p');
  messageEl.textContent = message;
  messageEl.style.fontSize = '18px';
  messageEl.style.marginBottom = '20px';
  
  const newGameButton = document.createElement('button');
  newGameButton.textContent = 'New Game';
  newGameButton.className = 'game-button';
  newGameButton.onclick = () => {
    document.body.removeChild(overlay);
    resetGame();
  };
  
  content.appendChild(title);
  content.appendChild(messageEl);
  content.appendChild(newGameButton);
  overlay.appendChild(content);
  document.body.appendChild(overlay);
}

function resetGame() {
  board = Array(9).fill(null).map(() => Array(9).fill(null));
  selected = null;
  playerCaptured = [];
  botCaptured = [];
  currentPlayer = "player";
  gameHistory = [];
  moveCount = 0;
  gameEnded = false;
  drawOffered = false;
  
  nifuWarningEl.style.display = "none";
  
  initBoard();
}

function resign() {
  if (gameEnded) return;
  
  const confirmMessage = gameMode === "friend" ? 
    `Are you sure ${currentPlayer === "player" ? "Player 1" : "Player 2"} wants to resign?` :
    "Are you sure you want to resign?";
    
  if (confirm(confirmMessage)) {
    if (gameMode === "friend") {
      const winner = currentPlayer === "player" ? "Player 2" : "Player 1";
      endGame(`${currentPlayer === "player" ? "Player 1" : "Player 2"} resigned. ${winner} wins!`);
    } else {
      endGame("You resigned. Bot wins!");
    }
  }
}

function offerDraw() {
  if (gameEnded) return;
  
  if (drawOffered) {
    alert("Draw already offered!");
    return;
  }
  
  drawOffered = true;
  drawBtn.textContent = "Draw Offered";
  drawBtn.disabled = true;
  
  if (gameMode === "friend") {
    // In friend mode, immediately accept draw
    setTimeout(() => {
      endGame("Draw agreed!");
    }, 500);
  } else {
    // Bot considers draw offer
    setTimeout(() => {
      const botLevel = parseInt(botLevelSelect.value);
      // Higher level bots are more selective about draws
      const acceptChance = Math.max(0.1, 0.5 - (botLevel * 0.01));
      const acceptDraw = Math.random() < acceptChance;
      
      if (acceptDraw) {
        endGame("Draw accepted by bot!");
      } else {
        alert("Bot declined the draw offer.");
        drawOffered = false;
        drawBtn.textContent = "Offer Draw";
        drawBtn.disabled = false;
      }
    }, 1000);
  }
}

// Button event listeners
resignBtn.addEventListener('click', resign);
drawBtn.addEventListener('click', offerDraw);
newGameBtn.addEventListener('click', resetGame);

// Initialize the game
initBotLevels();
updateGameModeUI();
updateVariantUI();
initBoard();