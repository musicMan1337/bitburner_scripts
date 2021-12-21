/** @param {import(".").NS} ns */
export async function main(ns) {
    ns.disableLog('sleep');
    ns.disableLog('getScriptRam');

    let [target, host, daemonRam] = ns.args;

    let maxRam = ns.getServerMaxRam(host);
    let maxMoney = ns.getServerMaxMoney(target);
    let minSecurity = ns.getServerMinSecurityLevel(target);

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

    function __optimalSecurityThreads__(weakenT) {
        let securityTillMin = ns.getServerSecurityLevel(target) - minSecurity;
        let weakenAmt = weakenT * 0.05;

        if (host.split('-')[0] === 'pserv') {
            securityTillMin = securityTillMin / 25;
        }

        return securityTillMin - 0.05 >= weakenAmt;
    }

    function __calcWeakenThreads__() {
        let weakenT = Math.floor(daemonRam / weakenRam);
        while ((!__ramCheck__(host, weakenT * weakenRam) || !__optimalSecurityThreads__(weakenT)) && weakenT > 1) {
            weakenT--;
        }

        return weakenT;
    }

    function __calcWeakenGrowThreads__() {
        let weakened = 0;
        let weakenT = 1;
        let growT = 0;

        let weakenTR = weakenT * weakenRam;
        let growTR = growT * growRam;
        while (weakenTR + growTR < daemonRam) {
            growT++;
            weakened += 0.004;
            weakenT = Math.floor(weakened / 0.05);

            weakenTR = weakenT * weakenRam;
            growTR = growT * growRam;
        }

        while (!__ramCheck__(host, weakenTR + growTR) && growT > 1) {
            growT--;
            growTR = growT * growRam;
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

        while (weakenTR + growTR + hackTR < daemonRam) {
            hackT++;

            hackMoneyPct = ns.hackAnalyze(target) * hackT;
            growT = Math.ceil(ns.growthAnalyze(target, 1) * hackMoneyPct);

            weakened = hackT * 0.002 + growT * 0.004;
            weakenT = Math.ceil(weakened / 0.05);

            weakenTR = weakenT * weakenRam;
            growTR = growT * growRam;
            hackTR = hackT * hackRam;
        }

        while (!__ramCheck__(host, weakenTR + growTR + hackTR) && hackT > 1) {
            hackT--;
            hackTR = hackT * hackRam;
        }

        return [weakenT, growT, hackT];
    }

    while (true) {
        while (ns.isRunning('weaken.script', host, target)) {
            await ns.sleep(1000);
        }

        let weakenT, growT, hackT;
        let status = __nodeStatus__(target);
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

        // ns.print("hackT: " + hackT)
        // ns.print("growT: " + growT)
        // ns.print("weakenT: " + weakenT)

        if (weakenT >= 1) {
            ns.exec('weaken.script', host, weakenT, target);
        }

        if (growT >= 1) {
            ns.exec('grow.script', host, growT, target);
        }

        if (hackT >= 1) {
            ns.exec('hack.script', host, hackT, target);
        }

        await ns.sleep(1000);
    }
}
