var othello = {};
var profundidad = 4;

(function () {

    // Utilities {{{1
    var cantidad_nodos_visitados = 0;
    var debug = {};

    /*
    * @expressionAsFunction makeGameTree
    * */
    function delay(expressionAsFunction) {

        var result;
        var isEvaluated = false;

        return function () {
          if (!isEvaluated) {
            result = expressionAsFunction();
            isEvaluated = true;
          }
          return result;
        };
    }

    function force(promise) {

        return promise();
    }

    function sum(ns) {

        return ns.reduce(function (t, n) {return t + n;});
    }

    // Core logic {{{1

    var N = 8;

    var EMPTY = 'empty';
    var WHITE = 'white';
    var BLACK = 'black';

    /*
    *se inicia el tablero
    *se colocan los 4 elementos iniciales
    * */
    function makeInitialGameBoard() {

        var board = {};

        for (var x = 0; x < N; x++)
          for (var y = 0; y < N; y++)
            board[[x, y]] = EMPTY;

        var x2 = x >> 1;
        var y2 = y >> 1;
        board[[x2 - 1, y2 - 1]] = WHITE;
        board[[x2 - 1, y2 - 0]] = BLACK;
        board[[x2 - 0, y2 - 1]] = BLACK;
        board[[x2 - 0, y2 - 0]] = WHITE;

        return board;
    }

    /*
    * @board tablero
    * @player jugador
    * @wasPassed false al inicio
    * @nest 1 al inicio
    * */
    function makeGameTree(board, player, wasPassed, nest) {

        return {
            board: board,
            player: player,
            moves: listPossibleMoves(board, player, wasPassed, nest)
        };
    }

    /*
     * @board tablero
     * @player jugador
     * @wasPassed false al inicio se usa para pasar la jugada si no hay movimiento posible
     * @nest 1 al inicio
     * */
    function listPossibleMoves(board, player, wasPassed, nest) {
        return completePassingMove(
            listAttackingMoves(board, player, nest),
            board,
            player,
            wasPassed,
            nest
        );
    }

    function completePassingMove(attackingMoves, board, player, wasPassed, nest) {
        if (0 < attackingMoves.length)
          return attackingMoves;
        else if (!wasPassed)
          return [{
            isPassingMove: true,
            gameTreePromise: delay(function () {
              return makeGameTree(board, nextPlayer(player), true, nest + 1);
            })
          }];
        else
          return [];
    }

    /*
     * @board tablero
     * @player jugador
     * @nest 1 al inicio
     * */
    function listAttackingMoves(board, player, nest) {

        var moves = [];

        for (var x = 0; x < N; x++) {
          for (var y = 0; y < N; y++) {
            var vulnerableCells = listVulnerableCells(board, x, y, player);
            if (canAttack(vulnerableCells)) {
              moves.push({
                x: x,
                y: y,
                gameTreePromise: (function (x, y, vulnerableCells) {
                  return delay(function () {
                    return makeGameTree(
                      makeAttackedBoard(board, vulnerableCells, player),
                      nextPlayer(player),
                      false,
                      nest + 1
                    );
                  });
                })(x, y, vulnerableCells)
              });
            }
          }
        }

        return moves;
    }

    function nextPlayer(player) {

        return player == BLACK ? WHITE : BLACK;
    }

    function canAttack(vulnerableCells) {

        return vulnerableCells.length;
    }

    /*
    * funcion que dibuja en el tablero los posible movimientos que podemos realizar
    * @board tablero
    * @vulnerableCells posibles jugadas
    * @player jugador
    * */
    function makeAttackedBoard(board, vulnerableCells, player) {

        var newBoard = JSON.parse(JSON.stringify(board));
        for (var i = 0; i < vulnerableCells.length; i++)
          newBoard[vulnerableCells[i]] = player;
        return newBoard;
    }

    /*
    * @board tablero
    * @x posicion x donde se puede jugar
    * @y posicion y donde se puede jugar
    * @player jugador
    * */
    function listVulnerableCells(board, x, y, player) {

        var vulnerableCells = [];

        if (board[[x, y]] != EMPTY)
          return vulnerableCells;

          //marca las posibles jugadas del jugador actual
        var opponent = nextPlayer(player);
        for (var dx = -1; dx <= 1; dx++) {
          for (var dy = -1; dy <= 1; dy++) {
            if (dx == 0 && dy == 0)
              continue;
            for (var i = 1; i < N; i++) {
              var nx = x + i * dx;
              var ny = y + i * dy;
              if (nx < 0 || N <= nx || ny < 0 || N <= ny)
                break;
              var cell = board[[nx, ny]];
              if (cell == player && 2 <= i) {
                for (var j = 0; j < i; j++)
                  vulnerableCells.push([x + j * dx, y + j * dy]);
                break;
              }
              if (cell != opponent)
                break;
            }
          }
        }

        return vulnerableCells;
    }

    // AI {{{1
    /*
    @param {board} tablero
    @param {player} jugador
    @return {integer}
    */
    function scoreBoardBySimpleCount(board, player) {

        var opponent = nextPlayer(player);
        var jugadorActual = sum($.map(board, function (v) { return v == player;}));
        var jugadorOponente = sum($.map(board, function (v) { return v == opponent;}))
        console.log(jugadorActual);
        console.log(jugadorOponente);
        return  jugadorActual - jugadorOponente;
    }

    var weightTable =
        (function () {
          var t = {};
          for (var x = 0; x < N; x++)
            for (var y = 0; y < N; y++)
              t[[x, y]] = (x == 0 || x == N - 1 ? 10 : 1) * (y == 0 || y == N - 1 ? 10 : 1);
          return t;
        })();

    function scoreBoardByWeightedCount(board, player) {

        var opponent = nextPlayer(player);
        var wt = weightTable;
        var jugadorActual = sum($.map(board, function (v, p) {return (v == player) * wt[p];}));
        console.log('jugadorActual: ' + jugadorActual);
        //console.log(board);
        var jugadorOponente = sum($.map(board, function (v, p) {return (v == opponent) * wt[p];}));
        console.log('jugadorOponente: ' + jugadorOponente);
        //console.log(board);

        return jugadorActual - jugadorOponente;

    }

    function makeAI(config) {

        if( config.algoritmo == 'minimax_poda_alfa_beta' ){

            for(var i = 1; i<= config.level; i++)
                debug[i] = 0;

            console.log('alfabeta' + debug);

            var algoritmo = {

                findTheBestMove: function (gameTree) {

                    var diferenciaTiempo;
                    cantidad_nodos_visitados = 0;
                    var tiempoActual1 = new Date();
                    var ratings = calculateMaxRatings(
                        limitGameTreeDepth(gameTree, config.level),
                        gameTree.player,
                        -10000000,
                        10000000,
                        config.scoreBoard
                    );
                    var maxRating = Math.max.apply(null, ratings);
                    console.log('minimax con poda ratings: ' + ratings);
                    console.log('minimax con poda maxRating: ' + maxRating);
                    var tiempoActual2 = new Date();
                    diferenciaTiempo = tiempoActual2.getTime() - tiempoActual1.getTime();
                    $('#tiempo').val(diferenciaTiempo);
                    $('#cantidad_nodos').val(cantidad_nodos_visitados);
                    console.log('moves: ' + JSON.stringify(gameTree.moves));
                    console.log('move seleccionado: ' + JSON.stringify(gameTree.moves[ratings.indexOf(maxRating)]));
                    console.log('mirar' + JSON.stringify(debug));

                    return gameTree.moves[ratings.indexOf(maxRating)];
                }
            }
        }else if( config.algoritmo == 'minimax' ){

            for(var i = 1; i<= config.level; i++)
                debug[i] = 0;

            console.log('minimax' + debug);

            var algoritmo = {

                findTheBestMove: function (gameTree) {

                    var diferenciaTiempo;
                    cantidad_nodos_visitados = 0;
                    var tiempoActual1 = new Date();

                    var ratings = calculateMaxRatings2(
                        limitGameTreeDepth(gameTree, config.level),
                        gameTree.player,
                        Number.MIN_VALUE,
                        Number.MAX_VALUE,
                        config.scoreBoard
                    );

                    console.log('minimax ratings: ' + ratings);

                    var tiempoActual2 = new Date();
                    diferenciaTiempo = tiempoActual2.getTime() - tiempoActual1.getTime();

                    $('#tiempo').val(diferenciaTiempo);
                    $('#cantidad_nodos').val(cantidad_nodos_visitados);

                    var maxRating = Math.max.apply(null, ratings);
                    console.log('minimax maxRating: ' + maxRating);
                    console.log('moves: ' + JSON.stringify(gameTree.moves));
                    console.log('move seleccionado: ' + JSON.stringify(gameTree.moves[ratings.indexOf(maxRating)]));
                    console.log('mirar' + JSON.stringify(debug));
                    return gameTree.moves[ratings.indexOf(maxRating)];
                }
            }
        }else if( config.algoritmo == 'aleatorio' ){

            var algoritmo = {

                findTheBestMove: function (gameTree) {

                    var diferenciaTiempo;
                    cantidad_nodos_visitados = 0;
                    var tiempoActual1 = new Date();
                    var siguienteJugada = Math.floor(Math.random() * gameTree.moves.length);
                    cantidad_nodos_visitados++;
                    var tiempoActual2 = new Date();
                    diferenciaTiempo = tiempoActual2.getTime() - tiempoActual1.getTime();
                    $('#tiempo').val(diferenciaTiempo);
                    $('#cantidad_nodos').val(cantidad_nodos_visitados);

                    return gameTree.moves[siguienteJugada];
                }
            }
        }

        return algoritmo;
    }

    var aiTable;

    function setearAiTable(){

        aiTable = {

            'MiniMaxPodaAlfaBeta': makeAI({
                level: profundidad,
                scoreBoard: scoreBoardByWeightedCount,
                algoritmo: 'minimax_poda_alfa_beta'
            }),
            'minimax': makeAI({
                level: profundidad,
                scoreBoard: scoreBoardByWeightedCount,
                algoritmo: 'minimax'
            }),
            'aleatorio': makeAI({
                level: '',
                scoreBoard: '',
                algoritmo: 'aleatorio'
            })
        };
    }

    $('#profundidad').change(
        function(){
            profundidad = $('#profundidad').val();
        }
    );

    /*
    * Genera el arbol ya con el limite de profundidad de busqueda
    * */
    function limitGameTreeDepth(gameTree, depth) {
        var variable = 0;
        console.log('jugador: ' + gameTree.player + ' movimientos: ' + JSON.stringify(gameTree.moves));
        if ( depth == 0 ){

            console.log('nivel 0');
            console.log(gameTree.board);
        }

        return {
          board: gameTree.board,
          player: gameTree.player,
          moves:
            depth == 0
            ? []
            : gameTree.moves.map(function (m) {
                variable++;
                console.log('profundidad: ' + depth + ' nodo: (' + m.x + ',' + m.y + ')');
                debug[depth]++;
                return {
                  isPassingMove: m.isPassingMove,
                  x: m.x,
                  y: m.y,
                  gameTreePromise: delay(function () {
                    return limitGameTreeDepth(force(m.gameTreePromise), depth - 1);
                  })
                };
              })
        };
    }

    function ratePosition(gameTree, player, scoreBoard) {

        if (1 <= gameTree.moves.length) {

            var choose = gameTree.player == player ? Math.max : Math.min;
            return choose.apply(null, calculateRatings(gameTree, player, scoreBoard));

        } else {

            return scoreBoard(gameTree.board, player);
        }
    }

    function calculateRatings(gameTree, player, scoreBoard) {

        return gameTree.moves.map(function (m) {

            return ratePosition(force(m.gameTreePromise), player, scoreBoard);
        });
    }

    function ratePositionWithAlphaBetaPruning(gameTree, player, alfa, beta, scoreBoard) {

        if (1 <= gameTree.moves.length) {

            var judge =
            gameTree.player == player
            ? Math.max
            : Math.min;

            var rate =
            gameTree.player == player
            ? calculateMaxRatings
            : calculateMinRatings;

            return judge.apply(null, rate(gameTree, player, alfa, beta, scoreBoard));
        } else {

            return scoreBoard(gameTree.board, player);
        }
    }

    function calculateMaxRatings(gameTree, player, alfa, beta, scoreBoard) {

        var ratings = [];

        for (var i = 0; i < gameTree.moves.length; i++) {

            var alfa = ratePositionWithAlphaBetaPruning(
                force(gameTree.moves[i].gameTreePromise),
                player,
                alfa,
                beta,
                scoreBoard
            );

            cantidad_nodos_visitados++;
            console.log('alfa');
            console.log('lowerLimit :' + alfa);
            console.log('upperLimit :' + beta);
            ratings.push(alfa);

            if (beta <= alfa){
                console.log('break');
                break;
            }
        }
        return ratings;
    }

    function calculateMinRatings(gameTree, player, alfa, beta, scoreBoard) {

        var ratings = [];

        for (var i = 0; i < gameTree.moves.length; i++) {

            var beta = ratePositionWithAlphaBetaPruning(
                force(gameTree.moves[i].gameTreePromise),
                player,
                alfa,
                beta,
                scoreBoard
            );

            console.log('beta');
            console.log('lowerLimit :' + alfa);
            console.log('upperLimit :' + beta);

            cantidad_nodos_visitados++;
            ratings.push(beta);

            if (beta <= alfa){

                console.log('break');
                break;
            }
        }

        return ratings;
    }

    function miniMax(gameTree, player, lowerLimit, upperLimit, scoreBoard) {

        if (1 <= gameTree.moves.length) {

            var judge = gameTree.player == player ? Math.max : Math.min;
            var rate = gameTree.player == player ? calculateMaxRatings2 : calculateMinRatings2;

            var valor = judge.apply(null, rate(gameTree, player, lowerLimit, upperLimit, scoreBoard));

            return valor;

        } else {

            return scoreBoard(gameTree.board, player);

        }
    }

    function calculateMaxRatings2(gameTree, player, lowerLimit, upperLimit, scoreBoard) {
        //mirar
        var ratings = [];
        var newLowerLimit = lowerLimit;

        for (var i = 0; i < gameTree.moves.length; i++) {

            var r = miniMax(
                force(gameTree.moves[i].gameTreePromise),
                player,
                newLowerLimit,
                upperLimit,
                scoreBoard
            );

            console.log('alfa :' + r);

            ratings.push(r);

            cantidad_nodos_visitados++;
            /*if (upperLimit <= r)
             break;*/

            newLowerLimit = Math.max(r, newLowerLimit);
        }

        return ratings;
    }

    function calculateMinRatings2(gameTree, player, lowerLimit, upperLimit, scoreBoard) {

        var ratings = [];
        var newUpperLimit = upperLimit;
        for (var i = 0; i < gameTree.moves.length; i++) {

            var r = miniMax(
                force(gameTree.moves[i].gameTreePromise),
                player,
                upperLimit,
                newUpperLimit,
                scoreBoard
            );

            cantidad_nodos_visitados++;
            ratings.push(r);
            /*if (r <= lowerLimit)
                break;*/

            newUpperLimit = Math.min(r, newUpperLimit);
        }

        return ratings;
    }

    // API {{{1

    var lastAIType;

    othello.registerAI = function (ai) {

        aiTable[lastAIType] = ai;
    };

    othello.force = force;
    othello.delay = delay;
    othello.EMPTY = EMPTY;
    othello.WHITE = WHITE;
    othello.BLACK = BLACK;
    othello.nextPlayer = nextPlayer;

    function addNewAI() {
        var aiUrl = $('#new-ai-url').val();
        var originalLabel = $('#add-new-ai-button').text();
        if (aiTable[aiUrl] == null) {
          lastAIType = aiUrl;
          $('#add-new-ai-button').text('Loading...').prop('disabled', true);
          $.getScript(aiUrl, function () {
            $('#black-player-type, #white-player-type').append(
              '<option value="' + aiUrl + '">' + aiUrl + '</option>'
            );
            $('#white-player-type').val(aiUrl);
            $('#add-new-ai-button').text(originalLabel).removeProp('disabled');
          });
        } else {
          $('#add-new-ai-button').text('Already loaded').prop('disabled', true);
          setTimeout(
            function () {
              $('#add-new-ai-button').text(originalLabel).removeProp('disabled');
            },
            1000
          );
        }
    }

    // UI {{{1

    function drawGameBoard(board, player, moves) {

        var ss = [];
        var attackable = {};
        //guardo las jugadas para poder marcarlas como elegibles en el tablero
        moves.forEach(function (m) {
          if (!m.isPassingMove)
            attackable[[m.x, m.y]] = true;
        });

        ss.push('<table>');
        for (var y = -1; y < N; y++) {
          ss.push('<tr>');
          for (var x = -1; x < N; x++) {
            if (0 <= y && 0 <= x) {
              ss.push('<td class="');
              ss.push('cell');
              ss.push(' ');
              ss.push(attackable[[x, y]] ? player : board[[x, y]]);
              ss.push(' ');
              ss.push(attackable[[x, y]] ? 'attackable' : '');
              ss.push('" id="');
              ss.push('cell' + x + y);
              ss.push('">');
              ss.push('<span class="disc"></span>');
              ss.push('</td>');
            } else if (0 <= x && y == -1) {
              ss.push('<th>' + 'abcdefgh'[x] + '</th>');
            } else if (x == -1 && 0 <= y) {
              ss.push('<th>' + '12345678'[y] + '</th>');
            } else /* if (x == -1 && y == -1) */ {
              ss.push('<th></th>');
            }
          }
          ss.push('</tr>');
        }
        ss.push('</table>');

        $('#game-board').html(ss.join(''));
        $('#current-player-name').text(player);
    }

    function resetUI() {
        $('#console').empty();
        $('#message').empty();
    }

    /*
    * @gameTree es el arbol de jugadas posibles para desplegar
    * */
    function setUpUIToChooseMove(gameTree) {
        $('#message').text('Elegir jugada.');
        gameTree.moves.forEach(function (m, i) {
          if (m.isPassingMove) {
            $('#console').append(
              $('<input type="button" class="btn">')
              .val(makeLabelForMove(m))
              .click(function () {
                shiftToNewGameTree(force(m.gameTreePromise));
              })
            );
          } else {
            $('#cell' + m.x + m.y)
            .click(function () {
              shiftToNewGameTree(force(m.gameTreePromise));
            })
          }
        });
    }

    function actualizarScore(values, search) {

        var total = 0;
        $.each(values, function(i, objeto){
            if(objeto == search)
                total++;
        });

        return total;
    }

    function makeLabelForMove(move) {
    if (move.isPassingMove)
      return 'Pass';
    else
      return 'abcdefgh'[move.x] + '12345678'[move.y];
    }

    function setUpUIToReset() {
        resetGame();
    }

    function chooseMoveByAI(gameTree, ai) {
        $('#message').text('Pensando...');
        setTimeout( function(){

            shiftToNewGameTree(
                force(ai.findTheBestMove(gameTree).gameTreePromise)
            );
        }, 2000);
    }

    function showWinner(board) {
    var nt = {};
    nt[BLACK] = 0;
    nt[WHITE] = 0;

    for (var x = 0; x < N; x++)
      for (var y = 0; y < N; y++)
        nt[board[[x, y]]]++;

    $('#message').text(
        nt[BLACK] == nt[WHITE]? 'El juego ha terminado en tablas.' : 'El ganador es ' + (nt[WHITE] < nt[BLACK] ? BLACK : WHITE) + '.'
    );
    }

    //objeto jugador
    var playerTypeTable = {};

    function swapPlayerTypes() {
        var t = $('#black-player-type').val();
        $('#black-player-type').val($('#white-player-type').val());
        $('#white-player-type').val(t);
    }

    /*
    * @gameTree objeto con el dibujo del tablero, el jugador actual y las jugadas posibles y gameTreePromise
    * */
    function shiftToNewGameTree(gameTree) {
        //console.log('gameTree' + JSON.stringify(gameTree));
        drawGameBoard(gameTree.board, gameTree.player, gameTree.moves);
        $('#blancas-score').val(actualizarScore(gameTree.board, 'white'));
        $('#negras-score').val(actualizarScore(gameTree.board, 'black'));
        resetUI();
        if (gameTree.moves.length == 0) {
          showWinner(gameTree.board);
          setUpUIToReset();
        } else {
          var playerType = playerTypeTable[gameTree.player];
          if (playerType == 'human') {
            setUpUIToChooseMove(gameTree);
          } else {
            var ai = aiTable[playerType];
            chooseMoveByAI(gameTree, ai);
          }
        }
    }

    function resetGame() {
    $('#preference-pane').removeClass('disabled');
    $('#preference-pane :input').removeAttr('disabled');
    }

    function startNewGame() {

        setearAiTable();
        $('#preference-pane').addClass('disabled');
        $('#preference-pane :input').attr('disabled', 'disabled');
        playerTypeTable[BLACK] = $('#black-player-type').val();
        playerTypeTable[WHITE] = $('#white-player-type').val();
        shiftToNewGameTree(makeGameTree(makeInitialGameBoard(), BLACK, false, 1));
    }

    // Startup {{{1

    $('#start-button').click(function () {startNewGame();});
    $('#add-new-ai-button').click(function () {addNewAI();});
    $('#swap-player-types-button').click(function () {swapPlayerTypes();});
    resetGame();
    drawGameBoard(makeInitialGameBoard(), '-', []);



 })();

// vim: expandtab softtabstop=2 shiftwidth=2 foldmethod=marker
