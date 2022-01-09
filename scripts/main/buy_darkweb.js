/** @param {import(".").NS} ns */
export async function main(ns) {
    ns.disableLog('sleep');

    //get the TOR router
    while (!ns.purchaseTor()) {
        await ns.sleep(10000);
    }

    //buy programs in this order
    let cheapProgramList = [
        'BruteSSH.exe',
        'FTPCrack.exe',
        'AutoLink.exe',
        'DeepscanV1.exe',
        'ServerProfiler.exe',
        'DeepscanV2.exe'
    ];
    for (let i = 0; i < cheapProgramList.length; i++) {
        let prg = cheapProgramList[i];
        while (!ns.purchaseProgram(prg)) {
            await ns.sleep(10000);
        }
    }

    //buy baseline 64g servers
    while (ns.getServerMoneyAvailable('home') < 88000000) {
        await ns.sleep(10000);
    }
    ns.run('refresh_servers.js', 1, 64);

    //buy programs in this order
    let priceyProgramList = ['DeepscanV2.exe', 'relaySMTP.exe', 'HTTPWorm.exe', 'SQLInject.exe'];
    for (let i = 0; i < priceyProgramList.length; i++) {
        let prg = priceyProgramList[i];
        while (!ns.purchaseProgram(prg)) {
            await ns.sleep(10000);
        }
    }
}
