/** @param {import(".").NS} ns */
export async function main(ns) {
    ns.disableLog('ALL');

    let purchased = ns.getPurchasedServers();

    function __readNodes__(fPath) {
        let nodes = ns.read(fPath);
        nodes = nodes.split(',');
        return nodes;
    }

    async function __scanAndWriteAllNodes__() {
        let nodes = [];
        let newNodes = ['home'];
        let newNodes2 = [];
        let repeat = true;

        while (repeat) {
            newNodes2 = [];
            repeat = false;

            let i, j;
            for (i = 0; i < newNodes.length; i++) {
                let connected = ns.scan(newNodes[i]);

                for (j = 0; j < connected.length; j++) {
                    let node = connected[j];
                    if (!nodes.includes(node) && !newNodes.includes(node) && !newNodes2.includes(node)) {
                        newNodes2.push(node);
                        repeat = true;
                    }
                }
            }

            nodes = nodes.concat(newNodes);
            newNodes = newNodes2;
        }

        nodes = nodes.concat(purchased);
        await ns.write('nodes.txt', nodes, 'w');
    }

    function __nukeAvailableNodes__() {
        let nodes = __readNodes__('nodes.txt');
        let myHackLevel = ns.getHackingLevel();

        let Programs = [
            ns.fileExists('BruteSSH.exe'),
            ns.fileExists('FTPCrack.exe'),
            ns.fileExists('relaySMTP.exe'),
            ns.fileExists('HTTPWorm.exe'),
            ns.fileExists('SQLInject.exe')
        ];

        let availPrograms = Programs.reduce((num, bool) => num + bool, 0);

        nodes.forEach((node) => {
            if (
                !ns.hasRootAccess(node) &&
                ns.getServerNumPortsRequired(node) <= availPrograms &&
                ns.getServerRequiredHackingLevel(node) <= myHackLevel
            ) {
                Programs.forEach((exists, i) => {
                    if (exists) {
                        switch (i) {
                            case 0:
                                ns.brutessh(node);
                                break;
                            case 1:
                                ns.ftpcrack(node);
                                break;
                            case 2:
                                ns.relaysmtp(node);
                                break;
                            case 3:
                                ns.httpworm(node);
                                break;
                            case 4:
                                ns.sqlinject(node);
                                break;
                        }
                    }
                });
                ns.nuke(node);
            }
        });
    }

    async function __scanAndWriteRootedNodes__() {
        let nodes = __readNodes__('nodes.txt');
        let rooted = nodes.reduce((arr, node) => {
            //don't hack ourselves
            if (ns.hasRootAccess(node) && node !== 'home' && !purchased.includes(node)) {
                let maxMoney = ns.getServerMaxMoney(node);

                arr.push(`${maxMoney} ${node}`);
            }
            return arr;
        }, []);

        //lowest max money at the front, filter invalid servers, remove money from name
        rooted.sort((a, b) => +b.split(' ')[0] - +a.split(' ')[0]);
        rooted = rooted.filter((node) => +node.split(' ')[0] > 0);
        await ns.write('money_rooted.txt', rooted, 'w');

        rooted = rooted.map((node) => node.split(' ')[1]);

        await ns.write('rooted.txt', rooted, 'w');
    }

    //read the nodes
    await __scanAndWriteAllNodes__();
    __nukeAvailableNodes__();
    await __scanAndWriteRootedNodes__();

    //load nodes
    let attackNodes = __readNodes__('rooted.txt');
    if (purchased.length) {
        attackNodes = attackNodes.concat(purchased);
    }

    attackNodes.push('home');
    ns.scriptKill('daemon.js', 'home');
    ns.scriptKill('daemon_fml.js', 'home');

    // spin up attack servers
    attackNodes.forEach(async (attacker) => {
        ns.exec('init_skill_up.js', 'home', 1, attacker);
    });
}
