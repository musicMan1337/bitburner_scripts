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

/** @param {import(".").NS} ns */
export async function main(ns) {
    ns.disableLog('ALL');

    const TIX = ns.stock;

    const KEEP = 0.2;
    const BUY_LIMIT = 0.58;
    const SELL_LIMIT = 0.5;
    const COMMISSION = 100000;

    //init stocks
    let syms = TIX.getSymbols();
    syms.forEach((sym) => {
        stocks.push({ sym });
        profitTracker[sym] = { profit: '$0.00', raw: 0 };
    });

    function __updateStockData__() {
        let corpus = ns.getServerMoneyAvailable('home');
        myStocks.length = 0;

        stocks.forEach((stock) => {
            let sym = stock.sym;
            stock.price = TIX.getPrice(sym);
            stock.shares = TIX.getPosition(sym)[0];
            stock.forecast = TIX.getForecast(sym);

            corpus += stock.price * stock.shares;

            if (stock.shares) {
                myStocks.push(stock);
            }
        });

        stocks.sort((a, b) => b.forecast - a.forecast);
        return corpus;
    }

    function __format__(profit) {
        return ns.nFormat(profit, '-$0.00a');
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
        corpus = __updateStockData__();

        // Sell bad shares
        myStocks.forEach((stock) => {
            if (stock.forecast < SELL_LIMIT) {
                ns.print(`${stock.sym} no longer valuable - selling.`);
                __sell__(stock, stock.shares);
            }
        });

        let stockIndex = -1;
        let cashToSpend = ns.getServerMoneyAvailable('home');
        while (cashToSpend > 100 * COMMISSION && cashToSpend > corpus * 0.1) {
            stockIndex++;
            corpus = __updateStockData__();

            let stockToBuy = stocks[stockIndex];
            if (!stockToBuy || stockToBuy.forecast < BUY_LIMIT) {
                // No more (good) stocks left
                break;
            }

            let availableShares = TIX.getMaxShares(stockToBuy.sym) - stockToBuy.shares;
            if (!availableShares) {
                // We bought all shares of this stock
                continue;
            }

            while (availableShares) {
                let purchaseCost = TIX.getPurchaseCost(stockToBuy.sym, availableShares, 'Long');
                if (purchaseCost <= cashToSpend) {
                    __buy__(stockToBuy, availableShares);
                    cashToSpend -= purchaseCost;
                    break;
                }

                availableShares = Math.floor(availableShares * 0.9);
            }
        }

        await ns.sleep(5 * 1000);
    }
}
