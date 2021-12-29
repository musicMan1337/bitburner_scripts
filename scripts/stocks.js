/**
 * @typedef {{
 *  sym: string;
 *  shares: number;
 *  price: number;
 *  forecast: number;
 * }[]} Stocks
 *
 * @typedef {{
 *  [sym: string]: {
 *      profit: string;
 *      raw: number;
 *  }
 * }} Tracker
 */

/** @type {Stocks} */
let stocks = [];
/** @type {Stocks} */
let myStocks = [];
let corpus = 0;

/** @type {Tracker} */
let profitTracker = {};

let COMMISSION = 100000; //Buy or sell commission
let numCycles = 2; //Each cycle is ~ 5 seconds
let fracL = 0.2; //Fraction of assets to keep as cash in hand
let fracH = 0.2;

/** @param {import(".").NS} ns */
export async function main(ns) {
    ns.disableLog('ALL');
    ns.tail();

    let TIX = ns.stock;
    let syms = TIX.getSymbols();
    syms.forEach((sym) => (profitTracker[sym] = { profit: '$0.00', raw: 0 }));

    function __refresh__() {
        let newCorpus = ns.getServerMoneyAvailable('home');

        stocks = [];
        myStocks = [];
        syms.forEach((sym) => {
            let [shares] = TIX.getPosition(sym);
            let price = TIX.getPrice(sym);
            let forecast = TIX.getForecast(sym);
            newCorpus += price * shares;

            if (shares) {
                myStocks.push({ sym, shares, price, forecast });
            } else {
                stocks.push({ sym, shares, price, forecast });
            }
        });

        stocks.sort((a, b) => b.forecast - a.forecast);
        corpus = newCorpus;
    }

    function __format__(profit) {
        return ns.nFormat(profit, '($0.00a)');
    }

    function __buy__(stock, numShares) {
        //buy
        let pricePer = TIX.buy(stock.sym, numShares);
        let price = __format__(pricePer * numShares + COMMISSION);

        //track
        profitTracker[stock.sym].raw = profitTracker[stock.sym].raw - pricePer * numShares;
        profitTracker[stock.sym].profit = __format__(profitTracker[stock.sym].raw);

        //log
        ns.print(`Bought ${pricePer ? numShares : 0} shares of ${stock.sym} for ${price}`);
        ns.print(`Current profit for ${stock.sym}: ${profitTracker[stock.sym].profit}`);
    }

    function __sell__(stock, numShares) {
        //buy
        let profitPer = TIX.sell(stock.sym, numShares);
        let profit = __format__(profitPer * numShares + COMMISSION);

        //track
        profitTracker[stock.sym].raw = profitTracker[stock.sym].raw + profitPer * numShares;
        profitTracker[stock.sym].profit = __format__(profitTracker[stock.sym].raw);

        //log
        ns.print(`Sold ${profitPer ? numShares : 0} shares of ${stock.sym} for ${profit}`);
        ns.print(`Current profit for ${stock.sym}: ${profitTracker[stock.sym].profit}`);
    }

    while (true) {
        __refresh__();

        //Sell underperforming shares
        myStocks.forEach((stock) => {
            if (stock.forecast < stocks[0].forecast) {
                __sell__(stock, stock.shares);
                corpus -= COMMISSION;
            }
        });

        //Sell shares if not enough cash in hand
        myStocks.forEach((stock) => {
            if (ns.getServerMoneyAvailable('home') < fracL * corpus) {
                let cashNeeded = corpus * fracH - ns.getServerMoneyAvailable('home') + COMMISSION;
                let numShares = Math.floor(cashNeeded / stock.price);

                __sell__(stock, numShares);
                corpus -= COMMISSION;
            }
        });

        // Buy shares with cash remaining in hand
        let cashToSpend = ns.getServerMoneyAvailable('home') - fracH * corpus;
        let numShares = Math.floor((cashToSpend - COMMISSION) / stocks[0].price);
        let maxShares = TIX.getMaxShares(stocks[0].sym) - stocks[0].shares;

        numShares = Math.min(numShares, maxShares);

        ns.print('stocks[0].price: ' + stocks[0].price);
        ns.print('corpus: ' + corpus);
        ns.print('cashToSpend: ' + cashToSpend);

        if (numShares * stocks[0].forecast * stocks[0].price * numCycles > COMMISSION) {
            __buy__(stocks[0], numShares);
        }

        await ns.sleep(5 * 1000 * numCycles + 200);
    }
}
