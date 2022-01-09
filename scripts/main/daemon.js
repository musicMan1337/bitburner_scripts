/** @param {import(".").NS} ns */
export async function main(ns) {
    ns.disableLog('ALL');

    let [TARGET, HOST, DAEMON_RAM, limit] = ns.args;
    let IS_PSERV = HOST.split('-')[0] === 'pserv';

    let maxMoney = ns.getServerMaxMoney(TARGET);
    let minSecurity = ns.getServerMinSecurityLevel(TARGET);

    let weakenRam = ns.getScriptRam('weaken.script');
    let growRam = ns.getScriptRam('grow.script');
    let hackRam = ns.getScriptRam('hack.script');

    function __ramCheck__(amt) {
        ns.print(`Free RAM: ${DAEMON_RAM} - Amt: ${amt}`);
        return DAEMON_RAM > amt;
    }

    function __nodeStatus__(target) {
        //invalid target
        if (maxMoney === 0) {
            return -1;
        }
        //needs weakening
        if (minSecurity !== ns.getServerSecurityLevel(target)) {
            return 0;
        }
        //needs growth
        if (maxMoney !== ns.getServerMoneyAvailable(target)) {
            return 1;
        }
        //ready to hack
        return 2;
    }

    function __getOptimalWeakenThreads__() {
        let securityTillMin = ns.getServerSecurityLevel(TARGET) - minSecurity;
        let weakenT = Math.ceil(securityTillMin / 0.05);
        let maxT = Math.floor(DAEMON_RAM / weakenRam);

        if (IS_PSERV) {
            weakenT = Math.ceil(weakenT / (limit ? 5 : 25));
        }

        return Math.min(weakenT, maxT);
    }

    function __calcWeakenThreads__() {
        let weakenT = __getOptimalWeakenThreads__();
        while (!__ramCheck__(weakenT * weakenRam) && weakenT > 1) {
            weakenT -= IS_PSERV ? 10 : 1;
        }

        if (weakenT < 1) {
            weakenT = 1;
        }

        return weakenT;
    }

    function __calcWeakenGrowThreads__() {
        let weakened = 0;
        let weakenT = 1;
        let growT = 0;

        let weakenTR = weakenT * weakenRam;
        let growTR = growT * growRam;

        while (weakenTR + growTR < DAEMON_RAM) {
            growT++;
            weakened = growT * 0.004;
            weakenT = Math.ceil(weakened / 0.05);

            weakenTR = weakenT * weakenRam;
            growTR = growT * growRam;
        }

        while (!__ramCheck__(weakenTR + growTR) && growT > 1) {
            growT -= IS_PSERV ? 10 : 1;
            weakened = growT * 0.004;
            weakenT = Math.ceil(weakened / 0.05);

            weakenTR = weakenT * weakenRam;
            growTR = growT * growRam;
        }

        if (weakenT < 1) {
            weakenT = 1;
        }

        if (growT < 1) {
            growT = 1;
        }

        return [weakenT, growT];
    }

    function __calcWeakenGrowHackThreads__() {
        let weakenT = 1;
        let growT = 0;
        let hackT = 0;

        let weakenTR = weakenT * weakenRam;
        let growTR = growT * growRam;
        let hackTR = hackT * hackRam;
        let hackMoneyPct = 0;
        let weakened = 0;

        while (weakenTR + growTR + hackTR < DAEMON_RAM) {
            hackT++;

            hackMoneyPct = ns.hackAnalyze(TARGET) * hackT;
            growT = Math.ceil(ns.growthAnalyze(TARGET, 1) * hackMoneyPct);

            weakened = hackT * 0.002 + growT * 0.004;
            weakenT = Math.ceil(weakened / 0.05);

            weakenTR = weakenT * weakenRam;
            growTR = growT * growRam;
            hackTR = hackT * hackRam;
        }

        while (!__ramCheck__(weakenTR + growTR + hackTR) && hackT > 1) {
            hackT -= IS_PSERV ? 10 : 1;
            hackTR = hackT * hackRam;
        }

        if (weakenT < 1) {
            weakenT = 1;
        }

        if (growT < 1) {
            growT = 1;
        }

        if (hackT < 1) {
            hackT = 1;
        }

        return [weakenT, growT, hackT];
    }

    while (true) {
        ns.print('');
        ns.print('---');
        ns.print('');

        let preSec = ns.nFormat(ns.getServerSecurityLevel(TARGET), '0.000');
        let preMoney = ns.getServerMoneyAvailable(TARGET);

        while (ns.isRunning('weaken.script', HOST, TARGET)) {
            await ns.sleep(10000);
        }

        let postSec = ns.getServerSecurityLevel(TARGET);
        let postMoney = ns.getServerMoneyAvailable(TARGET);

        if (preSec < postSec) {
            ns.print(`Security increased by ${ns.nFormat(postSec - preSec, '0.000')}`);
        }

        if (preSec > postSec) {
            ns.print(`Security decreased by ${ns.nFormat(preSec - postSec, '0.000')}`);
        }

        if (preMoney < postMoney) {
            ns.print(`Money increased by ${ns.nFormat(postMoney - preMoney, '$0.000a')}`);
        }

        if (preMoney > postMoney) {
            ns.print(`Money decreased by ${ns.nFormat(preMoney - postMoney, '$0.000a')}`);
        }

        let weakenT, growT, hackT;
        let status = __nodeStatus__(TARGET);
        ns.print('status - ' + status);
        switch (status) {
            case 0:
                weakenT = __calcWeakenThreads__();
                break;

            case 1:
                [weakenT, growT] = __calcWeakenGrowThreads__();
                break;

            case 2:
                [weakenT, growT, hackT] = __calcWeakenGrowHackThreads__();
                break;

            default:
                //something went wrong
                return;
        }

        if (weakenT >= 1) {
            ns.exec('weaken.script', HOST, weakenT, TARGET);
        }

        if (growT >= 1) {
            ns.exec('grow.script', HOST, growT, TARGET);
        }

        if (hackT >= 1) {
            ns.exec('hack.script', HOST, hackT, TARGET);
        }

        await ns.sleep(10000);
    }
}
