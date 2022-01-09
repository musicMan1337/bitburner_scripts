/** @param {import(".").NS} ns */
export async function main(ns) {
    ns.disableLog('ALL');

    let COMMISSION = 100000; //Buy or sell commission

    if (ns.isRunning('stocks.js', 'home')) {
        ns.kill('stocks.js', 'home');
    }

    function __format__(profit) {
        return ns.nFormat(profit, '-$0.00a');
    }

    let TIX = ns.stock;
    let syms = TIX.getSymbols();

    syms.forEach((sym) => {
        let [numShares] = TIX.getPosition(sym);
        if (numShares) {
            let profitPer = TIX.sell(sym, numShares);
            let profit = __format__(profitPer * numShares - COMMISSION);
            ns.tprint(`Sold ${profitPer ? numShares : 0} shares of ${sym} for profit of ${profit}`);
        }
    });
}
