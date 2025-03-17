const crypto = require('crypto');
const readline = require('readline');

class Dice {
    constructor(values) {
        if (!Array.isArray(values) || values.length < 1 || values.some(val => !Number.isInteger(val))) {
            throw new Error("Invalid dice configuration. Must be an array of integers.");
        }
        this.values = values;
    }

    roll() {
        return this.values[Math.floor(Math.random() * this.values.length)];
    }
}

class FairRandom {
    static generateRandomKey() {
        return crypto.randomBytes(32).toString('hex');
    }

    static generateRandomNumber(range) {
        return crypto.randomBytes(4).readUInt32BE() % range;
    }

    static generateHMAC(key, message) {
        return crypto.createHmac('sha3-256', key).update(message).digest('hex');
    }
}

class DiceGame {
    constructor() {
        this.rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    }

    startGame(diceInput) {
       
        const validDiceInput = this.validateDiceInput(diceInput);

        if (!validDiceInput) {
            console.log("Invalid input. Please provide at least 3 valid dice values.");
            this.rl.close();
            return; 
        }

        try {
            this.diceSet = [
                new Dice([2, 2, 4, 4, 9, 9]), 
                new Dice([1, 1, 6, 6, 8, 8]), 
                new Dice([3, 3, 5, 5, 7, 7])  
            ];
        } catch (error) {
            console.log("Error in dice configuration:", error.message);
            return; 
        }

        console.log("Let's determine who makes the first move.");
        this.key = FairRandom.generateRandomKey();
        this.compChoice = FairRandom.generateRandomNumber(2);
        this.hmac = FairRandom.generateHMAC(this.key, this.compChoice.toString());
        console.log(`I selected a random value in the range 0..1 (HMAC=${this.hmac}).`);
        this.promptUser();
    }

    validateDiceInput(input) {
        const diceValues = input.split(',').map(val => parseInt(val.trim()));
        return diceValues.length >= 3 && diceValues.every(val => !isNaN(val) && Number.isInteger(val));
    }

    promptUser() {
        console.log("Try to guess my selection.");
        console.log("0 - 0\n1 - 1\nX - exit\n? - help");
        this.rl.question("Your selection: ", (answer) => {
            if (answer === 'X' || answer === 'x') {
                console.log("Exiting game.");
                this.rl.close();
                return;
            } else if (answer === '?') {
                this.displayHelp();
            } else if (answer === '0' || answer === '1') {
                this.resolveFirstMove(parseInt(answer));
            } else {
                console.log("Invalid input. Please enter 0, 1, X, or ?.");
                this.promptUser();
            }
        });
    }

    resolveFirstMove(userGuess) {
        console.log(`My selection: ${this.compChoice} (KEY=${this.key}).`);
        if (userGuess !== this.compChoice) {
            console.log("I make the first move and choose the [1,1,6,6,8,8] dice.");
        }
        this.chooseDice();
    }

    chooseDice() {
        console.log("Choose your dice:");
        this.diceSet.forEach((dice, index) => console.log(`${index} - [${dice.values.join(',')}]`));
        console.log("X - exit\n? - help");
        this.rl.question("Your selection: ", (answer) => {
            if (answer === 'X' || answer === 'x') {
                console.log("Exiting game.");
                this.rl.close();
                return;
            } else if (this.isValidDiceChoice(answer)) {
                this.userDice = this.diceSet.splice(parseInt(answer), 1)[0];
                console.log(`You choose the [${this.userDice.values.join(',')}] dice.`);
                this.compDice = this.diceSet[0];
                this.playRound();
            } else {
                console.log("Invalid input. Please enter a valid dice index, X, or ?.");
                this.chooseDice();
            }
        });
    }

    isValidDiceChoice(answer) {
        const diceIndex = parseInt(answer);
        return !isNaN(diceIndex) && this.diceSet[diceIndex];
    }

    playRound() {
        console.log("It's time for my roll.");
        this.key = FairRandom.generateRandomKey();
        const compRandom = FairRandom.generateRandomNumber(6);
        this.hmac = FairRandom.generateHMAC(this.key, compRandom.toString());
        console.log(`I selected a random value in the range 0..5 (HMAC=${this.hmac}).`);
        
        this.rl.question("Add your number modulo 6.\n0 - 0\n1 - 1\n2 - 2\n3 - 3\n4 - 4\n5 - 5\nX - exit\n? - help\nYour selection: ", (answer) => {
            if (answer === 'X' || answer === 'x') {
                console.log("Exiting game.");
                this.rl.close();
                return;
            }
            const userRandom = this.parseIntegerInput(answer);
            if (userRandom === null) {
                this.playRound();
                return;
            }

            console.log(`My number is ${compRandom} (KEY=${this.key}).`);
            const fairResult = (compRandom + userRandom) % 6;
            console.log(`The fair number generation result is ${compRandom} + ${userRandom} = ${fairResult} (mod 6).`);
            
            const compRoll = this.compDice.roll();
            console.log(`My roll result is ${compRoll}.`);
            
            console.log("Now it your turn.");
            this.key = FairRandom.generateRandomKey();
            const userCompRandom = FairRandom.generateRandomNumber(6);
            this.hmac = FairRandom.generateHMAC(this.key, userCompRandom.toString());
            console.log(`I selected a random value in the range 0..5 (HMAC=${this.hmac}).`);
            
            this.rl.question("Your selection: ", (userAnswer) => {
                if (userAnswer === 'X' || userAnswer === 'x') {
                    console.log("Exiting game.");
                    this.rl.close();
                    return;
                }
                const userCompMod = this.parseIntegerInput(userAnswer);
                if (userCompMod === null) {
                    this.playRound();
                    return;
                }

                console.log(`My number is ${userCompRandom} (KEY=${this.key}).`);
                const userFairResult = (userCompRandom + userCompMod) % 6;
                console.log(`The fair number generation result is ${userCompRandom} + ${userCompMod} = ${userFairResult} (mod 6).`);
                
                const userRoll = this.userDice.roll();
                console.log(`Your roll result is ${userRoll}.`);
                
                if (userRoll > compRoll) {
                    console.log(`You win (${userRoll} > ${compRoll})!`);
                } else {
                    console.log("I win!");
                }
                this.rl.close();
            });
        });
    }

    parseIntegerInput(input) {
        if (!input || input.includes(',') || isNaN(input) || !Number.isInteger(parseFloat(input))) {
            console.log("Invalid input. Please enter a valid number (no commas) between 0 and 5.");
            return null;
        }
        const parsedValue = parseInt(input);
        if (parsedValue < 0 || parsedValue > 5) {
            console.log("Invalid input. Please enter a number between 0 and 5.");
            return null;
        }
        return parsedValue;
    }

    displayHelp() {
        console.log("\nHelp: Here is the probability of winning for each dice pair (custom dice and your dice):");
        
        const table = this.generateProbabilityTable();
        console.log(table);
        this.promptUser();
    }

    generateProbabilityTable() {
        const dicePairs = [
            { userDice: [2, 2, 4, 4, 9, 9], compDice: [1, 1, 6, 6, 8, 8] },
            { userDice: [2, 2, 4, 4, 9, 9], compDice: [3, 3, 5, 5, 7, 7] },
            { userDice: [1, 1, 6, 6, 8, 8], compDice: [3, 3, 5, 5, 7, 7] }
        ];

        let table = '-----------------------------------------\n';
        table += '| User Dice        | Computer Dice   | Win Probability (%) |\n';
        table += '-----------------------------------------\n';

        dicePairs.forEach(pair => {
            const userDice = new Dice(pair.userDice);
            const compDice = new Dice(pair.compDice);
            const winProb = this.calculateWinProbability(userDice, compDice);
            table += `| [${userDice.values.join(', ')}]  | [${compDice.values.join(', ')}] | ${winProb.toFixed(2)} %          |\n`;
        });

        table += '-----------------------------------------\n';
        return table;
    }

    calculateWinProbability(userDice, compDice) {
        const trials = 10000;
        let wins = 0;

        for (let i = 0; i < trials; i++) {
            const userRoll = userDice.roll();
            const compRoll = compDice.roll();
            if (userRoll > compRoll) {
                wins++;
            }
        }

        return (wins / trials) * 100;
    }
}

// Accept dice input as command line argument (e.g., "1,2,3,4,5")
const diceInput = process.argv[2];

const game = new DiceGame();
game.startGame(diceInput);  // Pass the dice input

