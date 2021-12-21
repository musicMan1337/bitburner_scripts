/** @param {import(".").NS} ns */
export async function main(ns) {
    ns.disableLog('ALL');

    let attackServer = ns.args[0];

    ns.tprint(attackServer);

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

        return targetNodes;
    }

    //prep attackServer
    let files = ['weaken.script', 'grow.script', 'hack.script', 'daemon.js'];
    await ns.scp(files, 'home', attackServer);

    //load nodes
    let targetNodes = __findAttackableNodes__();

    //calc ram and threads per daemon
    let serverRam = ns.getServerMaxRam(attackServer);
    let daemonRam = ns.getScriptRam('daemon.js');
    let minRamPerDaemon =
        ns.getScriptRam('weaken.script') + ns.getScriptRam('grow.script') + ns.getScriptRam('hack.script');

    let leftoverRam = serverRam - daemonRam * targetNodes.length;
    let ramPerDaemon = leftoverRam / targetNodes.length;

    ns.tprint(attackServer);
    while (ramPerDaemon < minRamPerDaemon) {
        ns.tprint(`re-calc threads: ${Math.floor(ramPerDaemon)}`);

        targetNodes.pop();
        if (!targetNodes.length) {
            ns.tprint(`'${attackServer}' - insufficient RAM: exiting`);
            return;
        }

        if (targetNodes.length === 2) {
            targetNodes = ['joesguns'];
        }

        leftoverRam = serverRam - daemonRam * targetNodes.length;
        ramPerDaemon = leftoverRam / targetNodes.length;
    }
    ns.tprint(targetNodes);
    ns.tprint(`ram/daemon: ${Math.floor(ramPerDaemon)}`);

    if (attackServer !== ns.getHostname()) {
        ns.killall(attackServer);
    }

    //start daemons
    let daemonCount = 0;
    targetNodes.forEach((target) => {
        let success = ns.exec('daemon.js', attackServer, 1, target, attackServer, Math.floor(ramPerDaemon));
        daemonCount += success ? 1 : 0;
    });

    ns.tprint('daemon count: ' + daemonCount);
}
