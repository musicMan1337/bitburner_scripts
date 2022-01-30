/** @param {import(".").NS} ns */
export async function main(ns) {
    ns.disableLog('ALL');
    // ns.tail();

    const HOST = ns.args[0] || 'home';

    ns.scriptKill('daemon.js', HOST);
    ns.scriptKill('daemon_fml.js', HOST);
    ns.scriptKill('hack.script', HOST);
    ns.scriptKill('weaken.script', HOST);
    ns.scriptKill('grow.script', HOST);

    if (HOST === 'home') {
        ns.scriptKill('stocks_V2.js', HOST);
        ns.exec('stocks_V2.js', HOST);
    } else {
        let files = ['weaken.script', 'grow.script', 'hack.script', 'skill_up.js'];
        await ns.scp(files, 'home', HOST);
    }

    const RAM =
        ns.getServerMaxRam(HOST) -
        ns.getServerUsedRam(HOST) -
        (HOST === 'home' ? ns.getScriptRam('stocks_V2.js') + ns.getScriptRam('refresh_servers.js') : 1);

    let roots = [];
    let nodes = {};
    let currTarget = '';
    let numThreads = 0;

    function traverseNodes(nodeObj, rootNode) {
        if (!nodeObj || !rootNode) {
            return nodeObj;
        }

        let connectedNodes = ns.scan(rootNode).filter((node) => node.split('-')[0] !== 'pserv');

        connectedNodes.forEach((childNode) => {
            if (!roots.includes(childNode)) {
                let money = ns.getServerMoneyAvailable(childNode);
                let rooted = ns.hasRootAccess(childNode);
                let childName = `${childNode}|${money}`;

                roots.push(childNode);
                nodeObj[childName] = {};

                if (rooted && +currTarget.split('|')[1] < +money) {
                    currTarget = childName;
                }

                traverseNodes(nodeObj[childName], childNode);
            }
        });

        return currTarget.split('|')[0];
    }

    function buildNodes() {
        currTarget = '0|0';
        roots = ns.scan('home').filter((node) => node.split('-')[0] !== 'pserv');
        nodes = {
            home: roots.reduce((obj, node) => {
                let money = ns.getServerMaxMoney(node);
                let rooted = ns.hasRootAccess(node);
                let childName = `${node}|${money}`;

                if (rooted && +currTarget.split('|')[1] < +money) {
                    currTarget = childName;
                }

                obj[childName] = {};
                return obj;
            }, {})
        };

        roots.unshift('home');

        Object.keys(nodes.home).forEach((node) => {
            traverseNodes(nodes.home[node], node.split('|')[0]);
        });
    }

    let target, amount;
    while (true) {
        ns.exec('nuke_servers.js', HOST);

        buildNodes();
        [target, amount] = currTarget.split('|');

        if (HOST === 'home') {
            ns.exec('hack.script', HOST, Math.floor(RAM / ns.getScriptRam('hack.script')), target);

            while (ns.isRunning('hack.script', HOST, target)) {
                await ns.sleep(1000);
            }
        } else {
            const ram3 = Math.floor(RAM / 3);
            ns.exec('weaken.script', HOST, Math.floor(ram3 / ns.getScriptRam('weaken.script')), target);
            ns.exec('grow.script', HOST, Math.floor(ram3 / ns.getScriptRam('grow.script')), target);
            ns.exec('hack.script', HOST, Math.floor(ram3 / ns.getScriptRam('hack.script')), target);

            while (ns.isRunning('weaken.script', HOST, target)) {
                await ns.sleep(1000);
            }
        }

        await ns.sleep(1000);
    }
}
