/** @param {import(".").NS} ns */
export async function main(ns) {
    ns.disableLog('ALL');

    let TIX = ns.stock;

    let fracL = 0.1; //Fraction of assets to keep as cash in hand
    let fracH = 0.2;
    let commission = 100000; //Buy or sell commission
    let numCycles = 2; //Each cycle is 6 seconds

    let stocks = [];
    let myStocks = [];
    let corpus = 0;

    function __refresh__() {
        let newCorpus = ns.getServerMoneyAvailable('home');

        myStocks = [];
        for (let i = 0; i < stocks.length; i++) {
            let sym = stocks[i].sym;
            let [shares, avgPx, _sharesShort, _avgPxShort] = TIX.getPosition(sym);

            stocks[i].price = TIX.getPrice(sym);
            stocks[i].shares = shares;
            stocks[i].buyPrice = avgPx;
            stocks[i].vol = TIX.getVolatility(sym);
            stocks[i].prob = 2 * (TIX.getForecast(sym) - 0.5);
            stocks[i].expRet = (stocks[i].vol * stocks[i].prob) / 2;

            newCorpus += stocks[i].price * stocks[i].shares;

            if (stocks[i].shares > 0) {
                myStocks.push(stocks[i]);
            }
        }

        stocks.sort((a, b) => b.expRet - a.expRet);
        corpus = newCorpus;
    }

    function __format__(profit) {
        let symbols = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc'];
        let formatProfit;

        let i;
        if (profit >= 0) {
            for (i = 0; profit >= 1000 && i < symbols.length; i++) {
                profit /= 1000;
            }
            formatProfit = `$${profit.toFixed(3)}${symbols[i]}`;
        } else {
            for (i = 0; profit <= -1000 && i < symbols.length; i++) {
                profit /= 1000;
            }
            formatProfit = `-$${profit.toFixed(3) * -1}${symbols[i]}`;
        }

        return formatProfit;
    }

    function __buy__(stock, numShares) {
        TIX.buy(stock.sym, numShares);
        ns.print(`Bought ${stock.sym} for ${__format__(numShares * stock.price)}`);
    }

    function __sell__(stock, numShares) {
        let profit = numShares * (stock.price - stock.buyPrice) - 2 * commission;
        ns.print(`Sold ${stock.sym} for profit of ${__format__(profit)}`);
        TIX.sell(stock.sym, numShares);
    }

    let syms = TIX.getSymbols();
    syms.forEach((sym) => {
        stocks.push({ sym });
    });

    while (true) {
        __refresh__();

        //Sell underperforming shares
        myStocks.forEach((stock) => {
            if (stocks[0].expRet > stock.expRet) {
                __sell__(stock, stock.shares);
                corpus -= commission;
            }
        });

        //Sell shares if not enough cash in hand
        myStocks.forEach((stock) => {
            if (ns.getServerMoneyAvailable('home') < fracL * corpus) {
                let cashNeeded = corpus * fracH - ns.getServerMoneyAvailable('home') + commission;
                let numShares = Math.floor(cashNeeded / stock.price);

                __sell__(stock, numShares);
                corpus -= commission;
            }
        });

        //Buy shares with cash remaining in hand
        let cashToSpend = ns.getServerMoneyAvailable('home') - fracH * corpus;
        let numShares = Math.floor((cashToSpend - commission) / stocks[0].price);
        if (numShares * stocks[0].expRet * stocks[0].price * numCycles > commission) {
            __buy__(stocks[0], numShares);
        }

        await ns.sleep(6 * 1000 * numCycles + 200);
    }
}
