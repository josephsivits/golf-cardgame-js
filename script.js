// Game State
const state = {
    players: [], // Array of 4 players
    deck: [],
    discardPile: [],
    currentPlayerIndex: 0,
    currentRound: 1,
    maxRounds: 6,
    selectedCard: null, // { playerIndex, cardIndex }
    drawnCard: null, // Card drawn from deck/discard
    phase: 'setup', // 'setup' (flip 2), 'draw' (pick deck/discard), 'action' (swap/discard), 'confirm'
    turnState: {
        source: null, // 'deck' or 'discard_pile'
        targetIndex: null, // index in player's grid
        cardsFlippedInSetup: 0 // Track how many cards CURRENT PLAYER has flipped in setup
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
            div: document.getElementById('player-1'), // Section element now
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
    // Initialize empty players structure for scores
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
    state.phase = 'setup'; // Players flip 2 cards
    state.turnState = { source: null, targetIndex: null, cardsFlippedInSetup: 0 };
    
    // No AI auto-flip. All players must flip manually.
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
        
        // Active Player Indication (Green Outline)
        if (state.currentPlayerIndex === pIndex && !state.gameOver) {
            playerDiv.classList.add('active-turn');
            elements.players[pIndex].label.style.color = 'var(--primary-color)';
        } else {
            playerDiv.classList.remove('active-turn');
            elements.players[pIndex].label.style.color = '#333';
        }
        
        player.hand.forEach((slot, cIndex) => {
            const cardEl = document.createElement('div');
            // Show card if faceUp OR if it's the selected target during setup/confirm
            const isVisible = slot.faceUp; 
            
            cardEl.className = `card ${isVisible ? 'face-up' : 'face-down'}`;
            // Accessibility: Make cards focusable
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

            // Highlighting logic
            if (state.currentPlayerIndex === pIndex) {
                // Highlight if selected for action
                if (state.turnState.targetIndex === cIndex) {
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
    }

    // Render Discard
    const discardEl = elements.discardPile;
    discardEl.innerHTML = '';
    const topDiscard = state.discardPile[state.discardPile.length - 1];
    
    // Always clear, then re-add top card
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
        
        // Update aria-label for discard pile
        discardEl.setAttribute('aria-label', `Discard Pile: Top card is ${topDiscard.value} of ${topDiscard.suit}`);
    } else {
        discardEl.setAttribute('aria-label', 'Discard Pile: Empty');
    }
    
    discardEl.onclick = () => handleDiscardClick();
    discardEl.onkeydown = (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleDiscardClick();
        }
    };

    // Render Drawn Card Overlay (if holding one)
    if (state.drawnCard) {
        if (state.turnState.source === 'deck') {
             const drawnEl = document.createElement('div');
             drawnEl.className = 'card face-up';
             drawnEl.style.position = 'absolute';
             drawnEl.style.zIndex = 10;
             drawnEl.textContent = `${state.drawnCard.value}${state.drawnCard.suit}`;
             if (['♥', '♦'].includes(state.drawnCard.suit)) drawnEl.classList.add('red');
             else drawnEl.classList.add('black');
             deckEl.appendChild(drawnEl);
        } else if (state.turnState.source === 'discard') {
             if(discardEl.firstElementChild) discardEl.firstElementChild.style.boxShadow = '0 0 10px gold';
        }
    }

    // Confirm Button Visibility
    if (state.phase === 'confirm' || (state.phase === 'setup' && state.turnState.targetIndex !== null)) {
        elements.actionArea.classList.remove('hidden');
        elements.confirmBtn.focus(); // Focus management
    } else {
        elements.actionArea.classList.add('hidden');
    }
}

// Interaction Handlers

function handleDeckClick() {
    if (state.gameOver) return;
    // Removed player check - any player can act on their turn
    if (state.phase !== 'draw') return;

    // Draw from deck
    const card = state.deck.pop();
    state.drawnCard = card;
    state.turnState.source = 'deck';
    state.phase = 'action';
    updateUI();
}

function handleDiscardClick() {
    if (state.gameOver) return;
    // Removed player check
    
    if (state.phase === 'draw') {
        if (state.discardPile.length === 0) return; // Can't draw from empty discard
        
        // Draw from discard
        const card = state.discardPile.pop();
        state.drawnCard = card;
        state.turnState.source = 'discard';
        state.phase = 'action';
        updateUI();
    } else if (state.phase === 'action' && state.turnState.source === 'deck') {
        // Discarding the drawn card
        state.turnState.targetIndex = -1; // -1 means discard pile
        state.phase = 'confirm';
        updateUI();
    }
}

function handleCardClick(pIndex, cIndex) {
    if (state.gameOver) return;
    if (state.currentPlayerIndex !== pIndex) return; // Must be current player's turn and their own card

    if (state.phase === 'setup') {
        // Selecting card to flip
        const slot = state.players[pIndex].hand[cIndex];
        if (slot.faceUp) return; // Already flipped
        
        state.turnState.targetIndex = cIndex;
        updateUI();
    }
    else if (state.phase === 'action') {
        // Select card to swap
        state.turnState.targetIndex = cIndex;
        state.phase = 'confirm';
        updateUI();
    } else if (state.phase === 'confirm') {
        // Change selection
        state.turnState.targetIndex = cIndex;
        updateUI();
    }
}

elements.confirmBtn.onclick = () => {
    if (state.phase === 'setup') {
        handleSetupConfirm();
    } else if (state.phase === 'confirm') {
        handleTurnConfirm();
    }
};

function handleSetupConfirm() {
    if (state.turnState.targetIndex === null) return;
    
    const idx = state.turnState.targetIndex;
    const player = state.players[state.currentPlayerIndex];
    
    // Flip card
    player.hand[idx].faceUp = true;
    state.turnState.cardsFlippedInSetup++;
    state.turnState.targetIndex = null;
    
    if (state.turnState.cardsFlippedInSetup >= 2) {
        // Setup done for THIS player
        state.turnState.cardsFlippedInSetup = 0;
        
        // Move to next player for setup, OR start game if all done
        // If we are at last player (3)
        if (state.currentPlayerIndex === 3) {
            state.currentPlayerIndex = 0; // Back to P1 to start game
            state.phase = 'draw';
        } else {
            state.currentPlayerIndex++;
            // Still in setup phase
        }
    }
    
    updateUI();
}

function handleTurnConfirm() {
    const pIndex = state.currentPlayerIndex;
    const player = state.players[pIndex];
    
    if (state.turnState.targetIndex === -1) {
        // Discarding the drawn card (from deck)
        state.discardPile.push(state.drawnCard);
    } else {
        // Swapping
        const targetSlot = player.hand[state.turnState.targetIndex];
        const oldCard = targetSlot.card;
        
        targetSlot.card = state.drawnCard;
        targetSlot.faceUp = true;
        
        state.discardPile.push(oldCard); // Discard the old card
    }

    state.drawnCard = null;
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
    state.turnState = { source: null, targetIndex: null };
    state.drawnCard = null;
    
    // Next player
    state.currentPlayerIndex = (state.currentPlayerIndex + 1) % 4;
    
    updateUI();
    
    // NO AI TURN CALL HERE
}

function calculateScores() {
    // Reveal all cards
    state.players.forEach(p => {
        p.hand.forEach(slot => slot.faceUp = true);
        
        let score = 0;
        
        for (let col = 0; col < 3; col++) {
            const card1 = p.hand[col].card;
            const card2 = p.hand[col + 3].card;
            
            if (card1.value === card2.value) {
                // Cancel out -> 0 points
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
