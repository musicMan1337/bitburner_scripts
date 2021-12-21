/** @param {import(".").NS} ns */
export async function main(ns) {
    ns.disableLog('ALL');

    if (ns.isRunning('stocks.js', 'home')) {
        ns.kill('stocks.js', 'home');
    }

    function __printProfits__(sym, shares, profit) {
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

        ns.tprint(`Sold ${shares} shares of ${sym} for ${formatProfit}${symbols[i]}`);
    }

    let TIX = ns.stock;
    let syms = TIX.getSymbols();

    syms.forEach((sym) => {
        let [shares] = TIX.getPosition(sym);
        let profitPer = TIX.sell(sym, shares);
        __printProfits__(sym, shares, profitPer * shares);
    });
}
