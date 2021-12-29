/** @param {import(".").NS} ns */
export async function main(ns) {
    ns.disableLog('ALL');

    let [TARGET, HOST, DAEMON_RAM, limit] = ns.args;
    let IS_PSERV = HOST.split('-')[0] === 'pserv';

    let FML = ns.formulas;

    let maxRam = ns.getServerMaxRam(HOST);
    let maxMoney = ns.getServerMaxMoney(TARGET);
    let minSecurity = ns.getServerMinSecurityLevel(TARGET);

    let weakenRam = ns.getScriptRam('weaken.script');
    let growRam = ns.getScriptRam('grow.script');
    let hackRam = ns.getScriptRam('hack.script');

    function __ramCheck__(host, amt) {
        let used = ns.getServerUsedRam(host);
        let free = maxRam - used;

        ns.print(`'Free RAM: ${free} - Amt: ${amt}`);
        return free > amt;
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
        let maxT = Math.floor((maxRam - ns.getServerUsedRam(HOST)) / weakenRam);

        if (IS_PSERV) {
            weakenT = Math.ceil(weakenT / (limit ? 5 : 25));
        }

        return Math.min(weakenT, maxT);
    }

    function __getOptimalGrowThreads__(hackT) {
        let currMoney, moneyTillMax, hackPct;

        if (hackT) {
            hackPct = FML.hacking.hackPercent(ns.getServer(TARGET), ns.getPlayer()) * 100 * hackT;
            moneyTillMax = hackPct + maxMoney;
        } else {
            currMoney = ns.getServerMoneyAvailable(TARGET);
            moneyTillMax = maxMoney - currMoney;
        }

        let growPct = FML.hacking.growPercent(ns.getServer(TARGET), 1, ns.getPlayer(), ns.getServer(HOST).cpuCores) - 1;
        let pctNeeded = moneyTillMax / maxMoney;

        let growT = Math.ceil(pctNeeded / growPct);
        let maxT = Math.floor((maxRam - ns.getServerUsedRam(HOST)) / growRam);

        ns.print(growT);
        ns.print(maxT);

        if (IS_PSERV) {
            growT = Math.ceil(growT / (limit ? 5 : 25));
        }

        return Math.min(growT, maxT);
    }

    function __getOptimalHackThreads__() {
        let moneyThreshold = maxMoney * 0.6;
        let hackPct = FML.hacking.hackPercent(ns.getServer(TARGET), ns.getPlayer()) * 100;
        let hackMoneyPerT = ns.getServerMoneyAvailable(TARGET) * hackPct;

        let hackT = Math.ceil(moneyThreshold / hackMoneyPerT);
        let maxT = Math.floor((maxRam - ns.getServerUsedRam(HOST)) / hackRam);

        if (IS_PSERV) {
            hackT = Math.ceil(hackT / (limit ? 5 : 25));
        }

        return Math.min(hackT, maxT);
    }

    function __calcWeakenThreads__() {
        let weakenT = __getOptimalWeakenThreads__();
        while (!__ramCheck__(HOST, weakenT * weakenRam) && weakenT > 1) {
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

        growT = __getOptimalGrowThreads__();
        weakened = growT * 0.004;
        weakenT = Math.ceil(weakened / 0.05);

        weakenTR = weakenT * weakenRam;
        growTR = growT * growRam;

        while (!__ramCheck__(HOST, weakenTR + growTR) && growT > 1) {
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
        let weakened = 0;

        hackT = __getOptimalHackThreads__();
        growT = __getOptimalGrowThreads__(hackT);

        weakened = hackT * 0.002 + growT * 0.004;
        weakenT = Math.ceil(weakened / 0.05);

        weakenTR = weakenT * weakenRam;
        growTR = growT * growRam;
        hackTR = hackT * hackRam;

        while (!__ramCheck__(HOST, weakenTR + growTR + hackTR) && hackT > 1) {
            hackT -= IS_PSERV ? 10 : 1;
            growT = __getOptimalGrowThreads__(hackT);

            weakened = hackT * 0.002 + growT * 0.004;
            weakenT = Math.ceil(weakened / 0.05);

            weakenTR = weakenT * weakenRam;
            growTR = growT * growRam;
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

        let preSec = ns.getServerSecurityLevel(TARGET);
        let preMoney = ns.getServerMoneyAvailable(TARGET);

        while (ns.isRunning('weaken.script', HOST, TARGET)) {
            await ns.sleep(10000);
        }

        let postSec = ns.getServerSecurityLevel(TARGET);
        let postMoney = ns.getServerMoneyAvailable(TARGET);

        if (preSec < postSec) {
            ns.print(`Security increased by ${postSec - preSec}`);
        }

        if (preSec > postSec) {
            ns.print(`Security decreased by ${preSec - postSec}`);
        }

        if (preMoney < postMoney) {
            ns.print(`Money increased by ${ns.nFormat(postMoney - preMoney, '$0.00a')}`);
        }

        if (preMoney > postMoney) {
            ns.print(`Money decreased by ${ns.nFormat(preMoney - postMoney, '$0.00a')}`);
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
