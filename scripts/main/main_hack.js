/** @param {import(".").NS} ns */
export async function main(ns) {
    ns.disableLog('ALL');

    let [ATTACK_SERVER, pserv, limit] = ns.args;

    function __readNodes__(fPath) {
        let nodes = ns.read(fPath);
        nodes = nodes.split(',');
        return nodes;
    }

    function __findAttackableNodes__() {
        let rooted = __readNodes__('rooted.txt');
        let targetNodes = [];

        //check which are valid for attacking
        for (let i = 0; i < rooted.length; i++) {
            if (ns.getServerMaxMoney(rooted[i])) {
                targetNodes.push(rooted[i]);
            }
        }

        if (pserv && limit && ATTACK_SERVER.split('-')[0] === 'pserv') {
            let pservNum = +ATTACK_SERVER.split('-')[2];
            let multiplier = Math.floor(targetNodes.length / 5);

            if (pservNum < 5) {
                targetNodes = targetNodes.slice(0, multiplier);
            } else if (pservNum < 10) {
                targetNodes = targetNodes.slice(multiplier, multiplier * 2);
            } else if (pservNum < 15) {
                targetNodes = targetNodes.slice(multiplier * 2, multiplier * 3);
            } else if (pservNum < 20) {
                targetNodes = targetNodes.slice(multiplier * 3, multiplier * 4);
            } else {
                targetNodes = targetNodes.slice(multiplier * 4, -1);
            }
        }

        return targetNodes;
    }

    //prep attackServer
    let files = ['weaken.script', 'grow.script', 'hack.script', 'daemon.js', 'daemon_fml.js'];
    await ns.scp(files, 'home', ATTACK_SERVER);
    ns.scriptKill('daemon.js', ATTACK_SERVER);
    ns.scriptKill('daemon_fml.js', ATTACK_SERVER);

    //load nodes
    let targetNodes = __findAttackableNodes__();

    //calc ram and threads per daemon
    let serverRam = ns.getServerMaxRam(ATTACK_SERVER);
    if (ATTACK_SERVER === 'home') {
        serverRam -= ns.getServerUsedRam(ATTACK_SERVER);
        serverRam -= ns.getScriptRam('setup_hacks.js');
    }

    let daemonRam = ns.getScriptRam('daemon.js');
    let minRamPerDaemon =
        ns.getScriptRam('weaken.script') + ns.getScriptRam('grow.script') + ns.getScriptRam('hack.script');

    let leftoverRam = serverRam - daemonRam * targetNodes.length;
    let ramPerDaemon = leftoverRam / targetNodes.length;

    while (ramPerDaemon < minRamPerDaemon) {
        targetNodes.pop();
        if (!targetNodes.length) {
            ns.tprint(`'${ATTACK_SERVER}' - insufficient RAM: exiting`);
            return;
        }

        if (targetNodes.length === 2 && ns.getHackingLevel() >= ns.getServerRequiredHackingLevel('joesguns')) {
            targetNodes = ['joesguns'];
        }

        leftoverRam = serverRam - daemonRam * targetNodes.length;
        ramPerDaemon = leftoverRam / targetNodes.length;
    }

    //start daemons
    let daemonCount = 0;
    let daemonFile = ns.fileExists('Formulas.exe') ? 'daemon_fml.js' : 'daemon.js';
    targetNodes.forEach((target) => {
        let success = ns.exec(
            daemonFile,
            ATTACK_SERVER,
            1,
            target,
            ATTACK_SERVER,
            Math.floor(ramPerDaemon),
            limit || false
        );
        daemonCount += success ? 1 : 0;
    });

    ns.tprint(`attack server: ${ATTACK_SERVER}`);
    ns.tprint(`ram/daemon: ${Math.floor(ramPerDaemon)}`);
    ns.tprint(`daemon count: ${daemonCount}`);
}
