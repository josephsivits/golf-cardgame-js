// Game State
const state = {
    players: [], 
    deck: [],
    discardPile: [],
    currentPlayerIndex: 0,
    currentRound: 1,
    maxRounds: 6,
    drawnCard: null, 
    phase: 'setup', 
    
    // Unified Single Selection State
    selection: {
        type: null, // 'deck', 'discard', 'hand'
        index: null // for hand (0-5)
    },
    
    turnState: {
        source: null, // 'deck' or 'discard' (where drawn card came from)
        cardsFlippedInSetup: 0 
    },
    gameOver: false
};

// DOM Elements
const elements = {
    board: document.getElementById('board'),
    deck: document.getElementById('deck'),
    discardPile: document.getElementById('discard-pile'),
    confirmBtn: document.getElementById('confirm-btn'),
    actionArea: document.getElementById('action-area'),
    roundTracker: document.getElementById('current-round'),
    playerScores: [
        document.getElementById('score-p1'),
        document.getElementById('score-p2'),
        document.getElementById('score-p3'),
        document.getElementById('score-p4')
    ],
    players: [
        {
            div: document.getElementById('player-1'), 
            container: document.querySelector('#player-1 .cards-container'),
            label: document.querySelector('#player-1 .player-label')
        },
        {
            div: document.getElementById('player-2'),
            container: document.querySelector('#player-2 .cards-container'),
            label: document.querySelector('#player-2 .player-label')
        },
        {
            div: document.getElementById('player-3'),
            container: document.querySelector('#player-3 .cards-container'),
            label: document.querySelector('#player-3 .player-label')
        },
        {
            div: document.getElementById('player-4'),
            container: document.querySelector('#player-4 .cards-container'),
            label: document.querySelector('#player-4 .player-label')
        }
    ]
};

// Helpers
function createDeck() {
    const suits = ['♥', '♦', '♣', '♠'];
    const values = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
    const deck = [];
    for (let suit of suits) {
        for (let value of values) {
            let score = 0;
            if (value === 'A') score = 1;
            else if (['J', 'Q'].includes(value)) score = 10;
            else if (value === 'K') score = 0;
            else score = parseInt(value);
            
            deck.push({ suit, value, score, id: Math.random().toString(36).substr(2, 9) });
        }
    }
    return deck;
}

function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// Initialization
function initGame() {
    state.currentRound = 1;
    state.gameOver = false;
    state.players = Array(4).fill(null).map((_, i) => ({
        id: i,
        hand: [],
        totalScore: 0,
        roundScore: 0
    }));
    
    startRound();
}

function startRound() {
    state.deck = shuffle(createDeck());
    state.discardPile = []; 
    state.discardPile = [state.deck.pop()]; 

    // Deal cards
    state.players.forEach(p => {
        p.hand = [];
        for (let c = 0; c < 6; c++) {
            p.hand.push({
                card: state.deck.pop(),
                faceUp: false
            });
        }
    });

    state.currentPlayerIndex = 0;
    state.phase = 'setup'; 
    state.selection = { type: null, index: null };
    state.turnState = { source: null, cardsFlippedInSetup: 0 };
    
    updateUI();
}

// Rendering
function updateUI() {
    elements.roundTracker.textContent = state.currentRound;
    
    // Update Scores
    state.players.forEach((p, i) => {
        elements.playerScores[i].textContent = `P${i+1}: ${p.totalScore}`;
    });

    // Render Players
    state.players.forEach((player, pIndex) => {
        const container = elements.players[pIndex].container;
        const playerDiv = elements.players[pIndex].div;
        
        container.innerHTML = '';
        
        if (state.currentPlayerIndex === pIndex && !state.gameOver) {
            playerDiv.classList.add('active-turn');
            elements.players[pIndex].label.style.color = 'var(--primary-color)';
        } else {
            playerDiv.classList.remove('active-turn');
            elements.players[pIndex].label.style.color = '#333';
        }
        
        player.hand.forEach((slot, cIndex) => {
            const cardEl = document.createElement('div');
            const isVisible = slot.faceUp; 
            
            cardEl.className = `card ${isVisible ? 'face-up' : 'face-down'}`;
            cardEl.setAttribute('role', 'button');
            cardEl.setAttribute('tabindex', '0');
            cardEl.setAttribute('aria-label', isVisible ? `${slot.card.value} of ${slot.card.suit}` : 'Face down card');
            
            if (isVisible) {
                cardEl.textContent = `${slot.card.value}${slot.card.suit}`;
                if (['♥', '♦'].includes(slot.card.suit)) {
                    cardEl.classList.add('red');
                } else {
                    cardEl.classList.add('black');
                }
            }

            // Selection Logic (Single Selection)
            if (state.currentPlayerIndex === pIndex) {
                if (state.selection.type === 'hand' && state.selection.index === cIndex) {
                    cardEl.classList.add('selected');
                }
            }

            const clickHandler = () => handleCardClick(pIndex, cIndex);
            cardEl.onclick = clickHandler;
            cardEl.onkeydown = (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    clickHandler();
                }
            };
            
            container.appendChild(cardEl);
        });
    });

    // Render Deck
    const deckEl = elements.deck;
    deckEl.innerHTML = '';
    deckEl.classList.remove('selected-source');
    
    if (state.deck.length > 0) {
        const back = document.createElement('div');
        back.className = 'card-back';
        deckEl.appendChild(back);
        deckEl.onclick = () => handleDeckClick();
        deckEl.onkeydown = (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleDeckClick();
            }
        };
        
        if (state.selection.type === 'deck') {
            deckEl.classList.add('selected-source');
        }
    }

    // Render Discard
    const discardEl = elements.discardPile;
    discardEl.innerHTML = '';
    discardEl.classList.remove('selected-source');
    
    const topDiscard = state.discardPile[state.discardPile.length - 1];
    
    if (topDiscard) {
        const cardEl = document.createElement('div');
        cardEl.className = 'card face-up';
        cardEl.textContent = `${topDiscard.value}${topDiscard.suit}`;
        if (['♥', '♦'].includes(topDiscard.suit)) {
            cardEl.classList.add('red');
        } else {
            cardEl.classList.add('black');
        }
        discardEl.appendChild(cardEl);
        discardEl.setAttribute('aria-label', `Discard Pile: Top card is ${topDiscard.value} of ${topDiscard.suit}`);
    } else {
        discardEl.setAttribute('aria-label', 'Discard Pile: Empty');
    }
    
    if (state.selection.type === 'discard') {
        discardEl.classList.add('selected-source');
    }
    
    discardEl.onclick = () => handleDiscardClick();
    discardEl.onkeydown = (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleDiscardClick();
        }
    };

    // Render Drawn Card Overlay
    if (state.drawnCard && state.phase === 'action') {
        if (state.turnState.source === 'deck') {
             const drawnEl = document.createElement('div');
             drawnEl.className = 'card face-up';
             drawnEl.style.position = 'absolute';
             drawnEl.style.zIndex = 10;
             drawnEl.textContent = `${state.drawnCard.value}${state.drawnCard.suit}`;
             if (['♥', '♦'].includes(state.drawnCard.suit)) drawnEl.classList.add('red');
             else drawnEl.classList.add('black');
             deckEl.appendChild(drawnEl);
        }
    }

    // Confirm Button Visibility
    let showConfirm = false;
    
    if (state.phase === 'setup') {
        if (state.selection.type === 'hand' && state.selection.index !== null) showConfirm = true;
    }
    else if (state.phase === 'draw') {
        // Only show confirm if Source is selected
        if (state.selection.type === 'deck' || state.selection.type === 'discard') showConfirm = true;
    }
    else if (state.phase === 'action') {
        // Show confirm if Target is selected (swap) OR Discard is selected (discard drawn)
        if (state.selection.type === 'hand' || state.selection.type === 'discard') showConfirm = true;
    }

    if (showConfirm) {
        elements.actionArea.classList.remove('hidden');
    } else {
        elements.actionArea.classList.add('hidden');
    }
}

// Interaction Handlers

function handleDeckClick() {
    if (state.gameOver) return;
    if (state.phase === 'draw') {
        // Strict Single Selection: Select Deck
        state.selection = { type: 'deck', index: null };
        updateUI();
    }
}

function handleDiscardClick() {
    if (state.gameOver) return;
    
    if (state.phase === 'draw') {
        if (state.discardPile.length === 0) return; 
        state.selection = { type: 'discard', index: null };
        updateUI();
    } 
    else if (state.phase === 'action') {
        // Discarding the drawn card
        state.selection = { type: 'discard', index: null }; 
        updateUI();
    }
}

function handleCardClick(pIndex, cIndex) {
    if (state.gameOver) return;
    if (state.currentPlayerIndex !== pIndex) return;

    if (state.phase === 'setup') {
        const slot = state.players[pIndex].hand[cIndex];
        if (slot.faceUp) return; 
        state.selection = { type: 'hand', index: cIndex };
        updateUI();
    }
    else if (state.phase === 'draw') {
        // Allowed but invalid for confirmation (allows highlighting card to see it's selected)
        state.selection = { type: 'hand', index: cIndex };
        updateUI();
    }
    else if (state.phase === 'action') {
        // Select card to swap
        state.selection = { type: 'hand', index: cIndex };
        updateUI();
    }
}

elements.confirmBtn.onclick = () => {
    if (state.phase === 'setup') {
        confirmSetupFlip();
    } else if (state.phase === 'draw') {
        confirmDrawPhase();
    } else if (state.phase === 'action') {
        confirmActionPhase();
    }
};

function confirmSetupFlip() {
    if (state.selection.type !== 'hand' || state.selection.index === null) return;
    
    const idx = state.selection.index;
    const player = state.players[state.currentPlayerIndex];
    
    player.hand[idx].faceUp = true;
    state.turnState.cardsFlippedInSetup++;
    state.selection = { type: null, index: null };
    
    if (state.turnState.cardsFlippedInSetup >= 2) {
        state.turnState.cardsFlippedInSetup = 0;
        if (state.currentPlayerIndex === 3) {
            state.currentPlayerIndex = 0;
            state.phase = 'draw';
        } else {
            state.currentPlayerIndex++;
        }
    }
    
    updateUI();
}

function confirmDrawPhase() {
    const type = state.selection.type;
    
    if (type === 'deck') {
        const card = state.deck.pop();
        state.drawnCard = card;
        state.turnState.source = 'deck';
        state.phase = 'action';
    }
    else if (type === 'discard') {
        const card = state.discardPile.pop();
        state.drawnCard = card;
        state.turnState.source = 'discard';
        state.phase = 'action';
    }
    
    state.selection = { type: null, index: null };
    updateUI();
}

function confirmActionPhase() {
    if (state.selection.type === 'discard') {
        // Discarding the drawn card
        state.discardPile.push(state.drawnCard);
        state.drawnCard = null;
        state.selection = { type: null, index: null };
        endTurn();
    } 
    else if (state.selection.type === 'hand' && state.selection.index !== null) {
        executeSwap(state.selection.index);
    }
}

function executeSwap(handIndex) {
    const player = state.players[state.currentPlayerIndex];
    const targetSlot = player.hand[handIndex];
    const oldCard = targetSlot.card;
    
    targetSlot.card = state.drawnCard;
    targetSlot.faceUp = true;
    
    state.discardPile.push(oldCard);
    state.drawnCard = null;
    
    state.selection = { type: null, index: null };
    endTurn();
}

function endTurn() {
    const currentPlayer = state.players[state.currentPlayerIndex];
    const allFaceUp = currentPlayer.hand.every(s => s.faceUp);
    
    if (allFaceUp) {
        calculateScores();
        return;
    }

    state.phase = 'draw';
    state.selection = { type: null, index: null };
    state.drawnCard = null;
    state.currentPlayerIndex = (state.currentPlayerIndex + 1) % 4;
    
    updateUI();
}

function calculateScores() {
    state.players.forEach(p => {
        p.hand.forEach(slot => slot.faceUp = true);
        
        let score = 0;
        
        for (let col = 0; col < 3; col++) {
            const card1 = p.hand[col].card;
            const card2 = p.hand[col + 3].card;
            
            if (card1.value === card2.value) {
                // Cancel out
            } else {
                score += card1.score + card2.score;
            }
        }
        
        p.roundScore = score;
        p.totalScore += score;
    });
    
    updateUI();
    
    setTimeout(() => {
        if (state.currentRound < state.maxRounds) {
            alert(`Round ${state.currentRound} Over! Scores: ${state.players.map(p => p.roundScore).join(', ')}`);
            state.currentRound++;
            startRound();
        } else {
            alert(`Game Over! Final Scores: ${state.players.map(p => p.totalScore).join(', ')}`);
            state.gameOver = true;
        }
    }, 1000);
}

// Start
initGame();
